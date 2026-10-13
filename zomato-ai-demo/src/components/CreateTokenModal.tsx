"use client";

import React, { useState } from "react";

interface CreateTokenModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (data: any) => void;
}

export function CreateTokenModal({ isOpen, onClose, onSuccess }: CreateTokenModalProps) {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [env, setEnv] = useState("9ccb1c2a-d984-4865-9ee6-84050110c104");
  const [ttl, setTtl] = useState("90");
  const [capInference, setCapInference] = useState(true);
  const [capModels, setCapModels] = useState(true);
  const [capUsage, setCapUsage] = useState(true);
  const [capProvider, setCapProvider] = useState(true);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert("Token name is required");
      return;
    }

    const capabilities: string[] = [];
    if (capInference) capabilities.push("inference.execute");
    if (capModels) capabilities.push("models.read");
    if (capUsage) capabilities.push("usage.read");
    if (capProvider) capabilities.push("provider.use");

    setLoading(true);
    try {
      const res = await fetch("/api/service-tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: desc.trim(),
          environment_id: env,
          capabilities,
          expires_in_days: parseInt(ttl, 10),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Token generation failed");

      onSuccess(data);
      onClose();
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay active">
      <div className="modal-box">
        <div className="modal-header">
          <span className="card-title">➕ Create Project Service Token</span>
          <button className="btn btn-outline btn-sm" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label>Token Name *</label>
              <input
                type="text"
                placeholder="e.g. zomato-delivery-worker-token"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>Description (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Machine principal for AI routing"
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Target Environment *</label>
              <select value={env} onChange={(e) => setEnv(e.target.value)}>
                <option value="9ccb1c2a-d984-4865-9ee6-84050110c104">Test (9ccb1c2a-d984-4865-9ee6-84050110c104)</option>
                <option value="13a3ac6c-27b9-4e64-9cb1-982b8f8c4caa">Production (13a3ac6c-27b9-4e64-9cb1-982b8f8c4caa)</option>
              </select>
            </div>
            <div className="form-group">
              <label>Granted Capabilities *</label>
              <div className="checkbox-grid">
                <label className="checkbox-label">
                  <input type="checkbox" checked={capInference} onChange={(e) => setCapInference(e.target.checked)} />
                  inference.execute
                </label>
                <label className="checkbox-label">
                  <input type="checkbox" checked={capModels} onChange={(e) => setCapModels(e.target.checked)} />
                  models.read
                </label>
                <label className="checkbox-label">
                  <input type="checkbox" checked={capUsage} onChange={(e) => setCapUsage(e.target.checked)} />
                  usage.read
                </label>
                <label className="checkbox-label">
                  <input type="checkbox" checked={capProvider} onChange={(e) => setCapProvider(e.target.checked)} />
                  provider.use
                </label>
              </div>
            </div>
            <div className="form-group">
              <label>Expiration Policy</label>
              <select value={ttl} onChange={(e) => setTtl(e.target.value)}>
                <option value="30">30 Days</option>
                <option value="60">60 Days</option>
                <option value="90">90 Days (Recommended)</option>
                <option value="180">180 Days</option>
                <option value="365">1 Year</option>
              </select>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-outline" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn" disabled={loading}>
              {loading ? "Generating..." : "Generate Token"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
