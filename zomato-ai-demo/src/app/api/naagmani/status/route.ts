import { NextResponse } from "next/server";
import { naagmaniClient } from "@/server/naagmani-client";

export async function GET() {
  const health = await naagmaniClient.checkHealth();
  return NextResponse.json({
    status: health.os ? "CONNECTED" : "DISCONNECTED",
    os_url: naagmaniClient.config.osUrl,
    cloud_url: naagmaniClient.config.cloudUrl,
    os_healthy: health.os,
    cloud_healthy: health.cloud,
    os_version: health.osVersion || "0.1.0",
    tenant: {
      organization_id: naagmaniClient.config.orgId,
      project_id: naagmaniClient.config.projectId,
      environment_id: naagmaniClient.config.environmentId,
    },
    plugins: [
      { name: "ai-firewall", status: "RUNNING", version: "1.0.0", capabilities: ["security.firewall"] },
      { name: "dlp", status: "RUNNING", version: "1.0.0", capabilities: ["security.dlp", "privacy.pii"] },
      { name: "rag", status: "RUNNING", version: "1.0.0", capabilities: ["knowledge.rag", "knowledge.retrieval"] },
      { name: "mcp", status: "RUNNING", version: "1.0.0", capabilities: ["tools.mcp", "tools.function"] },
      { name: "agent-runtime", status: "RUNNING", version: "1.0.0", capabilities: ["agent.runtime"] },
    ],
    telemetry: {
      total_provider_calls: naagmaniClient.providerCallsTotal,
      blocked_requests_total: naagmaniClient.blockedCallsTotal,
      total_tokens: naagmaniClient.totalTokensMetered,
      total_cost_usd: naagmaniClient.totalCostUsd,
      plugin_metrics: naagmaniClient.pluginMetricsAggregate,
    },
    budget: {
      allocated_usd: naagmaniClient.mockBudgetLimitUsd || 10.0,
      spent_usd: naagmaniClient.totalCostUsd,
      hard_limit_active: true,
    },
  });
}
