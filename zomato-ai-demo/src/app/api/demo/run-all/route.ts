import { NextResponse } from "next/server";
import { runAllScenarios } from "@/server/scenarios";

export async function POST() {
  const results = await runAllScenarios();
  const summary = {
    total: results.length,
    passed: results.filter((r) => r.passed).length,
    failed: results.filter((r) => !r.passed).length,
    results,
  };
  return NextResponse.json(summary);
}
