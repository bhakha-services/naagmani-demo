"use client";

import React, { useState } from "react";

interface RotateTokenModalProps {
  isOpen: boolean;
  onClose: () => void;
  token: { id: string; name: string } | null;
  onSuccess: (data: any) => void;
}

export function RotateTokenModal({ isOpen, onClose, token, onSuccess }: RotateTokenModalProps) {
  const [graceHours, setGraceHours] = useState("24");
  const [loading, setLoading] = useState(false);

  if (!isOpen || !token) return null;

  const handleRotate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`/api/service-tokens/${token.id}/rotate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grace_period_hours: parseInt(graceHours, 10) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Rotation failed");
      onSuccess(data);
      onClose();
    } catch (err: any) {
      alert("Rotation failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay active">
      <div className="modal-box">
        <div className="modal-header">
          <span className="card-title">🔄 Rotate Project Service Token</span>
          <button className="btn btn-outline btn-sm" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleRotate}>
          <div className="modal-body">
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
              Rotating token: <strong style={{ color: "white" }}>{token.name}</strong><br />
              Atomically generates a replacement secret with zero-downtime grace period.
            </p>

            <div className="form-group">
              <label>Grace Period for Predecessor Token</label>
              <select value={graceHours} onChange={(e) => setGraceHours(e.target.value)}>
                <option value="24">24 Hours (Recommended for zero-downtime migration)</option>
                <option value="1">1 Hour (Fast transition)</option>
                <option value="72">72 Hours (Extended deployment migration)</option>
                <option value="0">0 Hours (Immediate predecessor revocation)</option>
              </select>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-outline" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn" disabled={loading}>
              {loading ? "Rotating..." : "Proceed with Rotation"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
