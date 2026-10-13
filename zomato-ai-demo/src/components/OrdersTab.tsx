"use client";

import React from "react";

interface Order {
  id: string;
  customer_id: string;
  restaurant_name: string;
  status: string;
  items: Array<{ name: string; quantity: number }>;
  total_amount: number;
  payment_method: string;
  payment_status: string;
  eta_minutes: number;
  delivery_partner?: {
    name: string;
    vehicle_number: string;
    phone: string;
  };
}

interface OrdersTabProps {
  orders: Order[];
  loading: boolean;
  onRefresh: () => void;
  onAskAi: (prompt: string) => void;
  onCancelOrder: (orderId: string) => void;
}

export function OrdersTab({
  orders,
  loading,
  onRefresh,
  onAskAi,
  onCancelOrder,
}: OrdersTabProps) {
  const activeOrder = orders.find((o) => o.status === "OUT_FOR_DELIVERY") || orders[0];

  return (
    <div className="grid-2">
      <div>
        <div className="card">
          <div className="card-header">
            <span className="card-title">🛵 Active & Recent Orders</span>
            <button className="btn btn-outline btn-sm" onClick={onRefresh} disabled={loading}>
              🔄 {loading ? "Loading..." : "Refresh"}
            </button>
          </div>

          {loading ? (
            <p style={{ color: "var(--text-muted)", padding: "1rem" }}>Loading orders...</p>
          ) : orders.length === 0 ? (
            <p style={{ color: "var(--text-muted)", padding: "1rem" }}>
              No orders found for this customer.
            </p>
          ) : (
            orders.map((o) => {
              let badgeClass = "badge-out";
              if (o.status === "DELIVERED") badgeClass = "badge-delivered";
              if (o.status === "PREPARING") badgeClass = "badge-preparing";
              if (o.status === "CANCELLED") badgeClass = "badge-cancelled";

              return (
                <div key={o.id} className="order-card">
                  <div className="order-header">
                    <div>
                      <span className="order-id">{o.id}</span>
                      <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginLeft: "0.5rem" }}>
                        {o.restaurant_name}
                      </span>
                    </div>
                    <span className={`badge ${badgeClass}`}>{o.status}</span>
                  </div>
                  <div className="order-meta">
                    <span>Items: {o.items.map((i) => `${i.name} (x${i.quantity})`).join(", ")}</span>
                    <span>Total: ₹{o.total_amount} | Payment: {o.payment_method} ({o.payment_status})</span>
                    {o.eta_minutes > 0 && (
                      <span style={{ color: "var(--accent-amber)" }}>ETA: {o.eta_minutes} mins</span>
                    )}
                  </div>
                  <div className="order-actions">
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={() => onAskAi(`Where is my order ${o.id}?`)}
                    >
                      📍 Track via AI
                    </button>
                    {o.status !== "CANCELLED" && o.status !== "DELIVERED" && (
                      <button
                        className="btn btn-outline btn-sm"
                        style={{ borderColor: "rgba(226, 55, 68, 0.4)", color: "#FFA4A4" }}
                        onClick={() => onCancelOrder(o.id)}
                      >
                        ❌ Cancel
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div>
        <div className="card">
          <div className="card-header">
            <span className="card-title">📍 Live Order Tracker</span>
            <span className="badge badge-out">LIVE TRACKING</span>
          </div>

          <div
            style={{
              background: "var(--bg-card-subtle)",
              padding: "1.5rem",
              borderRadius: "var(--radius-md)",
              textAlign: "center",
              marginBottom: "1rem",
            }}
          >
            <div style={{ fontSize: "3rem", marginBottom: "0.5rem" }}>🛵 ➔ 🏠</div>
            <h3 style={{ fontWeight: 800, marginBottom: "0.25rem" }}>
              {activeOrder?.id || "No Active Order"}
            </h3>
            <p style={{ color: "var(--accent-amber)", fontWeight: 700 }}>
              {activeOrder
                ? activeOrder.eta_minutes > 0
                  ? `Arriving in ${activeOrder.eta_minutes} mins`
                  : activeOrder.status
                : "All orders delivered"}
            </p>
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "0.5rem" }}>
              {activeOrder?.delivery_partner
                ? `Rider: ${activeOrder.delivery_partner.name} (${activeOrder.delivery_partner.vehicle_number})`
                : "Rider: Assigned"}
            </p>
          </div>

          <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", lineHeight: 1.6 }}>
            <div>• <strong>Restaurant:</strong> {activeOrder?.restaurant_name || "N/A"}</div>
            <div>• <strong>Delivery Address:</strong> Indiranagar 100ft Rd, Bangalore</div>
            <div>• <strong>Payment Status:</strong> {activeOrder?.payment_status || "N/A"} ({activeOrder?.payment_method})</div>
            <div>• <strong>Support Hotline:</strong> +91-80-6000-ZOMATO</div>
          </div>
        </div>
      </div>
    </div>
  );
}
