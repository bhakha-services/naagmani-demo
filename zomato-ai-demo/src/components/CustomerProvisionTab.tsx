"use client";

import React, { useState } from "react";

interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  city?: string;
  tier?: string;
  member_id?: string;
  key_id?: string;
  key_prefix?: string;
  masked_identifier?: string;
  monthly_budget_usd?: number;
  requests_per_minute?: number;
  status?: string;
  provisioned_by_service_token?: string;
}

interface CustomerProvisionTabProps {
  customers: Customer[];
  activeCustomer: string;
  onSelectCustomer: (id: string, targetTab?: string) => void;
  onRefreshCustomers: () => void;
  masterTokenString?: string;
}

export function CustomerProvisionTab({
  customers,
  activeCustomer,
  onSelectCustomer,
  onRefreshCustomers,
  masterTokenString = "nm_st_A72SYP31NG_****...95f2",
}: CustomerProvisionTabProps) {
  const [name, setName] = useState("Vikrant Singhania");
  const [email, setEmail] = useState("vikrant.singhania@example.com");
  const [phone, setPhone] = useState("+91-9876543299");
  const [city, setCity] = useState("Bengaluru");
  const [tier, setTier] = useState("prime");
  const [budget, setBudget] = useState("35.00");
  const [rpm, setRpm] = useState(60);
  const [welcomeOrder, setWelcomeOrder] = useState(true);
  const [loading, setLoading] = useState(false);

  // Minted result inspector
  const [provisionResult, setProvisionResult] = useState<any>(null);
  const [telemetry, setTelemetry] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  const applyPreset = (
    presetTier: string,
    presetBudget: number,
    presetRpm: number,
    presetName: string,
    presetEmail: string,
    presetCity: string
  ) => {
    setTier(presetTier);
    setBudget(presetBudget.toFixed(2));
    setRpm(presetRpm);
    setName(presetName);
    setEmail(presetEmail);
    setCity(presetCity);
  };

  const handleProvision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert("Customer name is required");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/customers/provision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          city: city.trim(),
          tier,
          monthly_budget_usd: parseFloat(budget) || 35.0,
          requests_per_minute: rpm,
          allowed_models: ["mock/gpt-5-mini", "gpt-4o"],
          create_welcome_order: welcomeOrder,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Provisioning failed");
      }

      setProvisionResult(data);
      setTelemetry({
        requests: 0,
        tokens: 0,
        spent: 0,
        budget: data.provision_result?.monthly_budget_usd || parseFloat(budget),
      });

      onRefreshCustomers();
      onSelectCustomer(data.customer.id);
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyKey = () => {
    if (!provisionResult?.provision_result?.api_key) return;
    navigator.clipboard.writeText(provisionResult.provision_result.api_key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const refreshUsage = async (customerId?: string) => {
    const targetId = customerId || provisionResult?.customer?.id;
    if (!targetId) return;
    try {
      const res = await fetch(`/api/customers/${targetId}/token-usage`);
      const usage = await res.json();
      if (usage.total_requests !== undefined) {
        setTelemetry({
          requests: usage.total_requests,
          tokens: usage.total_tokens,
          spent: usage.current_spend_usd,
          budget: usage.monthly_budget_usd,
        });
      }
    } catch (e: any) {
      console.error("Usage refresh error", e);
    }
  };

  const handleRevoke = async (id: string, custName?: string) => {
    if (!confirm(`Revoke child API key for ${custName || id}?`)) return;
    try {
      const res = await fetch(`/api/customers/${id}/token`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        onRefreshCustomers();
        if (provisionResult?.customer?.id === id) {
          setProvisionResult((prev: any) => ({
            ...prev,
            customer: { ...prev.customer, status: "revoked" },
          }));
        }
        alert("Child token successfully revoked.");
      }
    } catch (err: any) {
      alert("Revoke failed: " + err.message);
    }
  };

  return (
    <div>
      {/* 1. Master Service Token Architectural Context Banner */}
      <div
        className="card"
        style={{
          borderLeft: "4px solid var(--accent-green)",
          background: "linear-gradient(180deg, rgba(16, 185, 129, 0.05) 0%, var(--bg-card) 100%)",
        }}
      >
        <div className="card-header" style={{ borderBottom: "none", paddingBottom: 0 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <span className="card-title" style={{ fontSize: "1.25rem" }}>
                👥 B2B Partner Customer Provisioning
              </span>
              <span
                className="badge"
                style={{
                  background: "rgba(16, 185, 129, 0.15)",
                  color: "var(--accent-green)",
                  border: "1px solid rgba(16, 185, 129, 0.3)",
                }}
              >
                MASTER SERVICE TOKEN ACTIVE
              </span>
            </div>
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "0.35rem" }}>
              As a B2B partner application (Zomato), authenticate using a Master Service Token (<span className="code-pill">nm_st_...</span>) with capability <span className="code-pill" style={{ color: "#34D399" }}>services.tokens.create</span> to dynamically provision end-user customer identities.
              Naagmani OS mints a dedicated Child API Key (<span className="code-pill">nm_live_...</span>) with hard monthly FinOps budget ceilings, RPM limits, and model whitelisting.
            </p>
          </div>
          <button className="btn btn-outline btn-sm" onClick={onRefreshCustomers}>
            🔄 Refresh Directory
          </button>
        </div>

        <div
          style={{
            display: "flex",
            gap: "1rem",
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
            <strong style={{ color: "var(--text-muted)" }}>Master Token:</strong>{" "}
            <span className="code-pill" style={{ color: "#34D399" }}>{masterTokenString}</span>
          </div>
          <div>
            <strong style={{ color: "var(--text-muted)" }}>Capability:</strong>{" "}
            <span className="code-pill" style={{ color: "#60A5FA" }}>services.tokens.create</span>
          </div>
          <div>
            <strong style={{ color: "var(--text-muted)" }}>Target Gateway:</strong>{" "}
            <span className="code-pill">POST /v1/services/tokens</span>
          </div>
          <div>
            <strong style={{ color: "var(--text-muted)" }}>Isolation:</strong>{" "}
            <span className="badge badge-delivered" style={{ fontSize: "0.7rem" }}>Zero-Trust Child Enclave</span>
          </div>
        </div>
      </div>

      {/* 2. Two-Column Provisioning & Telemetry Interface */}
      <div className="grid-2">
        {/* Left: Provisioning Form */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">➕ Provision Customer Member</span>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>POST /v1/services/tokens</span>
          </div>

          <form onSubmit={handleProvision} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div
              style={{
                background: "var(--bg-card-subtle)",
                padding: "0.65rem 0.85rem",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border-color)",
              }}
            >
              <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", display: "block", marginBottom: "0.4rem" }}>
                ⚡ QUICK BUDGET PRESETS
              </span>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => applyPreset("prime", 35, 60, "Vikrant Singhania", "vikrant.singhania@example.com", "Bengaluru")}
                  style={{ fontSize: "0.75rem", padding: "0.25rem 0.6rem" }}
                >
                  👑 VIP Prime ($35/mo, 60 RPM)
                </button>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => applyPreset("gold", 20, 30, "Kavita Rao", "kavita.rao@example.com", "Mumbai")}
                  style={{ fontSize: "0.75rem", padding: "0.25rem 0.6rem" }}
                >
                  🥇 Gold ($20/mo, 30 RPM)
                </button>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => applyPreset("standard", 5, 15, "Rohan Mehta", "rohan.mehta@example.com", "Delhi NCR")}
                  style={{ fontSize: "0.75rem", padding: "0.25rem 0.6rem" }}
                >
                  🚀 Trial ($5/mo, 15 RPM)
                </button>
              </div>
            </div>

            <div className="form-group">
              <label>Customer Full Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              <div className="form-group">
                <label>Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Phone Number</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              <div className="form-group">
                <label>Delivery City</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Membership Tier</label>
                <select value={tier} onChange={(e) => setTier(e.target.value)}>
                  <option value="prime">Prime VIP (Priority Routing)</option>
                  <option value="gold">Gold Member (Standard Routing)</option>
                  <option value="standard">Standard Member</option>
                </select>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              <div className="form-group">
                <label>Monthly FinOps Budget (USD) *</label>
                <input
                  type="number"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  step="1"
                  min="1"
                  max="500"
                  required
                />
              </div>
              <div className="form-group">
                <label>Rate Limit (RPM) *</label>
                <input
                  type="number"
                  value={rpm}
                  onChange={(e) => setRpm(parseInt(e.target.value, 10))}
                  min="5"
                  max="300"
                  required
                />
              </div>
            </div>

            <div
              style={{
                background: "var(--bg-card-subtle)",
                padding: "0.65rem 0.85rem",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border-color)",
              }}
            >
              <label className="checkbox-label" style={{ fontWeight: 600, fontSize: "0.85rem" }}>
                <input
                  type="checkbox"
                  checked={welcomeOrder}
                  onChange={(e) => setWelcomeOrder(e.target.checked)}
                />
                <span>🍕 Create active food delivery order (Farmhouse Deluxe) for instant testing</span>
              </label>
            </div>

            <button
              type="submit"
              className="btn"
              disabled={loading}
              style={{
                padding: "0.75rem 1rem",
                fontSize: "0.95rem",
                fontWeight: 700,
                background: "linear-gradient(135deg, #10B981, #059669)",
              }}
            >
              {loading ? "⏳ Provisioning via Master Service Token..." : "🚀 Provision Customer via Master Service Token"}
            </button>
          </form>
        </div>

        {/* Right: Minted Child Key & Telemetry Inspector */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">🔑 Minted Child Token & FinOps Telemetry</span>
            {provisionResult && (
              <span className="status-pill" style={{ background: "rgba(16, 185, 129, 0.15)", color: "var(--accent-green)" }}>
                PROVISIONED & ACTIVE
              </span>
            )}
          </div>

          {!provisionResult ? (
            <div style={{ textAlign: "center", padding: "3rem 1.5rem", color: "var(--text-muted)" }}>
              <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🛡️</div>
              <h4 style={{ color: "white", marginBottom: "0.5rem", fontWeight: 700 }}>
                No Child Token Provisioned Yet
              </h4>
              <p style={{ fontSize: "0.85rem", lineHeight: 1.5, maxWidth: "380px", margin: "0 auto" }}>
                Click "Provision Customer" to call Naagmani OS <span className="code-pill">POST /v1/services/tokens</span>. The generated Child API key and canonical member identity will appear here in real time.
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div className="secret-box" style={{ marginBottom: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 700 }}>
                    CHILD LIVE API KEY (SHOWN ONCE)
                  </span>
                  <span className="code-pill" style={{ fontSize: "0.7rem", color: "#34D399" }}>Prefix: nm_live_</span>
                </div>
                <div className="secret-val" style={{ fontSize: "0.82rem" }}>
                  {provisionResult.provision_result?.api_key || "nm_live_****"}
                </div>
                <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                  <button className="btn btn-outline btn-sm" onClick={handleCopyKey}>
                    {copied ? "✅ Copied!" : "📋 Copy Secret"}
                  </button>
                  <button
                    className="btn btn-sm"
                    style={{ background: "var(--zomato-red)" }}
                    onClick={() => onSelectCustomer(provisionResult.customer.id, "assistant")}
                  >
                    💬 Test AI Chat Now
                  </button>
                </div>
              </div>

              <div
                style={{
                  background: "var(--bg-card-subtle)",
                  padding: "0.85rem",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--border-color)",
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "0.5rem",
                  fontSize: "0.8rem",
                }}
              >
                <div><strong style={{ color: "var(--text-muted)" }}>Customer:</strong> <span style={{ color: "white", fontWeight: 700 }}>{provisionResult.customer.name}</span></div>
                <div><strong style={{ color: "var(--text-muted)" }}>External ID:</strong> <span className="code-pill">{provisionResult.customer.id}</span></div>
                <div><strong style={{ color: "var(--text-muted)" }}>Member ID:</strong> <span className="code-pill" style={{ color: "#93C5FD" }}>{provisionResult.provision_result?.member_id?.substring(0, 16)}...</span></div>
                <div><strong style={{ color: "var(--text-muted)" }}>Key ID:</strong> <span className="code-pill">{provisionResult.provision_result?.id?.substring(0, 14)}...</span></div>
                <div><strong style={{ color: "var(--text-muted)" }}>Allocated Budget:</strong> <span style={{ color: "var(--accent-green)", fontWeight: 700 }}>${(provisionResult.provision_result?.monthly_budget_usd || 35).toFixed(2)} USD</span></div>
                <div><strong style={{ color: "var(--text-muted)" }}>RPM Limit:</strong> <span style={{ color: "#FBBF24", fontWeight: 700 }}>{provisionResult.provision_result?.requests_per_minute || 60} RPM</span></div>
              </div>

              {/* FinOps Ledger Card */}
              <div
                style={{
                  background: "var(--bg-card-subtle)",
                  padding: "1rem",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--border-color)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                  <span style={{ fontWeight: 700, fontSize: "0.85rem" }}>📊 FinOps Spend & Quota Ledger</span>
                  <button className="btn btn-outline btn-sm" onClick={() => refreshUsage()} style={{ padding: "0.2rem 0.5rem", fontSize: "0.72rem" }}>
                    🔄 Refresh Ledger
                  </button>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.5rem", textAlign: "center" }}>
                  <div style={{ background: "var(--bg-main)", padding: "0.5rem", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)" }}>
                    <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Metered Calls</div>
                    <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "white" }}>{telemetry?.requests || 0}</div>
                  </div>
                  <div style={{ background: "var(--bg-main)", padding: "0.5rem", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)" }}>
                    <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Tokens Used</div>
                    <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "#60A5FA" }}>{telemetry?.tokens || 0}</div>
                  </div>
                  <div style={{ background: "var(--bg-main)", padding: "0.5rem", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)" }}>
                    <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Current Spend</div>
                    <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--accent-amber)" }}>${(telemetry?.spent || 0).toFixed(4)}</div>
                  </div>
                  <div style={{ background: "var(--bg-main)", padding: "0.5rem", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)" }}>
                    <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Remaining</div>
                    <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--accent-green)" }}>${(telemetry?.budget || 35).toFixed(2)}</div>
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                <button
                  className="btn btn-outline btn-sm"
                  onClick={() => onSelectCustomer(provisionResult.customer.id, "orders")}
                >
                  🛵 View Active Delivery Order
                </button>
                <button
                  className="btn btn-outline btn-sm"
                  style={{ borderColor: "rgba(226, 55, 68, 0.4)", color: "#FFA4A4" }}
                  onClick={() => handleRevoke(provisionResult.customer.id, provisionResult.customer.name)}
                >
                  🚫 Revoke Child Token
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3. Customer Directory & Minted Token Catalog */}
      <div className="card" style={{ marginTop: "1.5rem" }}>
        <div className="card-header">
          <div>
            <span className="card-title">📋 Active Customer Directory & Provisioned Token Ledger</span>
            <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
              All registered Zomato customers. Customers provisioned via Master Service Token show their minted child API key, Member ID, and allocated budget.
            </p>
          </div>
          <button className="btn btn-outline btn-sm" onClick={onRefreshCustomers}>
            🔄 Refresh
          </button>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table className="token-table">
            <thead>
              <tr>
                <th>Customer / ID</th>
                <th>Tier / City</th>
                <th>Service Token Status</th>
                <th>Canonical Member ID</th>
                <th>FinOps Budget</th>
                <th>RPM Limit</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => {
                const isProvisioned = Boolean(c.key_id || c.provisioned_by_service_token);
                const isCurrent = c.id === activeCustomer;

                return (
                  <tr key={c.id} style={{ background: isCurrent ? "rgba(226, 55, 68, 0.05)" : undefined }}>
                    <td>
                      <div style={{ fontWeight: 700, color: "white", display: "flex", alignItems: "center", gap: "0.35rem" }}>
                        {c.name}
                        {isCurrent && (
                          <span className="badge" style={{ background: "var(--zomato-red)", color: "white", fontSize: "0.65rem", padding: "0.1rem 0.35rem" }}>
                            ACTIVE
                          </span>
                        )}
                      </div>
                      <span className="code-pill" style={{ fontSize: "0.72rem" }}>{c.id}</span>
                    </td>
                    <td>
                      <div style={{ textTransform: "capitalize", fontWeight: 600 }}>{c.tier || "standard"}</div>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{c.city || "Bengaluru"}</span>
                    </td>
                    <td>
                      {isProvisioned ? (
                        <span className="code-pill" style={{ color: "#34D399", fontWeight: 700 }}>
                          {c.masked_identifier || (c.key_prefix ? `${c.key_prefix}...` : "nm_live_****")}
                        </span>
                      ) : (
                        <span style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>Legacy Key</span>
                      )}
                    </td>
                    <td>
                      {c.member_id ? (
                        <span className="code-pill" style={{ fontSize: "0.72rem", color: "#93C5FD" }}>
                          {c.member_id.substring(0, 13)}...
                        </span>
                      ) : (
                        <span style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>--</span>
                      )}
                    </td>
                    <td>
                      {c.monthly_budget_usd !== undefined ? (
                        <span style={{ color: "var(--accent-green)", fontWeight: 700 }}>
                          ${Number(c.monthly_budget_usd).toFixed(2)}/mo
                        </span>
                      ) : (
                        <span style={{ color: "var(--text-dim)" }}>$10.00</span>
                      )}
                    </td>
                    <td>
                      {c.requests_per_minute !== undefined ? (
                        <span style={{ color: "#FBBF24", fontWeight: 700 }}>{c.requests_per_minute} RPM</span>
                      ) : (
                        <span style={{ color: "var(--text-dim)" }}>30 RPM</span>
                      )}
                    </td>
                    <td>
                      {c.status === "revoked" ? (
                        <span className="badge badge-cancelled">REVOKED</span>
                      ) : isProvisioned ? (
                        <span className="badge badge-delivered">ACTIVE</span>
                      ) : (
                        <span className="badge" style={{ background: "rgba(148,163,184,0.15)", color: "#94A3B8" }}>
                          DEFAULT
                        </span>
                      )}
                    </td>
                    <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                      <button
                        className="btn btn-outline btn-sm"
                        onClick={() => onSelectCustomer(c.id, "assistant")}
                        style={{ fontSize: "0.75rem", padding: "0.25rem 0.5rem" }}
                        title="Switch and chat"
                      >
                        💬 Chat
                      </button>
                      {isProvisioned && c.status !== "revoked" && (
                        <>
                          <button
                            className="btn btn-outline btn-sm"
                            onClick={() => refreshUsage(c.id)}
                            style={{ fontSize: "0.75rem", padding: "0.25rem 0.5rem", borderColor: "rgba(59, 130, 246, 0.4)", color: "#93C5FD", marginLeft: "0.25rem" }}
                            title="View FinOps Usage"
                          >
                            📊 Spend
                          </button>
                          <button
                            className="btn btn-outline btn-sm"
                            onClick={() => handleRevoke(c.id, c.name)}
                            style={{ fontSize: "0.75rem", padding: "0.25rem 0.5rem", borderColor: "rgba(226, 55, 68, 0.4)", color: "#FFA4A4", marginLeft: "0.25rem" }}
                            title="Revoke Token"
                          >
                            ❌
                          </button>
                        </>
                      )}
                      {!isCurrent && (
                        <button
                          className="btn btn-sm"
                          onClick={() => onSelectCustomer(c.id)}
                          style={{ fontSize: "0.75rem", padding: "0.25rem 0.5rem", marginLeft: "0.25rem" }}
                        >
                          Select
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
