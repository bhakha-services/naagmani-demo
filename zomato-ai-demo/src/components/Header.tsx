"use client";

import React from "react";

interface HeaderProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  customers: Array<{ id: string; name: string; tier?: string; key_id?: string }>;
  activeCustomer: string;
  onCustomerChange: (id: string) => void;
  onOpenAddCustomerModal: () => void;
  osStatus: { connected: boolean; version: string };
}

export function Header({
  activeTab,
  onTabChange,
  customers,
  activeCustomer,
  onCustomerChange,
  onOpenAddCustomerModal,
  osStatus,
}: HeaderProps) {
  return (
    <header>
      <a href="#" className="brand">
        <span className="brand-logo">zomato</span>
        <span className="brand-sub">AI Food Delivery Demo</span>
      </a>

      <div className="nav-tabs">
        <button
          className={`nav-tab ${activeTab === "orders" ? "active" : ""}`}
          onClick={() => onTabChange("orders")}
        >
          Orders & Tracking
        </button>
        <button
          className={`nav-tab ${activeTab === "assistant" ? "active" : ""}`}
          onClick={() => onTabChange("assistant")}
        >
          AI Delivery Assistant
        </button>
        <button
          className={`nav-tab ${activeTab === "scenarios" ? "active" : ""}`}
          onClick={() => onTabChange("scenarios")}
        >
          14 Test Scenarios (/demo)
        </button>
        <button
          className={`nav-tab ${activeTab === "telemetry" ? "active" : ""}`}
          onClick={() => onTabChange("telemetry")}
        >
          Naagmani Architecture
        </button>
        <button
          className={`nav-tab ${activeTab === "tokens" ? "active" : ""}`}
          onClick={() => onTabChange("tokens")}
        >
          🔑 Project Service Tokens
        </button>
        <button
          className={`nav-tab ${activeTab === "provision" ? "active" : ""}`}
          onClick={() => onTabChange("provision")}
        >
          👥 Customer Provisioning (B2B)
        </button>
      </div>

      <div className="header-actions">
        <div className="customer-selector">
          <span>👤 User:</span>
          <select
            value={activeCustomer}
            onChange={(e) => onCustomerChange(e.target.value)}
          >
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({(c.tier || "standard").toUpperCase()}{c.key_id ? " 🔑" : ""})
              </option>
            ))}
          </select>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={onOpenAddCustomerModal}
            style={{
              padding: "0.2rem 0.6rem",
              fontSize: "0.72rem",
              borderColor: "var(--accent-green)",
              color: "var(--accent-green)",
              whiteSpace: "nowrap",
              fontWeight: 700,
            }}
            title="Add and provision new customer with Service Token"
          >
            ➕ Add Customer
          </button>
        </div>

        <div
          className="status-pill"
          style={{
            background: osStatus.connected ? "rgba(16, 185, 129, 0.15)" : "rgba(226, 55, 68, 0.15)",
            color: osStatus.connected ? "var(--accent-green)" : "var(--zomato-red)",
            borderColor: osStatus.connected ? "rgba(16, 185, 129, 0.3)" : "rgba(226, 55, 68, 0.3)",
          }}
        >
          <span className="status-dot"></span>
          <span>
            {osStatus.connected
              ? `Naagmani OS (v${osStatus.version}): Connected`
              : "Naagmani OS: Offline"}
          </span>
        </div>
      </div>
    </header>
  );
}
