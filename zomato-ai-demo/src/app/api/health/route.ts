import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    app: "zomato-ai-demo",
    framework: "Next.js",
    timestamp: new Date().toISOString(),
  });
}
