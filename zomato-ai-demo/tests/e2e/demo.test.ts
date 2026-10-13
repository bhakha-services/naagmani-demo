import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { DEMO_SCENARIOS, runAllScenarios } from "../../src/server/scenarios.js";
import { naagmaniClient } from "../../src/server/naagmani-client.js";
import { ORDERS, RESTAURANTS, CUSTOMERS } from "../../src/mock/data.js";
import { executeZomatoTool } from "../../src/server/tools.js";
import { retrieveSupportPolicies } from "../../src/knowledge/policies.js";

describe("Zomato AI Demo — Naagmani v2 Enterprise AI OS Verification", () => {
  before(async () => {
    const health = await naagmaniClient.checkHealth();
    assert.equal(health.os, true, "Naagmani OS should be healthy");
  });

  describe("1. Mock Food Delivery Data Integrity", () => {
    it("should have 5 customers with distinct tiers and cities", () => {
      assert.equal(CUSTOMERS.length, 5);
      const tiers = CUSTOMERS.map((c) => c.tier);
      assert.ok(tiers.includes("prime"));
      assert.ok(tiers.includes("gold"));
      assert.ok(tiers.includes("standard"));
    });

    it("should have 10 restaurants across Bangalore neighborhoods", () => {
      assert.equal(RESTAURANTS.length, 10);
      const cuisines = RESTAURANTS.flatMap((r) => r.cuisine);
      assert.ok(cuisines.includes("Italian"));
      assert.ok(cuisines.includes("Biryani"));
      assert.ok(cuisines.includes("South Indian"));
    });

    it("should have 20 orders with varied statuses and items", () => {
      assert.equal(ORDERS.length, 20);
      const statuses = new Set(ORDERS.map((o) => o.status));
      assert.ok(statuses.has("OUT_FOR_DELIVERY"));
      assert.ok(statuses.has("DELIVERED"));
      assert.ok(statuses.has("PREPARING"));
      assert.ok(statuses.has("CANCELLED"));
      assert.ok(statuses.has("PLACED"));
    });
  });

  describe("2. MCP Tools & Security Authorization", () => {
    it("should get status for valid order ORD-1001", () => {
      const res = executeZomatoTool("get_order_status", { order_id: "ORD-1001" }, "cust_1001");
      assert.equal(res.success, true);
      assert.equal(res.result.order_id, "ORD-1001");
      assert.equal(res.result.status, "OUT_FOR_DELIVERY");
    });

    it("should deny cross-customer order cancellation (cust_1002 attempting to cancel cust_1001's order)", () => {
      const res = executeZomatoTool("cancel_order", { order_id: "ORD-1001", customer_id: "cust_1002" }, "cust_1002");
      assert.equal(res.success, false);
      assert.ok(res.error?.includes("AUTHORIZATION_DENIED"));
    });

    it("should prevent cancelling an order that is OUT_FOR_DELIVERY", () => {
      const res = executeZomatoTool("cancel_order", { order_id: "ORD-1001", customer_id: "cust_1001" }, "cust_1001");
      assert.equal(res.success, false);
      assert.ok(res.error?.includes("OUT_FOR_DELIVERY"));
    });

    it("should allow cancelling an eligible PLACED order (ORD-1003) for its rightful owner", () => {
      const res = executeZomatoTool("cancel_order", { order_id: "ORD-1003", customer_id: "cust_1001" }, "cust_1001");
      assert.equal(res.success, true);
      assert.equal(res.result.status, "CANCELLED");
      assert.equal(res.result.refund_status, "REFUNDED");
    });
  });

  describe("3. RAG Knowledge Base Retrieval", () => {
    it("should retrieve late delivery policy for delayed order query", () => {
      const rag = retrieveSupportPolicies("My delivery is delayed by 30 mins, what is your refund policy?");
      assert.notEqual(rag, null);
      assert.equal(rag?.matched_topic, "refund");
      assert.ok((rag?.policies.length || 0) > 0);
    });

    it("should retrieve data privacy policy for sensitive credit card inquiry", () => {
      const rag = retrieveSupportPolicies("Why is my credit card details masked in receipt?");
      assert.notEqual(rag, null);
      assert.equal(rag?.matched_topic, "data_privacy");
    });
  });

  describe("4. End-to-End Execution of All 13 Demo Scenarios", () => {
    it("Scenario 1: Normal AI Request (Provider Called = 1)", async () => {
      const s1 = DEMO_SCENARIOS.find((s) => s.id === "normal_request")!;
      const res = await s1.run();
      assert.equal(res.passed, true);
      assert.equal(res.provider_called, true);
      assert.equal(res.provider_calls_count_delta, 1);
      assert.ok(res.tokens_metered > 0);
      assert.ok(res.cost_usd > 0);
    });

    it("Scenario 2: RAG Support Policy Grounding (Provider Called = 1, RAG retrieved)", async () => {
      const s2 = DEMO_SCENARIOS.find((s) => s.id === "rag_policy")!;
      const res = await s2.run();
      assert.equal(res.passed, true);
      assert.equal(res.provider_called, true);
      assert.ok((res.response.plugin_metrics?.rag_retrieval_count || 0) > 0);
    });

    it("Scenario 3: MCP Tool Execution (Provider Called = 1)", async () => {
      const s3 = DEMO_SCENARIOS.find((s) => s.id === "mcp_tool")!;
      const res = await s3.run();
      assert.equal(res.passed, true);
      assert.equal(res.provider_called, true);
      assert.ok(res.response.plugin_metrics?.mcp_tools_executed?.includes("get_order_status"));
    });

    it("Scenario 4: Sensitive Data DLP Defense (BLOCKED, Provider Called = 0, Cost = $0.00)", async () => {
      const s4 = DEMO_SCENARIOS.find((s) => s.id === "sensitive_data_dlp")!;
      const res = await s4.run();
      assert.equal(res.passed, true);
      assert.equal(res.provider_called, false);
      assert.equal(res.provider_calls_count_delta, 0);
      assert.equal(res.cost_usd, 0);
      assert.equal(res.tokens_metered, 0);
    });

    it("Scenario 5: Prompt Injection AI Firewall Defense (BLOCKED, Provider Called = 0)", async () => {
      const s5 = DEMO_SCENARIOS.find((s) => s.id === "prompt_injection")!;
      const res = await s5.run();
      assert.equal(res.passed, true);
      assert.equal(res.provider_called, false);
      assert.equal(res.provider_calls_count_delta, 0);
    });

    it("Scenario 6: Tool Authorization Defense (DENIED, Provider Calls = 0 on invalid tool)", async () => {
      const s6 = DEMO_SCENARIOS.find((s) => s.id === "tool_authorization")!;
      const res = await s6.run();
      assert.equal(res.passed, true);
    });

    it("Scenario 7: Governance Model Policy (DENIED, Provider Called = 0)", async () => {
      const s7 = DEMO_SCENARIOS.find((s) => s.id === "governance_policy")!;
      const res = await s7.run();
      assert.equal(res.passed, true);
      assert.equal(res.provider_called, false);
      assert.equal(res.provider_calls_count_delta, 0);
    });

    it("Scenario 8: FinOps Budget Enforcement (REJECTED, Provider Called = 0)", async () => {
      const s8 = DEMO_SCENARIOS.find((s) => s.id === "budget_enforcement")!;
      const res = await s8.run();
      assert.equal(res.passed, true);
      assert.equal(res.provider_called, false);
      assert.equal(res.provider_calls_count_delta, 0);
      assert.equal(res.cost_usd, 0);
    });

    it("Scenario 9: Quota Enforcement (HTTP 429, Provider Called = 0)", async () => {
      const s9 = DEMO_SCENARIOS.find((s) => s.id === "quota_enforcement")!;
      const res = await s9.run();
      assert.equal(res.passed, true);
      assert.equal(res.provider_called, false);
      assert.equal(res.provider_calls_count_delta, 0);
    });

    it("Scenario 10: Rate Limiting Sliding Window (Throttled, Provider Called = 0)", async () => {
      const s10 = DEMO_SCENARIOS.find((s) => s.id === "rate_limiting")!;
      const res = await s10.run();
      assert.equal(res.passed, true);
      assert.equal(res.provider_called, false);
    });

    it("Scenario 11: FinOps Usage Metering & Cost Attribution (Accurate calculation)", async () => {
      const s11 = DEMO_SCENARIOS.find((s) => s.id === "usage_cost")!;
      const res = await s11.run();
      assert.equal(res.passed, true);
      assert.equal(res.provider_called, true);
      assert.ok(res.tokens_metered > 0);
      assert.ok(res.cost_usd > 0);
    });

    it("Scenario 12: Streaming Completion Verification", async () => {
      const s12 = DEMO_SCENARIOS.find((s) => s.id === "streaming")!;
      const res = await s12.run();
      assert.equal(res.passed, true);
      assert.equal(res.provider_called, true);
    });

    it("Scenario 13: Tenant & Customer Isolation (Cross-customer blocked)", async () => {
      const s13 = DEMO_SCENARIOS.find((s) => s.id === "tenant_isolation")!;
      const res = await s13.run();
      assert.equal(res.passed, true);
      assert.equal(res.provider_called, false);
    });

    it("Scenario 14: B2B Partner Customer Provisioning via Service Token", async () => {
      const s14 = DEMO_SCENARIOS.find((s) => s.id === "service_token_customer_provisioning")!;
      const res = await s14.run();
      assert.equal(res.passed, true);
      assert.equal(res.provider_called, true);
      assert.ok(res.tokens_metered > 0);
    });

    it("should execute runAllScenarios() with 100% pass rate across all 14 scenarios", async () => {
      const results = await runAllScenarios();
      assert.equal(results.length, 14);
      const passedCount = results.filter((r) => r.passed).length;
      assert.equal(passedCount, 14);
    });
  });
});
