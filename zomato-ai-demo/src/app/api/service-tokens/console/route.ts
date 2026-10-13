import { NextRequest, NextResponse } from "next/server";
import { projectServiceTokenService } from "@/server/service-tokens";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = await projectServiceTokenService.executeConsoleOperation(body);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
