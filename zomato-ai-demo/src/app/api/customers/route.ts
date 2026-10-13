import { NextResponse } from "next/server";
import { getAllCustomers } from "@/mock/data";

export async function GET() {
  const customers = getAllCustomers();
  return NextResponse.json(customers);
}
