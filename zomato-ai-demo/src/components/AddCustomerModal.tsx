"use client";

import React, { useState } from "react";

interface AddCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (data: any) => void;
}

export function AddCustomerModal({ isOpen, onClose, onSuccess }: AddCustomerModalProps) {
  const [name, setName] = useState("Vikrant Singhania");
  const [email, setEmail] = useState("vikrant@example.com");
  const [city, setCity] = useState("Bengaluru");
  const [tier, setTier] = useState("prime");
  const [budget, setBudget] = useState("35.00");
  const [welcomeOrder, setWelcomeOrder] = useState(true);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const applyPreset = (presetTier: string, presetBudget: number, presetName: string, presetEmail: string, presetCity: string) => {
    setTier(presetTier);
    setBudget(presetBudget.toFixed(2));
    setName(presetName);
    setEmail(presetEmail);
    setCity(presetCity);
  };

  const handleSubmit = async (e: React.FormEvent) => {
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
          city: city.trim(),
          tier,
          monthly_budget_usd: parseFloat(budget) || 35.0,
          requests_per_minute: tier === "prime" ? 60 : (tier === "gold" ? 30 : 15),
          allowed_models: ["mock/gpt-5-mini", "gpt-4o"],
          create_welcome_order: welcomeOrder,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Provisioning failed");
      }

      onSuccess(data);
      onClose();
    } catch (err: any) {
      alert("Error provisioning customer: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay active">
      <div className="modal-box" style={{ maxWidth: "600px" }}>
        <div className="modal-header" style={{ background: "rgba(16, 185, 129, 0.08)", borderBottomColor: "rgba(16, 185, 129, 0.3)" }}>
          <span className="card-title" style={{ color: "var(--accent-green)" }}>
            👥 Add Customer via Master Service Token
          </span>
          <button className="btn btn-outline btn-sm" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", lineHeight: 1.4 }}>
              Instantly provisions a new end-user customer on Naagmani OS via your B2B Master Service Token (<span className="code-pill">nm_st_...</span>). Mints an isolated child API key (<span className="code-pill">nm_live_...</span>) with hard FinOps budget and rate limits.
            </p>

            <div style={{ background: "var(--bg-card-subtle)", padding: "0.65rem 0.85rem", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)" }}>
              <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-muted)", display: "block", marginBottom: "0.4rem" }}>
                ⚡ QUICK PRESETS
              </span>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => applyPreset("prime", 35, "Vikrant Singhania", "vikrant@example.com", "Bengaluru")}
                  style={{ fontSize: "0.75rem", padding: "0.2rem 0.5rem" }}
                >
                  👑 VIP Prime ($35/mo)
                </button>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => applyPreset("gold", 20, "Kavita Rao", "kavita@example.com", "Mumbai")}
                  style={{ fontSize: "0.75rem", padding: "0.2rem 0.5rem" }}
                >
                  🥇 Gold ($20/mo)
                </button>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => applyPreset("standard", 5, "Rohan Mehta", "rohan@example.com", "Delhi NCR")}
                  style={{ fontSize: "0.75rem", padding: "0.2rem 0.5rem" }}
                >
                  🚀 Trial ($5/mo)
                </button>
              </div>
            </div>

            <div className="form-group">
              <label>Customer Full Name *</label>
              <input
                type="text"
                placeholder="e.g. Vikrant Singhania"
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
                  placeholder="vikrant@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>City</label>
                <input
                  type="text"
                  placeholder="Bengaluru"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              <div className="form-group">
                <label>Membership Tier</label>
                <select value={tier} onChange={(e) => setTier(e.target.value)}>
                  <option value="prime">Prime VIP (Priority Routing)</option>
                  <option value="gold">Gold Member (Standard Routing)</option>
                  <option value="standard">Standard Member</option>
                </select>
              </div>
              <div className="form-group">
                <label>Monthly FinOps Budget (USD) *</label>
                <input
                  type="number"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  min="1"
                  max="500"
                  step="1"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="checkbox-label" style={{ fontSize: "0.82rem", fontWeight: 600 }}>
                <input
                  type="checkbox"
                  checked={welcomeOrder}
                  onChange={(e) => setWelcomeOrder(e.target.checked)}
                />
                <span>🍕 Create active pizza delivery order (Farmhouse Deluxe) for instant testing</span>
              </label>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-outline" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn"
              disabled={loading}
              style={{ background: "linear-gradient(135deg, #10B981, #059669)", fontWeight: 700 }}
            >
              {loading ? "⏳ Provisioning via Service Token..." : "🚀 Provision Customer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
