import { NextRequest, NextResponse } from "next/server";
import { RESTAURANTS } from "@/mock/data";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = (searchParams.get("q") || "").toLowerCase();
  const location = (searchParams.get("location") || "").toLowerCase();

  let filtered = RESTAURANTS;
  if (query) {
    filtered = filtered.filter(
      (r) =>
        r.name.toLowerCase().includes(query) ||
        r.cuisine.some((c) => c.toLowerCase().includes(query))
    );
  }
  if (location) {
    filtered = filtered.filter((r) => r.location.toLowerCase().includes(location));
  }
  return NextResponse.json(filtered);
}
