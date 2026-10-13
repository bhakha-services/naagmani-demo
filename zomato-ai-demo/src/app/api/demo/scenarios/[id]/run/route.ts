import { NextRequest, NextResponse } from "next/server";
import { DEMO_SCENARIOS } from "@/server/scenarios";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const scenario = DEMO_SCENARIOS.find((s) => s.id === id);
  if (!scenario) {
    return NextResponse.json({ error: "Scenario not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const inputOverride = body.input;
  const result = await scenario.run(inputOverride);
  return NextResponse.json(result);
}
