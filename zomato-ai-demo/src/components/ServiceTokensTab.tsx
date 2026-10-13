"use client";

import React, { useState, useEffect } from "react";

interface ServiceToken {
  id: string;
  name: string;
  public_id?: string;
  masked_identifier?: string;
  environment_id?: string;
  capabilities: string[];
  status: string;
  expires_at?: string;
  last_used_at?: string;
}

interface ServiceTokensTabProps {
  onOpenCreateToken: () => void;
  onOpenRotateToken: (id: string, name: string) => void;
  onOpenRevokeToken: (id: string, name: string) => void;
}

export function ServiceTokensTab({
  onOpenCreateToken,
  onOpenRotateToken,
  onOpenRevokeToken,
}: ServiceTokensTabProps) {
  const [tokens, setTokens] = useState<ServiceToken[]>([]);
  const [config, setConfig] = useState<any>(null);
  const [matrixResults, setMatrixResults] = useState<any[]>([]);
  const [matrixSummary, setMatrixSummary] = useState<string | null>(null);
  const [matrixRunning, setMatrixRunning] = useState(false);

  // Console explorer state
  const [consoleOp, setConsoleOp] = useState("chat");
  const [consoleEndpoint, setConsoleEndpoint] = useState("POST /v1/chat/completions");
  const [consolePayload, setConsolePayload] = useState(
    JSON.stringify(
      {
        model: "mock/gpt-5-mini",
        messages: [{ role: "user", content: "Ping via Project Service Token" }],
      },
      null,
      2
    )
  );
  const [consoleOutput, setConsoleOutput] = useState("Ready. Click 'Execute Call' to invoke the endpoint.");
  const [consoleStatus, setConsoleStatus] = useState<number | null>(null);
  const [consoleLatency, setConsoleLatency] = useState<number | null>(null);
  const [consoleLoading, setConsoleLoading] = useState(false);

  const loadData = async () => {
    try {
      const [cfgRes, tokRes] = await Promise.all([
        fetch("/api/service-tokens/config"),
        fetch("/api/service-tokens"),
      ]);
      const cfg = await cfgRes.json();
      const tok = await tokRes.json();
      setConfig(cfg);
      setTokens(tok.service_tokens || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpChange = (op: string) => {
    setConsoleOp(op);
    if (op === "chat") {
      setConsoleEndpoint("POST /v1/chat/completions");
      setConsolePayload(
        JSON.stringify(
          {
            model: "mock/gpt-5-mini",
            messages: [{ role: "user", content: "Ping via Project Service Token" }],
          },
          null,
          2
        )
      );
    } else if (op === "models") {
      setConsoleEndpoint("GET /v1/models");
      setConsolePayload("");
    } else if (op === "provision_customer") {
      setConsoleEndpoint("POST /v1/services/tokens");
      setConsolePayload(
        JSON.stringify(
          {
            name: "Console Provisioned Customer",
            email: "console.user@example.com",
            tier: "prime",
            monthly_budget_usd: 25.0,
            requests_per_minute: 45,
            allowed_models: ["mock/gpt-5-mini"],
            create_welcome_order: true,
          },
          null,
          2
        )
      );
    } else if (op === "list") {
      setConsoleEndpoint("GET /v1/projects/{projectId}/service-tokens");
      setConsolePayload("");
    } else if (op === "create") {
      setConsoleEndpoint("POST /v1/projects/{projectId}/service-tokens");
      setConsolePayload(
        JSON.stringify(
          {
            name: "test-token-from-console",
            capabilities: ["models.read", "inference.execute"],
            expires_in_days: 30,
          },
          null,
          2
        )
      );
    } else if (op === "get") {
      setConsoleEndpoint("GET /v1/projects/{projectId}/service-tokens/{id}");
      setConsolePayload("");
    } else if (op === "rotate") {
      setConsoleEndpoint("POST /v1/projects/{projectId}/service-tokens/{id}/rotate");
      setConsolePayload(JSON.stringify({ grace_period_hours: 24 }, null, 2));
    } else if (op === "revoke") {
      setConsoleEndpoint("DELETE /v1/projects/{projectId}/service-tokens/{id}");
      setConsolePayload("");
    }
  };

  const handleExecuteConsole = async () => {
    setConsoleLoading(true);
    setConsoleOutput("Executing request...");
    let parsedPayload: any = null;
    if (consolePayload.trim()) {
      try {
        parsedPayload = JSON.parse(consolePayload.trim());
      } catch (e: any) {
        alert("Invalid JSON: " + e.message);
        setConsoleLoading(false);
        return;
      }
    }

    try {
      const res = await fetch("/api/service-tokens/console", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operation: consoleOp, payload: parsedPayload }),
      });
      const data = await res.json();
      setConsoleStatus(data.response_status);
      setConsoleLatency(data.duration_ms);
      setConsoleOutput(JSON.stringify(data.response_body, null, 2));
    } catch (e: any) {
      setConsoleOutput("Network Error: " + e.message);
    } finally {
      setConsoleLoading(false);
    }
  };

  const runFullMatrix = async () => {
    setMatrixRunning(true);
    setMatrixSummary("⏳ Executing 10-scenario authentication & resource isolation matrix...");
    try {
      const res = await fetch("/api/service-tokens/run-matrix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      setMatrixResults(data.results || []);
      setMatrixSummary(
        `🎉 Matrix Complete: ${data.passed} of ${data.total} Scenarios Passed! (${data.failed} Failed)`
      );
    } catch (e: any) {
      setMatrixSummary("Error: " + e.message);
    } finally {
      setMatrixRunning(false);
    }
  };

  return (
    <div>
      {/* 1. Configuration & Security Banner */}
      <div
        className="card"
        style={{
          borderLeft: "4px solid var(--accent-blue)",
          background: "linear-gradient(180deg, rgba(59, 130, 246, 0.05) 0%, var(--bg-card) 100%)",
        }}
      >
        <div className="card-header" style={{ borderBottom: "none", paddingBottom: 0 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <span className="card-title" style={{ fontSize: "1.25rem" }}>
                🔑 Project Service Token Management
              </span>
              <span className="badge badge-delivered">B2B SECURE ENCLAVE</span>
            </div>
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "0.35rem" }}>
              Machine principals for automated server-to-server operations. Enforces resource isolation across project and environment boundaries.
            </p>
          </div>
          <button className="btn" onClick={onOpenCreateToken}>
            ➕ Create Service Token
          </button>
        </div>

        <div
          style={{
            display: "flex",
            gap: "1.5rem",
            marginTop: "1rem",
            flexWrap: "wrap",
            background: "var(--bg-card-subtle)",
            padding: "0.75rem 1rem",
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--border-color)",
            fontSize: "0.8rem",
          }}
        >
          <div>
            <strong style={{ color: "var(--text-muted)" }}>OS Gateway:</strong>{" "}
            <span className="code-pill">{config?.os_url || "http://localhost:8080"}</span>
          </div>
          <div>
            <strong style={{ color: "var(--text-muted)" }}>Cloud Control Plane:</strong>{" "}
            <span className="code-pill">{config?.cloud_url || "http://localhost:8081"}</span>
          </div>
          <div>
            <strong style={{ color: "var(--text-muted)" }}>Active Credential:</strong>{" "}
            <span className="code-pill" style={{ color: "#34D399" }}>
              {config?.active_service_token || "Default Master Token"}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Token Directory Table */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">📋 Active Service Tokens</span>
          <button className="btn btn-outline btn-sm" onClick={loadData}>
            🔄 Refresh
          </button>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table className="token-table">
            <thead>
              <tr>
                <th>Token Name / ID</th>
                <th>Masked Identifier</th>
                <th>Environment</th>
                <th>Capabilities</th>
                <th>Status</th>
                <th>Expires</th>
                <th>Last Used</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tokens.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", color: "var(--text-muted)", padding: "2rem" }}>
                    No tokens found. Click &quot;Create Service Token&quot; to generate one.
                  </td>
                </tr>
              ) : (
                tokens.map((t) => {
                  let badgeClass = "badge-active";
                  if (t.status === "expiring") badgeClass = "badge-expiring";
                  if (t.status === "revoked") badgeClass = "badge-revoked";
                  if (t.status === "expired") badgeClass = "badge-expired";

                  return (
                    <tr key={t.id}>
                      <td>
                        <div style={{ fontWeight: 700, color: "white" }}>{t.name}</div>
                        <span className="code-pill">{t.public_id || t.id.substring(0, 8)}</span>
                      </td>
                      <td>
                        <span style={{ fontFamily: "monospace", fontSize: "0.8rem", color: "#94A3B8" }}>
                          {t.masked_identifier || "nm_st_****"}
                        </span>
                      </td>
                      <td>
                        <span className="code-pill" style={{ color: "#FBBF24" }}>
                          {t.environment_id ? `${t.environment_id.substring(0, 8)}...` : "default"}
                        </span>
                      </td>
                      <td style={{ maxWidth: "200px" }}>
                        {(t.capabilities || []).map((c, i) => (
                          <span key={i} className="cap-chip">{c}</span>
                        ))}
                      </td>
                      <td>
                        <span className={`badge ${badgeClass}`}>{t.status.toUpperCase()}</span>
                      </td>
                      <td style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>
                        {t.expires_at ? new Date(t.expires_at).toLocaleDateString() : "Never"}
                      </td>
                      <td style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>
                        {t.last_used_at ? new Date(t.last_used_at).toLocaleTimeString() : "Never"}
                      </td>
                      <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                        {t.status === "active" || t.status === "expiring" ? (
                          <>
                            <button
                              className="btn btn-outline btn-sm"
                              onClick={() => onOpenRotateToken(t.id, t.name)}
                            >
                              🔄 Rotate
                            </button>
                            <button
                              className="btn btn-outline btn-sm"
                              style={{ borderColor: "rgba(226, 55, 68, 0.4)", color: "#FFA4A4", marginLeft: "0.25rem" }}
                              onClick={() => onOpenRevokeToken(t.id, t.name)}
                            >
                              ❌ Revoke
                            </button>
                          </>
                        ) : (
                          <span style={{ color: "var(--text-dim)", fontSize: "0.75rem" }}>Inactive</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Matrix Test Runner */}
      <div className="card">
        <div className="card-header">
          <div>
            <span className="card-title">🧪 10-Point Authentication & Security Matrix</span>
            <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
              Verifies valid tokens, cross-project isolation, environment boundary defense, and cryptographic rejection.
            </p>
          </div>
          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
            {matrixSummary && (
              <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--accent-green)" }}>
                {matrixSummary}
              </span>
            )}
            <button className="btn" onClick={runFullMatrix} disabled={matrixRunning}>
              {matrixRunning ? "⏳ Running..." : "🚀 Run Complete Matrix"}
            </button>
          </div>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table className="token-table">
            <thead>
              <tr>
                <th>Test Scenario</th>
                <th>Target Endpoint</th>
                <th>Expected Result</th>
                <th>Actual Status</th>
                <th>Latency</th>
                <th>Result</th>
              </tr>
            </thead>
            <tbody>
              {matrixResults.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", color: "var(--text-muted)", padding: "1.5rem" }}>
                    Click &quot;Run Complete Matrix&quot; to execute end-to-end authentication tests.
                  </td>
                </tr>
              ) : (
                matrixResults.map((r, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600, color: "white" }}>{r.name}</td>
                    <td><span className="code-pill">{r.method} {r.endpoint}</span></td>
                    <td style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>{r.expected}</td>
                    <td style={{ fontWeight: 700, color: r.http_status === 200 || r.http_status === 201 ? "var(--accent-green)" : "var(--accent-amber)" }}>
                      HTTP {r.http_status}
                    </td>
                    <td style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>{r.duration_ms} ms</td>
                    <td>
                      {r.status === "PASS" ? (
                        <span className="badge badge-delivered">PASS</span>
                      ) : (
                        <span className="badge badge-cancelled">FAIL</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Interactive Developer API Explorer */}
      <div className="card">
        <div className="card-header">
          <div>
            <span className="card-title">💻 Project Service Token API Explorer & Console</span>
            <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
              Test specific endpoints with custom parameters, masked headers, and real latency telemetry.
            </p>
          </div>
          <button className="btn" onClick={handleExecuteConsole} disabled={consoleLoading}>
            {consoleLoading ? "⏳ Executing..." : "🚀 Execute Call"}
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div className="form-group">
              <label>API Operation</label>
              <select value={consoleOp} onChange={(e) => handleOpChange(e.target.value)}>
                <option value="chat">POST /v1/chat/completions (Inference with Service Token)</option>
                <option value="models">GET /v1/models (Model Discovery with Service Token)</option>
                <option value="provision_customer">POST /v1/services/tokens (Provision Customer Member & Child API Key)</option>
                <option value="list">GET /v1/projects/{'{id}'}/service-tokens (List Tokens)</option>
                <option value="create">POST /v1/projects/{'{id}'}/service-tokens (Create Token)</option>
                <option value="get">GET /v1/projects/{'{id}'}/service-tokens/{'{id}'} (Get Token Details)</option>
                <option value="rotate">POST /v1/projects/{'{id}'}/service-tokens/{'{id}'}/rotate (Rotate Token)</option>
                <option value="revoke">DELETE /v1/projects/{'{id}'}/service-tokens/{'{id}'} (Revoke Token)</option>
              </select>
            </div>

            <div className="form-group">
              <label>HTTP Endpoint & Method</label>
              <input
                type="text"
                readOnly
                value={consoleEndpoint}
                style={{ background: "var(--bg-card-subtle)", color: "#93C5FD", fontFamily: "monospace" }}
              />
            </div>

            <div className="form-group">
              <label>Request Payload (JSON)</label>
              <textarea
                rows={6}
                value={consolePayload}
                onChange={(e) => setConsolePayload(e.target.value)}
                style={{ fontFamily: "monospace", fontSize: "0.8rem" }}
              />
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontWeight: 700, fontSize: "0.85rem" }}>Response Output</span>
              {consoleStatus && (
                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                  <span
                    className="status-pill"
                    style={{
                      color: consoleStatus >= 200 && consoleStatus < 300 ? "var(--accent-green)" : "var(--zomato-red)",
                    }}
                  >
                    HTTP {consoleStatus}
                  </span>
                  {consoleLatency && (
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                      Latency: {consoleLatency} ms
                    </span>
                  )}
                </div>
              )}
            </div>

            <pre className="code-display" style={{ minHeight: "320px", color: "#34D399" }}>
              {consoleOutput}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
