"use client";

import React, { useState, useEffect } from "react";

export function ArchitectureTab() {
  const [status, setStatus] = useState<any>(null);

  const loadStatus = async () => {
    try {
      const res = await fetch("/api/naagmani/status");
      const data = await res.json();
      setStatus(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const STAGES = [
    { num: 1, name: "Authentication", desc: "Bearer token & Machine principal validation" },
    { num: 2, name: "Authorization", desc: "Granular scope & capability boundary enforcement" },
    { num: 3, name: "Policy Governance", desc: "Organization & project AI policies (hierarchical)" },
    { num: 4, name: "Quota & Rate Limits", desc: "Token budgets & sliding-window request throttling" },
    { num: 5, name: "FinOps Budgeting", desc: "Hard spend cap attribution & automatic cutoff" },
    { num: 6, name: "Security DLP", desc: "Deep packet inspection for credit cards, PII & keys" },
    { num: 7, name: "RAG Retrieval", desc: "Grounding with policy documents & support context" },
    { num: 8, name: "MCP Tool Execution", desc: "Model Context Protocol tools (order tracking, menus)" },
    { num: 9, name: "AI Firewall", desc: "Prompt injection, jailbreak & adversarial defense" },
    { num: 10, name: "Smart Router", desc: "Intelligent latency/cost routing to AI provider" },
    { num: 11, name: "FinOps Metering", desc: "Usage ledger recording & token cost attribution" },
  ];

  return (
    <div>
      {/* Overview Card */}
      <div className="card">
        <div className="card-header">
          <div>
            <span className="card-title">🏛️ Naagmani Enterprise AI OS Architecture</span>
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
              Every consumer request travels through a deterministic 11-stage governance pipeline before reaching any foundation model provider.
            </p>
          </div>
          <button className="btn btn-outline btn-sm" onClick={loadStatus}>
            🔄 Refresh
          </button>
        </div>

        {/* 11 Stages Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "0.75rem", marginBottom: "1.5rem" }}>
          {STAGES.map((s) => (
            <div
              key={s.num}
              style={{
                background: "var(--bg-card-subtle)",
                padding: "0.85rem 1rem",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border-color)",
                borderLeft: "3px solid var(--accent-blue)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.25rem" }}>
                <span style={{ fontWeight: 700, fontSize: "0.85rem", color: "white" }}>
                  {s.num}. {s.name}
                </span>
                <span className="badge badge-delivered" style={{ fontSize: "0.65rem" }}>ACTIVE</span>
              </div>
              <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{s.desc}</p>
            </div>
          ))}
        </div>

        {/* Live Counters */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "1rem",
            background: "var(--bg-card-subtle)",
            padding: "1rem",
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--border-color)",
          }}
        >
          <div>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Total Provider Calls:</span>
            <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--accent-green)" }}>
              {status?.telemetry?.total_provider_calls ?? 0}
            </div>
          </div>
          <div>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Blocked at Gateway:</span>
            <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--zomato-red)" }}>
              {status?.telemetry?.blocked_requests_total ?? 0}
            </div>
          </div>
          <div>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Tokens Consumed:</span>
            <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "#60A5FA" }}>
              {status?.telemetry?.total_tokens ?? 0}
            </div>
          </div>
          <div>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>FinOps Spend:</span>
            <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--accent-amber)" }}>
              ${(status?.telemetry?.total_cost_usd ?? 0).toFixed(6)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
