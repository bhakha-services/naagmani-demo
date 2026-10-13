import { NextRequest, NextResponse } from "next/server";
import { projectServiceTokenService } from "@/server/service-tokens";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const customToken = body.token as string | undefined;
    const matrix = await projectServiceTokenService.runFullTestMatrix(customToken);
    return NextResponse.json(matrix);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
