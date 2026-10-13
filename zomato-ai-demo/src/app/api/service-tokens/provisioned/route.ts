import { NextResponse } from "next/server";
import { projectServiceTokenService } from "@/server/service-tokens";

export async function GET() {
  try {
    const tokens = await projectServiceTokenService.listProvisionedCustomerTokens();
    return NextResponse.json({ data: tokens, total: tokens.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
