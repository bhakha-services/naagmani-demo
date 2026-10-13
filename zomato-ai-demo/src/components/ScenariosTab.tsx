"use client";

import React, { useState, useEffect } from "react";

interface Scenario {
  id: string;
  number: number;
  name: string;
  category: string;
  description: string;
  sampleInput: string;
  expectedBehavior: string;
}

export function ScenariosTab() {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [results, setResults] = useState<Record<string, any>>({});
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [runningAll, setRunningAll] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/demo/scenarios")
      .then((res) => res.json())
      .then((data) => setScenarios(data))
      .catch((err) => console.error(err));
  }, []);

  const runSingle = async (id: string) => {
    setLoadingId(id);
    try {
      const res = await fetch(`/api/demo/scenarios/${id}/run`, { method: "POST" });
      const data = await res.json();
      setResults((prev) => ({ ...prev, [id]: data }));
    } catch (e: any) {
      setResults((prev) => ({ ...prev, [id]: { passed: false, error: e.message } }));
    } finally {
      setLoadingId(null);
    }
  };

  const runAll = async () => {
    setRunningAll(true);
    setSummary("⏳ Running all 14 scenarios through Naagmani OS...");
    try {
      const res = await fetch("/api/demo/run-all", { method: "POST" });
      const data = await res.json();
      const newResults: Record<string, any> = {};
      (data.results || []).forEach((r: any) => {
        newResults[r.id] = r;
      });
      setResults(newResults);
      setSummary(
        `🎉 Complete! ${data.passed} of ${data.total} Scenarios Passed. (${data.failed} Failed)`
      );
    } catch (e: any) {
      setSummary("Error: " + e.message);
    } finally {
      setRunningAll(false);
    }
  };

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <span className="card-title">🧪 14 Enterprise Architecture Scenarios</span>
          <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
            Execute security, DLP, prompt injection, tool authorization, rate limiting, and customer provisioning tests against Naagmani OS.
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          {summary && (
            <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--accent-green)" }}>
              {summary}
            </span>
          )}
          <button className="btn" onClick={runAll} disabled={runningAll}>
            {runningAll ? "⏳ Running Matrix..." : "🚀 Run All 14 Scenarios"}
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
        {scenarios.map((s) => {
          const res = results[s.id];
          let cardClass = "";
          let statusText = "Ready";
          let statusColor = "var(--text-muted)";

          if (loadingId === s.id) {
            statusText = "Running...";
            statusColor = "var(--accent-amber)";
          } else if (res) {
            if (res.passed) {
              cardClass = "passed";
              statusText = `✅ PASSED (Calls delta: ${res.provider_calls_count_delta ?? 1})`;
              statusColor = "var(--accent-green)";
            } else {
              cardClass = "failed";
              statusText = "❌ FAILED";
              statusColor = "var(--zomato-red)";
            }
          }

          return (
            <div key={s.id} className={`scenario-card ${cardClass}`}>
              <div>
                <div className="scenario-header">
                  <span className="scenario-title">#{s.number} {s.name}</span>
                  <span className="scenario-cat">{s.category}</span>
                </div>
                <p className="scenario-desc">{s.description}</p>
                <div className="scenario-io">
                  <div><strong>Input:</strong> &quot;{s.sampleInput}&quot;</div>
                  <div><strong>Expected:</strong> {s.expectedBehavior}</div>
                </div>
              </div>
              <div className="scenario-footer">
                <span style={{ fontSize: "0.8rem", fontWeight: 700, color: statusColor }}>
                  {statusText}
                </span>
                <button
                  className="btn btn-sm"
                  onClick={() => runSingle(s.id)}
                  disabled={loadingId === s.id || runningAll}
                >
                  Run Scenario
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
