import { NextRequest, NextResponse } from "next/server";
import { executeZomatoTool } from "@/server/tools";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const customerId = body.customer_id;
  const result = executeZomatoTool("cancel_order", { order_id: id.toUpperCase(), customer_id: customerId }, customerId);
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json(result.result);
}
