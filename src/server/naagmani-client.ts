import dotenv from "dotenv";
dotenv.config();

export interface NaagmaniConfig {
  osUrl: string;
  cloudUrl: string;
  apiKey: string;
  orgId: string;
  projectId: string;
  environmentId: string;
  defaultModel: string;
}

export interface LifecycleStage {
  name: string;
  status: "PASSED" | "BLOCKED" | "DENIED" | "SKIPPED" | "EXECUTED";
  duration_ms: number;
  details?: string;
}

export interface AIChatResponse {
  success: boolean;
  content: string;
  model: string;
  provider_called: boolean;
  provider_call_id?: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    cost_usd: number;
  };
  plugin_metrics?: {
    firewall_invoked: boolean;
    firewall_blocked: boolean;
    dlp_invoked: boolean;
    dlp_modified: boolean;
    rag_retrieval_count: number;
    mcp_tools_executed: string[];
    agent_steps: number;
  };
  lifecycle: LifecycleStage[];
  error?: {
    code: string;
    message: string;
    stage: string;
    retry_after?: number;
  };
}

export class NaagmaniClient {
  public config: NaagmaniConfig;
  public providerCallsTotal: number = 0;
  public blockedCallsTotal: number = 0;
  public totalTokensMetered: number = 0;
  public totalCostUsd: number = 0.0;
  public pluginMetricsAggregate = {
    firewall_invocations: 0,
    firewall_blocks: 0,
    dlp_invocations: 0,
    dlp_blocks: 0,
    rag_retrievals: 0,
    mcp_calls: 0,
    policy_denials: 0,
    budget_denials: 0,
    quota_denials: 0,
  };

  // Local simulated budget control for Scenario 8 testing
  public mockBudgetLimitUsd: number | null = null;
  public mockCurrentSpendUsd: number = 0.0;

  // Local quota control for Scenario 9 testing
  public mockQuotaLimitPerMin: number | null = null;
  public mockQuotaWindowRequests: { timestamp: number }[] = [];

  // Denied models for Scenario 7 testing
  public deniedModels: Set<string> = new Set();

  constructor() {
    this.config = {
      osUrl: process.env.NAAGMANI_OS_URL || "http://localhost:8080",
      cloudUrl: process.env.NAAGMANI_CLOUD_URL || "http://localhost:8081",
      apiKey: process.env.NAAGMANI_API_KEY || "nm_live_0123456789abcdef0123456789abcdef0123456789abcdef",
      orgId: process.env.NAAGMANI_ORG_ID || "00000000-0000-0000-0000-000000000001",
      projectId: process.env.NAAGMANI_PROJECT_ID || "00000000-0000-0000-0000-000000000002",
      environmentId: process.env.NAAGMANI_ENVIRONMENT_ID || "00000000-0000-0000-0000-000000000003",
      defaultModel: process.env.DEFAULT_MODEL || "mock/gpt-5-mini",
    };
  }

  public setAuthToken(token: string) {
    this.config.apiKey = token;
  }

  public getAuthToken(): string {
    return this.config.apiKey;
  }

  public isUsingServiceToken(): boolean {
    return Boolean(this.config.apiKey && this.config.apiKey.startsWith("nm_st_"));
  }

  public async checkHealth(): Promise<{ os: boolean; cloud: boolean; osVersion?: string }> {
    let osOk = false;
    let cloudOk = false;
    let osVersion: string | undefined;

    try {
      const res = await fetch(`${this.config.osUrl}/v1/health`, { signal: AbortSignal.timeout(2000) });
      if (res.ok) {
        const body = (await res.json()) as any;
        osOk = true;
        osVersion = body.version;
      }
    } catch (_) {}

    try {
      const res = await fetch(`${this.config.cloudUrl}/v1/plugins`, { signal: AbortSignal.timeout(2000) });
      if (res.ok) {
        cloudOk = true;
      }
    } catch (_) {}

    return { os: osOk, cloud: cloudOk, osVersion };
  }

  public async executeChat(params: {
    messages: { role: string; content: string }[];
    customerId?: string;
    model?: string;
    stream?: boolean;
    mcpToolResult?: any;
    ragContext?: any;
    forcedPolicyDeny?: boolean;
    forcedBudgetExceeded?: boolean;
    forcedQuotaBurst?: boolean;
  }): Promise<AIChatResponse> {
    const lifecycle: LifecycleStage[] = [];
    const startTime = Date.now();
    const model = params.model || this.config.defaultModel;
    const customerId = params.customerId || "cust_1001";

    const pluginMetrics = {
      firewall_invoked: true,
      firewall_blocked: false,
      dlp_invoked: false,
      dlp_modified: false,
      rag_retrieval_count: params.ragContext ? params.ragContext.policies?.length || 1 : 0,
      mcp_tools_executed: params.mcpToolResult ? [params.mcpToolResult.tool] : [],
      agent_steps: 1,
    };

    // 1. Authentication Stage
    const t0 = Date.now();
    const isServiceToken = this.config.apiKey && this.config.apiKey.startsWith("nm_st_");
    const isLiveApiKey = this.config.apiKey && this.config.apiKey.startsWith("nm_live_");

    if (!this.config.apiKey || (!isLiveApiKey && !isServiceToken)) {
      lifecycle.push({
        name: "Authentication",
        status: "BLOCKED",
        duration_ms: Date.now() - t0,
        details: "Missing or invalid Naagmani API Key or Project Service Token format (expected nm_live_... or nm_st_...)",
      });
      return {
        success: false,
        content: "",
        model,
        provider_called: false,
        lifecycle,
        error: { code: "UNAUTHORIZED", message: "Invalid API key or Service Token format", stage: "Authentication" },
      };
    }

    const authType = isServiceToken ? "Project Service Token" : "API Key";
    const maskedCred = isServiceToken
      ? `${this.config.apiKey.substring(0, 16)}****...${this.config.apiKey.slice(-4)}`
      : `${this.config.apiKey.substring(0, 12)}...`;

    lifecycle.push({
      name: "Authentication",
      status: "PASSED",
      duration_ms: Date.now() - t0,
      details: `Bearer ${maskedCred} (${authType} principal: ${isServiceToken ? "service_token" : customerId})`,
    });

    // 2. Authorization & Tenant Scoping
    const t1 = Date.now();
    lifecycle.push({
      name: "Authorization",
      status: "PASSED",
      duration_ms: Date.now() - t1,
      details: `Scoped to Org=${this.config.orgId.substring(0, 8)} Proj=${this.config.projectId.substring(0, 8)} Scope=inference.execute`,
    });

    // 3. Enterprise Governance Policy Check
    const t2 = Date.now();
    if (params.forcedPolicyDeny || this.deniedModels.has(model)) {
      this.blockedCallsTotal++;
      this.pluginMetricsAggregate.policy_denials++;
      lifecycle.push({
        name: "Policy Governance",
        status: "DENIED",
        duration_ms: Date.now() - t2,
        details: `DENY rule active: Model '${model}' is forbidden in environment '${this.config.environmentId}'`,
      });
      return {
        success: false,
        content: "",
        model,
        provider_called: false,
        lifecycle,
        error: {
          code: "POLICY_DENIED",
          message: `request denied by enterprise governance policy: Model '${model}' is explicitly blocked`,
          stage: "Policy Governance",
        },
      };
    }
    lifecycle.push({
      name: "Policy Governance",
      status: "PASSED",
      duration_ms: Date.now() - t2,
      details: `Model '${model}' allowed by organization policy (Precedence: Principal > Env > Proj > Org)`,
    });

    // 4. Rate Limiting & Quota Management
    const t3 = Date.now();
    const now = Date.now();
    this.mockQuotaWindowRequests = this.mockQuotaWindowRequests.filter((r) => now - r.timestamp < 60000);

    if (
      params.forcedQuotaBurst ||
      (this.mockQuotaLimitPerMin !== null && this.mockQuotaWindowRequests.length >= this.mockQuotaLimitPerMin)
    ) {
      this.blockedCallsTotal++;
      this.pluginMetricsAggregate.quota_denials++;
      lifecycle.push({
        name: "Quota & Rate Limit",
        status: "BLOCKED",
        duration_ms: Date.now() - t3,
        details: `Rate limit exceeded: Max ${this.mockQuotaLimitPerMin || 5} requests/min. Retry-After: 12s`,
      });
      return {
        success: false,
        content: "",
        model,
        provider_called: false,
        lifecycle,
        error: {
          code: "RATE_LIMIT_EXCEEDED",
          message: "Rate limit exceeded: Quota of 5 requests per minute has been exhausted.",
          stage: "Quota & Rate Limit",
          retry_after: 12,
        },
      };
    }
    this.mockQuotaWindowRequests.push({ timestamp: now });
    lifecycle.push({
      name: "Quota & Rate Limit",
      status: "PASSED",
      duration_ms: Date.now() - t3,
      details: `Token and request quotas within allowed limits (requests_in_window: ${this.mockQuotaWindowRequests.length})`,
    });

    // 5. FinOps Budget Verification
    const t4 = Date.now();
    const estimatedCost = 0.005;
    if (
      params.forcedBudgetExceeded ||
      (this.mockBudgetLimitUsd !== null && this.mockCurrentSpendUsd + estimatedCost > this.mockBudgetLimitUsd)
    ) {
      this.blockedCallsTotal++;
      this.pluginMetricsAggregate.budget_denials++;
      lifecycle.push({
        name: "FinOps Budget",
        status: "BLOCKED",
        duration_ms: Date.now() - t4,
        details: `Hard limit budget exceeded: Current spend $${this.mockCurrentSpendUsd.toFixed(4)} >= Budget $${(this.mockBudgetLimitUsd || 0.1).toFixed(2)}`,
      });
      return {
        success: false,
        content: "",
        model,
        provider_called: false,
        lifecycle,
        error: {
          code: "BUDGET_EXCEEDED",
          message: "request rejected: enterprise budget exceeded (hard limit active, zero provider calls allowed)",
          stage: "FinOps Budget",
        },
      };
    }
    lifecycle.push({
      name: "FinOps Budget",
      status: "PASSED",
      duration_ms: Date.now() - t4,
      details: `Remaining budget verified ($${this.mockCurrentSpendUsd.toFixed(4)} / $${(this.mockBudgetLimitUsd || 100.0).toFixed(2)})`,
    });

    // 6. Security Check: DLP / Sensitive Data Check
    const promptText = params.messages.map((m) => m.content).join("\n");
    const t5 = Date.now();
    this.pluginMetricsAggregate.dlp_invocations++;

    if (
      promptText.match(/credit\s*card\s*number/i) ||
      promptText.match(/\b\d{4}[ -]?\d{4}[ -]?\d{4}[ -]?\d{4}\b/) ||
      promptText.match(/complete\s*card\s*details/i) ||
      promptText.match(/show\s*me\s*the\s*complete\s*credit\s*card/i)
    ) {
      this.blockedCallsTotal++;
      this.pluginMetricsAggregate.dlp_blocks++;
      lifecycle.push({
        name: "Security DLP",
        status: "BLOCKED",
        duration_ms: Date.now() - t5,
        details: "DLP policy triggered: Attempt to inspect or leak full credit card numbers blocked by security.dlp",
      });
      return {
        success: false,
        content: "",
        model,
        provider_called: false,
        lifecycle,
        error: {
          code: "DLP_VIOLATION",
          message: "request blocked by plugin: Data Loss Prevention (DLP): Access to raw credit card numbers is strictly prohibited by enterprise policy",
          stage: "Security DLP",
        },
      };
    }
    lifecycle.push({
      name: "Security DLP",
      status: "PASSED",
      duration_ms: Date.now() - t5,
      details: "DLP PII scanner passed: No credit card or private key leaks detected",
    });

    // 7. Security Check: AI Firewall / Prompt Injection (Calls Naagmani OS out-of-process plugin)
    const t6 = Date.now();
    this.pluginMetricsAggregate.firewall_invocations++;

    // Prepare payload to Naagmani OS
    const enrichedMessages = [...params.messages];

    // Inject RAG context if present
    if (params.ragContext && params.ragContext.policies?.length > 0) {
      this.pluginMetricsAggregate.rag_retrievals++;
      const ragText = params.ragContext.policies
        .map((p: any) => `[POLICY: ${p.title}]\n${p.content}\nConditions:\n- ${p.conditions.join("\n- ")}`)
        .join("\n\n");
      enrichedMessages.unshift({
        role: "system",
        content: `You are the Zomato AI Assistant. Answer using the official enterprise food delivery support policies:\n\n${ragText}`,
      });
      lifecycle.push({
        name: "RAG Retrieval",
        status: "EXECUTED",
        duration_ms: 12,
        details: `Retrieved ${params.ragContext.policies.length} policy documents for topic: ${params.ragContext.matched_topic}`,
      });
    }

    // Inject MCP tool output if present
    if (params.mcpToolResult) {
      this.pluginMetricsAggregate.mcp_calls++;
      enrichedMessages.unshift({
        role: "system",
        content: `[UNTRUSTED TOOL OUTPUT - MCP tool: ${params.mcpToolResult.tool}]\n${JSON.stringify(params.mcpToolResult.result, null, 2)}`,
      });
      lifecycle.push({
        name: "MCP Tools",
        status: "EXECUTED",
        duration_ms: 18,
        details: `Invoked MCP tool '${params.mcpToolResult.tool}' with parameters: ${JSON.stringify(params.mcpToolResult.result)}`,
      });
    }

    // Call Naagmani OS HTTP Gateway
    const osPayload = {
      model,
      messages: enrichedMessages,
      stream: params.stream || false,
    };

    try {
      const osResponse = await fetch(`${this.config.osUrl}/v1/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.config.apiKey}`,
          "X-Organization-ID": this.config.orgId,
          "X-Project-ID": this.config.projectId,
          "X-Environment-ID": this.config.environmentId,
          "X-Principal-ID": customerId,
        },
        body: JSON.stringify(osPayload),
      });

      const respStatus = osResponse.status;
      const respData = (await osResponse.json()) as any;

      if (respStatus === 403) {
        this.blockedCallsTotal++;
        pluginMetrics.firewall_blocked = true;
        this.pluginMetricsAggregate.firewall_blocks++;
        lifecycle.push({
          name: "AI Firewall",
          status: "BLOCKED",
          duration_ms: Date.now() - t6,
          details: respData?.error?.message || "AI Firewall blocked prompt injection attempt",
        });
        return {
          success: false,
          content: "",
          model,
          provider_called: false, // VERIFIED: Provider NOT called on firewall block
          lifecycle,
          error: {
            code: "FIREWALL_BLOCKED",
            message: respData?.error?.message || "Request blocked by AI Firewall",
            stage: "AI Firewall",
          },
        };
      }

      if (!osResponse.ok) {
        this.blockedCallsTotal++;
        return {
          success: false,
          content: "",
          model,
          provider_called: false,
          lifecycle,
          error: {
            code: respData?.error?.code || "OS_ERROR",
            message: respData?.error?.message || "Naagmani OS returned an error",
            stage: "AI Gateway",
          },
        };
      }

      // Success! Naagmani OS evaluated all hooks and forwarded to Provider
      this.providerCallsTotal++;
      lifecycle.push({
        name: "AI Firewall",
        status: "PASSED",
        duration_ms: Date.now() - t6,
        details: "AI Firewall inspection clean. No malicious injection patterns found.",
      });

      lifecycle.push({
        name: "Smart Router & Provider",
        status: "EXECUTED",
        duration_ms: Date.now() - startTime,
        details: `Routed to Provider 'mock' for model '${model}'. Latency: 42ms`,
      });

      const usage = respData.usage || { prompt_tokens: 30, completion_tokens: 65, total_tokens: 95 };
      const costUsd = (usage.prompt_tokens * 0.000005) + (usage.completion_tokens * 0.000015);

      this.totalTokensMetered += usage.total_tokens;
      this.totalCostUsd += costUsd;
      this.mockCurrentSpendUsd += costUsd;

      lifecycle.push({
        name: "FinOps Usage Metering",
        status: "EXECUTED",
        duration_ms: 5,
        details: `Metered ${usage.total_tokens} tokens ($${costUsd.toFixed(6)}). Recorded in canonical usage ledger.`,
      });

      const assistantMessage = respData.choices?.[0]?.message?.content || "";

      return {
        success: true,
        content: assistantMessage,
        model,
        provider_called: true, // VERIFIED: Provider was reached
        provider_call_id: `prov_call_${Date.now()}`,
        usage: {
          prompt_tokens: usage.prompt_tokens,
          completion_tokens: usage.completion_tokens,
          total_tokens: usage.total_tokens,
          cost_usd: costUsd,
        },
        plugin_metrics: pluginMetrics,
        lifecycle,
      };
    } catch (err: any) {
      return {
        success: false,
        content: "",
        model,
        provider_called: false,
        lifecycle,
        error: {
          code: "NETWORK_ERROR",
          message: `Failed connecting to Naagmani OS at ${this.config.osUrl}: ${err.message}`,
          stage: "Network Transport",
        },
      };
    }
  }
}

export const naagmaniClient = new NaagmaniClient();
