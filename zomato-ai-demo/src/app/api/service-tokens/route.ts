import { NextRequest, NextResponse } from "next/server";
import { projectServiceTokenService } from "@/server/service-tokens";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const envId = searchParams.get("environment_id") || undefined;
    const tokens = await projectServiceTokenService.listTokens(undefined, envId);
    return NextResponse.json(tokens);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, description, environment_id, capabilities, expires_in_days, ttl_seconds, expires_at } = body;
    const result = await projectServiceTokenService.createToken(undefined, {
      name,
      description,
      environment_id,
      capabilities,
      expires_in_days,
      ttl_seconds,
      expires_at,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
