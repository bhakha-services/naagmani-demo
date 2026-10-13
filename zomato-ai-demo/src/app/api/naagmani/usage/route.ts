import { NextResponse } from "next/server";
import { naagmaniClient } from "@/server/naagmani-client";

export async function GET() {
  return NextResponse.json({
    summary: {
      total_requests: naagmaniClient.providerCallsTotal + naagmaniClient.blockedCallsTotal,
      successful_provider_requests: naagmaniClient.providerCallsTotal,
      blocked_requests: naagmaniClient.blockedCallsTotal,
      total_tokens: naagmaniClient.totalTokensMetered,
      total_cost_usd: naagmaniClient.totalCostUsd,
    },
    plugin_telemetry: naagmaniClient.pluginMetricsAggregate,
    breakdown_by_model: [
      {
        model: "mock/gpt-5-mini",
        requests: naagmaniClient.providerCallsTotal,
        tokens: naagmaniClient.totalTokensMetered,
        cost_usd: naagmaniClient.totalCostUsd,
      },
    ],
  });
}
