import { NextRequest, NextResponse } from "next/server";
import { projectServiceTokenService } from "@/server/service-tokens";
import { naagmaniClient } from "@/server/naagmani-client";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token } = body;
    if (!token) {
      return NextResponse.json({ error: "token is required" }, { status: 400 });
    }
    const ok = projectServiceTokenService.setActiveToken(token);
    if (!ok) {
      return NextResponse.json(
        { error: "Invalid token format (expected nm_st_<10base32>_<48hex>)" },
        { status: 400 }
      );
    }
    naagmaniClient.setAuthToken(token);
    return NextResponse.json({
      success: true,
      message: "Active demo token updated to Project Service Token",
      config: projectServiceTokenService.getConfig(),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
