import { NextResponse } from "next/server";
import { DEMO_SCENARIOS } from "@/server/scenarios";

export async function GET() {
  return NextResponse.json(
    DEMO_SCENARIOS.map((s) => ({
      id: s.id,
      number: s.number,
      name: s.name,
      category: s.category,
      description: s.description,
      sampleInput: s.sampleInput,
      expectedBehavior: s.expectedBehavior,
    }))
  );
}
