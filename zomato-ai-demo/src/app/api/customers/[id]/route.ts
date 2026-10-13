import { NextRequest, NextResponse } from "next/server";
import { getCustomer } from "@/mock/data";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const cust = getCustomer(id);
  if (!cust) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }
  return NextResponse.json(cust);
}
