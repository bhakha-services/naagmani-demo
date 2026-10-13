"use client";

import React, { useState } from "react";

interface OneTimeSecretModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  secret: string;
  prefix?: string;
  name?: string;
  publicId?: string;
  onUseInDemo?: () => void;
}

export function OneTimeSecretModal({
  isOpen,
  onClose,
  title,
  secret,
  prefix = "nm_live_",
  name,
  publicId,
  onUseInDemo,
}: OneTimeSecretModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="modal-overlay active">
      <div className="modal-box" style={{ maxWidth: "650px" }}>
        <div
          className="modal-header"
          style={{ background: "rgba(16, 185, 129, 0.1)", borderBottomColor: "rgba(16, 185, 129, 0.3)" }}
        >
          <span className="card-title" style={{ color: "var(--accent-green)" }}>
            {title || "🎉 Token Provisioned Successfully"}
          </span>
          <button className="btn btn-outline btn-sm" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="secret-warning">
            <span style={{ fontSize: "1.25rem" }}>⚠️</span>
            <div>
              <strong>Save your secret key now!</strong><br />
              This plaintext secret is returned strictly once upon generation. It is SHA-256 hashed before storage at rest and CANNOT be retrieved again later.
            </div>
          </div>

          <div className="secret-box">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 700 }}>
                PLAINTEXT SECRET KEY
              </span>
              <span className="code-pill" style={{ fontSize: "0.7rem", color: "#34D399" }}>
                Prefix: {prefix}
              </span>
            </div>
            <div className="secret-val" style={{ fontSize: "0.85rem" }}>
              {secret}
            </div>
            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
              <button className="btn btn-outline btn-sm" onClick={handleCopy}>
                {copied ? "✅ Copied!" : "📋 Copy to Clipboard"}
              </button>
              {onUseInDemo && (
                <button
                  className="btn btn-sm"
                  onClick={() => {
                    onUseInDemo();
                    onClose();
                  }}
                  style={{ background: "var(--zomato-red)" }}
                >
                  ⚡ Test AI Chat Now
                </button>
              )}
            </div>
          </div>

          {(name || publicId) && (
            <div
              style={{
                fontSize: "0.8rem",
                color: "var(--text-muted)",
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "0.5rem",
                background: "var(--bg-card-subtle)",
                padding: "0.75rem",
                borderRadius: "var(--radius-sm)",
              }}
            >
              {name && <div><strong>Name / Principal:</strong> {name}</div>}
              {publicId && <div><strong>Identifier:</strong> <span className="code-pill">{publicId}</span></div>}
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn" onClick={onClose}>
            I Have Saved My Secret
          </button>
        </div>
      </div>
    </div>
  );
}
