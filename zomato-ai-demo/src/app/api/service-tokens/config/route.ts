import { NextResponse } from "next/server";
import { projectServiceTokenService } from "@/server/service-tokens";

export async function GET() {
  return NextResponse.json(projectServiceTokenService.getConfig());
}
