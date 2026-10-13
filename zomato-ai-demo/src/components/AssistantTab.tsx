"use client";

import React, { useState, useRef, useEffect } from "react";

interface Message {
  role: "user" | "assistant" | "error";
  content: string;
  meta?: {
    latency?: number;
    tokens?: number;
    cost?: number;
    stage?: string;
  };
}

interface LifecycleStage {
  name: string;
  status: string;
  details?: string;
  duration_ms?: number;
}

interface AssistantTabProps {
  activeCustomer: string;
  initialPrompt?: string;
}

export function AssistantTab({ activeCustomer, initialPrompt }: AssistantTabProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "👋 Hi! I'm your Zomato Delivery Assistant powered by Naagmani OS. How can I help you today?",
    },
  ]);
  const [input, setInput] = useState(initialPrompt || "");
  const [loading, setLoading] = useState(false);
  const [lifecycle, setLifecycle] = useState<LifecycleStage[]>([]);
  const [metrics, setMetrics] = useState({
    providerCalled: false,
    tokens: 0,
    cost: 0,
    latency: 42,
    ragChunks: 0,
    mcpTools: "none",
  });

  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialPrompt) {
      setInput(initialPrompt);
    }
  }, [initialPrompt]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: text }],
          customer_id: activeCustomer,
        }),
      });

      const data = await res.json();

      if (!data.success) {
        setMessages((prev) => [
          ...prev,
          {
            role: "error",
            content: `⛔ ${data.error?.stage || "Blocked"}: ${data.error?.message || "Request blocked at gateway"}`,
            meta: { stage: data.error?.stage },
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: data.content,
            meta: {
              latency: 42,
              tokens: data.usage?.total_tokens || 0,
              cost: data.usage?.cost_usd || 0,
            },
          },
        ]);
      }

      if (data.lifecycle) {
        setLifecycle(data.lifecycle);
      }

      setMetrics({
        providerCalled: Boolean(data.provider_called),
        tokens: data.usage?.total_tokens || 0,
        cost: data.usage?.cost_usd || 0,
        latency: data.lifecycle?.reduce((a: number, b: any) => a + (b.duration_ms || 0), 0) || 42,
        ragChunks: data.plugin_metrics?.rag_retrieval_count || 0,
        mcpTools: data.plugin_metrics?.mcp_tools_executed?.length
          ? data.plugin_metrics.mcp_tools_executed.join(", ")
          : "none",
      });
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        { role: "error", content: "Failed to connect to AI Gateway: " + err.message },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid-2">
      {/* Left Chat Window */}
      <div className="chat-container">
        <div className="card-header" style={{ padding: "1rem 1.5rem", marginBottom: 0 }}>
          <span className="card-title">🤖 Zomato Delivery AI Assistant</span>
          <button
            className="btn btn-outline btn-sm"
            onClick={() =>
              setMessages([
                {
                  role: "assistant",
                  content: "👋 Hi! I'm your Zomato Delivery Assistant powered by Naagmani OS. How can I help you today?",
                },
              ])
            }
          >
            🧹 Clear
          </button>
        </div>

        <div className="chat-messages">
          {messages.map((m, idx) => (
            <div key={idx} className={`message ${m.role}`}>
              <div>{m.content}</div>
              {m.meta && (
                <div className="message-meta">
                  {m.meta.latency && <span>⏱️ {m.meta.latency}ms</span>}
                  {m.meta.tokens !== undefined && <span>🪙 {m.meta.tokens} tokens</span>}
                  {m.meta.cost !== undefined && <span>💵 ${m.meta.cost.toFixed(6)}</span>}
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div className="message assistant">
              <span>🤔 Processing request through Naagmani OS AI Gateway...</span>
            </div>
          )}
          <div ref={chatBottomRef} />
        </div>

        <form onSubmit={handleSend} className="chat-input-area">
          <input
            type="text"
            placeholder="Ask about orders, delivery policies, refunds, or menus..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <button type="submit" className="btn" disabled={loading || !input.trim()}>
            Send ➔
          </button>
        </form>
      </div>

      {/* Right Gateway Observability Panel */}
      <div>
        <div className="card">
          <div className="card-header">
            <span className="card-title">🛡️ 11-Stage AI Gateway Security Pipeline</span>
            <span
              className="badge"
              style={{
                background: metrics.providerCalled ? "rgba(16, 185, 129, 0.2)" : "rgba(226, 55, 68, 0.2)",
                color: metrics.providerCalled ? "var(--accent-green)" : "var(--zomato-red)",
              }}
            >
              {metrics.providerCalled ? "Provider: Called" : "Provider: Blocked (Calls=0)"}
            </span>
          </div>

          <div style={{ maxHeight: "320px", overflowY: "auto", marginBottom: "1rem" }}>
            {lifecycle.length === 0 ? (
              <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", padding: "1rem 0" }}>
                Send a chat prompt to inspect the 11-stage security and governance lifecycle.
              </p>
            ) : (
              lifecycle.map((st, i) => (
                <div key={i} className={`stage-item ${st.status}`}>
                  <div>
                    <span style={{ fontWeight: 600 }}>{i + 1}. {st.name}</span>
                    {st.details && (
                      <div style={{ fontSize: "0.7rem", color: "var(--text-dim)", marginTop: "2px" }}>
                        {st.details}
                      </div>
                    )}
                  </div>
                  <span
                    style={{
                      fontWeight: 700,
                      color:
                        st.status === "PASSED" || st.status === "EXECUTED"
                          ? "var(--accent-green)"
                          : "var(--zomato-red)",
                    }}
                  >
                    {st.status}
                  </span>
                </div>
              ))
            )}
          </div>

          {/* Quick Telemetry Counters */}
          <div
            style={{
              background: "var(--bg-card-subtle)",
              padding: "0.75rem",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--border-color)",
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "0.5rem",
              fontSize: "0.8rem",
            }}
          >
            <div><strong>Provider Reached:</strong> <span style={{ color: metrics.providerCalled ? "var(--accent-green)" : "var(--zomato-red)" }}>{metrics.providerCalled ? "Yes" : "No"}</span></div>
            <div><strong>Gateway Latency:</strong> <span>{metrics.latency} ms</span></div>
            <div><strong>Metered Tokens:</strong> <span>{metrics.tokens} tokens</span></div>
            <div><strong>Cost USD:</strong> <span>${metrics.cost.toFixed(6)}</span></div>
            <div><strong>RAG Chunks:</strong> <span>{metrics.ragChunks} chunks</span></div>
            <div><strong>MCP Tools:</strong> <span>{metrics.mcpTools}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
