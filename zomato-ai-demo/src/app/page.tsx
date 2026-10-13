"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/Header";
import { OrdersTab } from "@/components/OrdersTab";
import { AssistantTab } from "@/components/AssistantTab";
import { ScenariosTab } from "@/components/ScenariosTab";
import { ArchitectureTab } from "@/components/ArchitectureTab";
import { ServiceTokensTab } from "@/components/ServiceTokensTab";
import { CustomerProvisionTab } from "@/components/CustomerProvisionTab";
import { AddCustomerModal } from "@/components/AddCustomerModal";
import { OneTimeSecretModal } from "@/components/OneTimeSecretModal";
import { CreateTokenModal } from "@/components/CreateTokenModal";
import { RotateTokenModal } from "@/components/RotateTokenModal";
import { RevokeTokenModal } from "@/components/RevokeTokenModal";

export default function Home() {
  const [activeTab, setActiveTab] = useState("orders");
  const [customers, setCustomers] = useState<any[]>([]);
  const [activeCustomer, setActiveCustomer] = useState("cust_1001");
  const [orders, setOrders] = useState<any[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [osStatus, setOsStatus] = useState({ connected: true, version: "0.1.0" });
  const [chatPrompt, setChatPrompt] = useState("");

  // Modals state
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [isCreateTokenOpen, setIsCreateTokenOpen] = useState(false);
  const [rotateTokenData, setRotateTokenData] = useState<{ id: string; name: string } | null>(null);
  const [revokeTokenData, setRevokeTokenData] = useState<{ id: string; name: string } | null>(null);
  const [secretModalData, setSecretModalData] = useState<{
    isOpen: boolean;
    title: string;
    secret: string;
    prefix?: string;
    name?: string;
    publicId?: string;
  }>({
    isOpen: false,
    title: "",
    secret: "",
  });

  const checkHealth = useCallback(async () => {
    try {
      const res = await fetch("/api/naagmani/status");
      const data = await res.json();
      setOsStatus({
        connected: data.status === "CONNECTED",
        version: data.os_version || "0.1.0",
      });
    } catch {
      setOsStatus({ connected: false, version: "0.1.0" });
    }
  }, []);

  const loadCustomers = useCallback(async () => {
    try {
      const res = await fetch("/api/customers");
      const data = await res.json();
      const list = Array.isArray(data) ? data : data.customers || [];
      setCustomers(list);
      if (list.length > 0 && !list.some((c: any) => c.id === activeCustomer)) {
        setActiveCustomer(list[0].id);
      }
    } catch (e) {
      console.error("Failed to load customers", e);
    }
  }, [activeCustomer]);

  const loadOrders = useCallback(async (custId?: string) => {
    const id = custId || activeCustomer;
    if (!id) return;
    setOrdersLoading(true);
    try {
      const res = await fetch(`/api/orders?customer_id=${id}`);
      const data = await res.json();
      setOrders(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Failed to load orders", e);
    } finally {
      setOrdersLoading(false);
    }
  }, [activeCustomer]);

  useEffect(() => {
    checkHealth();
    loadCustomers();
  }, [checkHealth, loadCustomers]);

  useEffect(() => {
    if (activeCustomer) {
      loadOrders(activeCustomer);
    }
  }, [activeCustomer, loadOrders]);

  const handleCustomerChange = (id: string) => {
    setActiveCustomer(id);
    loadOrders(id);
  };

  const handleAskAi = (prompt: string) => {
    setChatPrompt(prompt);
    setActiveTab("assistant");
  };

  const handleCancelOrder = async (orderId: string) => {
    try {
      const res = await fetch(`/api/orders/${orderId}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customer_id: activeCustomer }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to cancel order");
      alert(`Order ${orderId} has been cancelled.`);
      loadOrders(activeCustomer);
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  const handleCustomerProvisionSuccess = (data: any) => {
    loadCustomers();
    if (data.customer?.id) {
      setActiveCustomer(data.customer.id);
      loadOrders(data.customer.id);
    }
    setSecretModalData({
      isOpen: true,
      title: "🎉 Customer Child API Key Minted",
      secret: data.provision_result?.api_key || "nm_live_****",
      prefix: "nm_live_",
      name: `${data.customer?.name} (Member ID: ${data.provision_result?.member_id?.substring(0, 12)}...)`,
      publicId: data.provision_result?.masked_identifier || data.customer?.id,
    });
  };

  const handleTokenCreateSuccess = (data: any) => {
    setSecretModalData({
      isOpen: true,
      title: "🎉 Project Service Token Created",
      secret: data.secret || "nm_st_****",
      prefix: "nm_st_",
      name: data.token?.name || "Service Token",
      publicId: data.token?.public_id || data.token?.id,
    });
  };

  return (
    <>
      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
        customers={customers}
        activeCustomer={activeCustomer}
        onCustomerChange={handleCustomerChange}
        onOpenAddCustomerModal={() => setIsAddCustomerOpen(true)}
        osStatus={osStatus}
      />

      <main>
        {activeTab === "orders" && (
          <OrdersTab
            orders={orders}
            loading={ordersLoading}
            onRefresh={() => loadOrders(activeCustomer)}
            onAskAi={handleAskAi}
            onCancelOrder={handleCancelOrder}
          />
        )}

        {activeTab === "assistant" && (
          <AssistantTab
            activeCustomer={activeCustomer}
            initialPrompt={chatPrompt}
          />
        )}

        {activeTab === "scenarios" && <ScenariosTab />}

        {activeTab === "telemetry" && <ArchitectureTab />}

        {activeTab === "tokens" && (
          <ServiceTokensTab
            onOpenCreateToken={() => setIsCreateTokenOpen(true)}
            onOpenRotateToken={(id, name) => setRotateTokenData({ id, name })}
            onOpenRevokeToken={(id, name) => setRevokeTokenData({ id, name })}
          />
        )}

        {activeTab === "provision" && (
          <CustomerProvisionTab
            customers={customers}
            activeCustomer={activeCustomer}
            onSelectCustomer={(id, tab) => {
              setActiveCustomer(id);
              loadOrders(id);
              if (tab) setActiveTab(tab);
            }}
            onRefreshCustomers={loadCustomers}
          />
        )}
      </main>

      {/* Global Modals */}
      <AddCustomerModal
        isOpen={isAddCustomerOpen}
        onClose={() => setIsAddCustomerOpen(false)}
        onSuccess={handleCustomerProvisionSuccess}
      />

      <OneTimeSecretModal
        isOpen={secretModalData.isOpen}
        onClose={() => setSecretModalData((prev) => ({ ...prev, isOpen: false }))}
        title={secretModalData.title}
        secret={secretModalData.secret}
        prefix={secretModalData.prefix}
        name={secretModalData.name}
        publicId={secretModalData.publicId}
        onUseInDemo={() => {
          setActiveTab("assistant");
          setChatPrompt("Where is my order and what is your refund policy?");
        }}
      />

      <CreateTokenModal
        isOpen={isCreateTokenOpen}
        onClose={() => setIsCreateTokenOpen(false)}
        onSuccess={handleTokenCreateSuccess}
      />

      <RotateTokenModal
        isOpen={Boolean(rotateTokenData)}
        onClose={() => setRotateTokenData(null)}
        token={rotateTokenData}
        onSuccess={() => alert("Token successfully rotated!")}
      />

      <RevokeTokenModal
        isOpen={Boolean(revokeTokenData)}
        onClose={() => setRevokeTokenData(null)}
        token={revokeTokenData}
        onSuccess={() => alert("Token successfully revoked!")}
      />
    </>
  );
}
