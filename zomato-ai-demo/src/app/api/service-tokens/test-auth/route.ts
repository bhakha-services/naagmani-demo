import { NextRequest, NextResponse } from "next/server";
import { projectServiceTokenService } from "@/server/service-tokens";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      testName,
      token,
      endpoint,
      method,
      targetProjectId,
      targetEnvironmentId,
      targetOrgId,
      expectedStatus,
      requireCapability,
    } = body;
    const result = await projectServiceTokenService.testTokenAuth({
      testName: testName || "Custom Token Authentication Test",
      token,
      endpoint,
      method,
      targetProjectId,
      targetEnvironmentId,
      targetOrgId,
      expectedStatus,
      requireCapability,
    });
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
