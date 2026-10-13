import { NextRequest, NextResponse } from "next/server";
import { ORDERS } from "@/mock/data";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const order = ORDERS.find((o) => o.id === id.toUpperCase());
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }
  return NextResponse.json(order);
}
