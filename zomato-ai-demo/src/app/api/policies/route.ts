import { NextResponse } from "next/server";
import { SUPPORT_POLICIES } from "@/knowledge/policies";

export async function GET() {
  return NextResponse.json(SUPPORT_POLICIES);
}
