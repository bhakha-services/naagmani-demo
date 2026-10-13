import { NextRequest, NextResponse } from "next/server";
import { projectServiceTokenService } from "@/server/service-tokens";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const token = await projectServiceTokenService.getToken(undefined, id);
    return NextResponse.json(token);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 404 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const reason = searchParams.get("reason") || "manual revocation via zomato demo UI";
    const result = await projectServiceTokenService.revokeToken(undefined, id, reason);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
