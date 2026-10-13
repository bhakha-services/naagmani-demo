import { NextRequest, NextResponse } from "next/server";
import { ORDERS } from "@/mock/data";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const customerId = searchParams.get("customer_id");
  if (customerId) {
    return NextResponse.json(ORDERS.filter((o) => o.customer_id === customerId));
  }
  return NextResponse.json(ORDERS);
}
