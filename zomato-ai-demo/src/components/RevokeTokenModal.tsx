"use client";

import React, { useState } from "react";

interface RevokeTokenModalProps {
  isOpen: boolean;
  onClose: () => void;
  token: { id: string; name: string } | null;
  onSuccess: () => void;
}

export function RevokeTokenModal({ isOpen, onClose, token, onSuccess }: RevokeTokenModalProps) {
  const [reason, setReason] = useState("manual revocation via UI");
  const [loading, setLoading] = useState(false);

  if (!isOpen || !token) return null;

  const handleRevoke = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`/api/service-tokens/${token.id}?reason=${encodeURIComponent(reason)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Revocation failed");
      onSuccess();
      onClose();
    } catch (err: any) {
      alert("Revocation failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay active">
      <div className="modal-box">
        <div
          className="modal-header"
          style={{ background: "rgba(226, 55, 68, 0.1)", borderBottomColor: "rgba(226, 55, 68, 0.3)" }}
        >
          <span className="card-title" style={{ color: "var(--zomato-red)" }}>
            ❌ Revoke Service Token
          </span>
          <button className="btn btn-outline btn-sm" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleRevoke}>
          <div className="modal-body">
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
              Are you sure you want to revoke <strong style={{ color: "white" }}>{token.name}</strong>?<br />
              All active and pending requests using this token will be immediately rejected with HTTP 401.
            </p>

            <div className="form-group">
              <label>Audit Revocation Reason</label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-outline" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn" disabled={loading} style={{ background: "var(--zomato-red)" }}>
              {loading ? "Revoking..." : "Confirm Revocation"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
