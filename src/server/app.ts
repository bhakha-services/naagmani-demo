import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { CUSTOMERS, RESTAURANTS, ORDERS, SUPPORT_POLICIES } from "../mock/data.js";
import { executeZomatoTool } from "./tools.js";
import { retrieveSupportPolicies } from "../knowledge/policies.js";
import { naagmaniClient } from "./naagmani-client.js";
import { DEMO_SCENARIOS, runAllScenarios } from "./scenarios.js";
import { projectServiceTokenService } from "./service-tokens.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Serve static frontend
const clientDir = path.join(__dirname, "../client");
app.use(express.static(clientDir));

// ----------------------------------------------------------------------
// 1. Zomato Food Delivery Mock REST APIs
// ----------------------------------------------------------------------

// Health
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", app: "zomato-ai-demo", timestamp: new Date().toISOString() });
});

// Customers
app.get("/api/customers", (_req, res) => {
  res.json(CUSTOMERS);
});

// Restaurants
app.get("/api/restaurants", (req, res) => {
  const query = String(req.query.q || "").toLowerCase();
  const location = String(req.query.location || "").toLowerCase();

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
  res.json(filtered);
});

app.get("/api/restaurants/:id", (req, res) => {
  const rest = RESTAURANTS.find((r) => r.id === req.params.id);
  if (!rest) return res.status(404).json({ error: "Restaurant not found" });
  res.json(rest);
});

// Orders
app.get("/api/orders", (req, res) => {
  const customerId = String(req.query.customer_id || "");
  if (customerId) {
    return res.json(ORDERS.filter((o) => o.customer_id === customerId));
  }
  res.json(ORDERS);
});

app.get("/api/orders/:id", (req, res) => {
  const order = ORDERS.find((o) => o.id === req.params.id.toUpperCase());
  if (!order) return res.status(404).json({ error: "Order not found" });
  res.json(order);
});

app.post("/api/orders/:id/cancel", (req, res) => {
  const orderId = req.params.id.toUpperCase();
  const customerId = req.body.customer_id;
  const result = executeZomatoTool("cancel_order", { order_id: orderId, customer_id: customerId });
  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }
  res.json(result.result);
});

// Support Policies
app.get("/api/policies", (_req, res) => {
  res.json(SUPPORT_POLICIES);
});

// ----------------------------------------------------------------------
// 2. AI Assistant Chat Endpoint (Powered by Naagmani OS)
// ----------------------------------------------------------------------
app.post("/api/ai/chat", async (req, res) => {
  const { messages, customer_id, model, stream } = req.body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "messages array is required" });
  }

  const customerId = customer_id || "cust_1001";
  const lastUserMessage = messages.filter((m: any) => m.role === "user").pop()?.content || "";

  // 1. Tool execution resolution (MCP emulation)
  let mcpToolResult: any = null;
  const orderMatch = lastUserMessage.match(/ORD-\d{4}/i);
  if (orderMatch) {
    const orderId = orderMatch[0].toUpperCase();
    if (lastUserMessage.toLowerCase().includes("cancel")) {
      mcpToolResult = executeZomatoTool("cancel_order", { order_id: orderId, customer_id: customerId }, customerId);
    } else {
      mcpToolResult = executeZomatoTool("get_order_status", { order_id: orderId }, customerId);
    }
  }

  // 2. RAG retrieval resolution
  const ragContext = retrieveSupportPolicies(lastUserMessage);

  // 3. Dispatch to Naagmani OS AI Gateway
  const aiResponse = await naagmaniClient.executeChat({
    customerId,
    messages,
    model,
    stream,
    mcpToolResult,
    ragContext,
  });

  res.json(aiResponse);
});

// ----------------------------------------------------------------------
// 3. Naagmani Integration & Observability APIs
// ----------------------------------------------------------------------
app.get("/api/naagmani/status", async (_req, res) => {
  const health = await naagmaniClient.checkHealth();
  res.json({
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
});

app.get("/api/naagmani/usage", (_req, res) => {
  res.json({
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
});

// ----------------------------------------------------------------------
// 4. Demo Scenarios Runner APIs
// ----------------------------------------------------------------------
app.get("/api/demo/scenarios", (_req, res) => {
  res.json(
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
});

app.post("/api/demo/scenarios/:id/run", async (req, res) => {
  const scenario = DEMO_SCENARIOS.find((s) => s.id === req.params.id);
  if (!scenario) return res.status(404).json({ error: "Scenario not found" });

  const inputOverride = req.body.input;
  const result = await scenario.run(inputOverride);
  res.json(result);
});

app.post("/api/demo/run-all", async (_req, res) => {
  const results = await runAllScenarios();
  const summary = {
    total: results.length,
    passed: results.filter((r) => r.passed).length,
    failed: results.filter((r) => !r.passed).length,
    results,
  };
  res.json(summary);
});

// ----------------------------------------------------------------------
// 5. Project Service Token Integration & Testing APIs
// ----------------------------------------------------------------------

// Safe configuration
app.get("/api/service-tokens/config", (_req, res) => {
  res.json(projectServiceTokenService.getConfig());
});

// List service tokens
app.get("/api/service-tokens", async (req, res) => {
  try {
    const envId = req.query.environment_id as string | undefined;
    const tokens = await projectServiceTokenService.listTokens(undefined, envId);
    res.json(tokens);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Create service token (returns one-time secret)
app.post("/api/service-tokens", async (req, res) => {
  try {
    const { name, description, environment_id, capabilities, expires_in_days, ttl_seconds, expires_at } = req.body;
    const result = await projectServiceTokenService.createToken(undefined, {
      name,
      description,
      environment_id,
      capabilities,
      expires_in_days,
      ttl_seconds,
      expires_at,
    });
    res.status(201).json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Get single token details (secret strictly omitted)
app.get("/api/service-tokens/:id", async (req, res) => {
  try {
    const token = await projectServiceTokenService.getToken(undefined, req.params.id);
    res.json(token);
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
});

// Rotate service token
app.post("/api/service-tokens/:id/rotate", async (req, res) => {
  try {
    const { grace_period_hours } = req.body;
    const result = await projectServiceTokenService.rotateToken(undefined, req.params.id, {
      grace_period_hours,
    });
    res.status(201).json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Revoke service token
app.delete("/api/service-tokens/:id", async (req, res) => {
  try {
    const reason = (req.query.reason as string) || "manual revocation via zomato demo UI";
    const result = await projectServiceTokenService.revokeToken(undefined, req.params.id, reason);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Test single token authentication / isolation scenario
app.post("/api/service-tokens/test-auth", async (req, res) => {
  try {
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
    } = req.body;
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
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Run complete Project Service Token authentication and resource isolation matrix
app.post("/api/service-tokens/run-matrix", async (req, res) => {
  try {
    const customToken = req.body.token as string | undefined;
    const matrix = await projectServiceTokenService.runFullTestMatrix(customToken);
    res.json(matrix);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Set active runtime service token for the demo assistant
app.post("/api/service-tokens/set-active", (req, res) => {
  const { token } = req.body;
  if (!token) {
    return res.status(400).json({ error: "token is required" });
  }
  const ok = projectServiceTokenService.setActiveToken(token);
  if (!ok) {
    return res.status(400).json({ error: "Invalid token format (expected nm_st_<10base32>_<48hex>)" });
  }
  // Also configure naagmaniClient to use this token for all upcoming chat calls
  naagmaniClient.setAuthToken(token);
  res.json({
    success: true,
    message: "Active demo token updated to Project Service Token",
    config: projectServiceTokenService.getConfig(),
  });
});

// Execute test console operation
app.post("/api/service-tokens/console", async (req, res) => {
  try {
    const result = await projectServiceTokenService.executeConsoleOperation(req.body);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Catch-all for SPA client
app.get("*", (_req, res) => {
  res.sendFile(path.join(clientDir, "index.html"));
});

// Start Server
if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`\n======================================================`);
    console.log(`🍕 Zomato AI Assistant Demo Application`);
    console.log(`📡 Server running at: http://localhost:${PORT}`);
    console.log(`🎯 Connected to Naagmani OS: ${naagmaniClient.config.osUrl}`);
    console.log(`📋 Interactive Demo Dashboard: http://localhost:${PORT}`);
    console.log(`======================================================\n`);
  });
}

export default app;
