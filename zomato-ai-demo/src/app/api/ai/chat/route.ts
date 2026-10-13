import { NextRequest, NextResponse } from "next/server";
import { naagmaniClient } from "@/server/naagmani-client";
import { executeZomatoTool } from "@/server/tools";
import { retrieveSupportPolicies } from "@/knowledge/policies";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, customer_id, model, stream } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "messages array is required" }, { status: 400 });
    }

    const customerId = customer_id || "cust_1001";
    const lastUserMessage = messages.filter((m: any) => m.role === "user").pop()?.content || "";

    // 1. Tool execution resolution (MCP emulation)
    let mcpToolResult: any = null;
    const orderMatch = lastUserMessage.match(/ORD-\d{4}/i);
    if (orderMatch) {
      const orderId = orderMatch[0].toUpperCase();
      if (lastUserMessage.toLowerCase().includes("cancel")) {
        mcpToolResult = executeZomatoTool("cancel_order", { order_id: orderId, customer_id: customerId }, customerId);
      } else {
        mcpToolResult = executeZomatoTool("get_order_status", { order_id: orderId }, customerId);
      }
    }

    // 2. RAG retrieval resolution
    const ragContext = retrieveSupportPolicies(lastUserMessage);

    // 3. Dispatch to Naagmani OS AI Gateway
    const aiResponse = await naagmaniClient.executeChat({
      customerId,
      messages,
      model,
      stream,
      mcpToolResult,
      ragContext,
    });

    return NextResponse.json(aiResponse);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
