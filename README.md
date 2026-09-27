# 🐍 Naagmani Demo & Showcase Gallery

A curated collection of production-grade reference applications, interactive demos, and AI agents built on top of the **Naagmani Enterprise AI Operating System**.

This repository serves as a practical, hands-on playground demonstrating how modern applications leverage Naagmani for **Smart AI Routing**, **Multi-Turn Context Management**, **PST (Project Service Token) M2M Authentication**, **Enterprise Guardrails**, **Cost Control**, and **Real-Time Analytics**.

---

## 🚀 Showcase Applications

| Application | Category | Highlights & Capabilities | Stack | Directory |
| :--- | :---: | :--- | :---: | :---: |
| **Zomato AI Delivery Assistant** | *E-Commerce & Food Delivery* | • Function / Tool Calling<br>• Automated PST Provisioning<br>• Real-time Order & Policy Tracking<br>• Autonomous Refund & Escalation Logic | TypeScript, Node.js, Express | [`./zomato-ai-demo`](./zomato-ai-demo) |
| *More Demos Coming Soon...* | *FinTech, Healthcare, Support* | • Multi-Agent Orchestration<br>• Streaming Voice & Vision<br>• BYOK Multi-Cloud Failover | *Various* | *Coming soon* |

---

## 🌟 What You Can Learn from These Demos

Every demo in this repository showcases key enterprise architectural patterns:

1. **Enterprise Machine-to-Machine (M2M) Authentication:**
   * Demonstrates using **Project Service Tokens (`nm_st_...`)** for secure headless services, webhooks, and backend agents without human session tokens.
2. **Dynamic Tool & Function Calling:**
   * Clean separation between model reasoning, schema-driven function execution, and Naagmani OS gateway routing.
3. **Automated Onboarding & Self-Registration:**
   * Scripted developer setup demonstrating how upstream systems register tenants, create projects, and mint credentials on the fly.
4. **End-to-End Resilience & Observability:**
   * Transparent handling of rate limits, latency-based fallback routing, and real-time usage attribution.

---

## 🛠️ Running a Demo

Each demo is self-contained with its own dependencies, configuration, and scripts.

1. **Choose a demo and navigate into its directory:**
   ```bash
   cd zomato-ai-demo
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your local or cloud Naagmani instance details
   ```

4. **Launch the demo:**
   ```bash
   npm run dev
   ```

Refer to each demo's dedicated `README.md` for complete prerequisites, walkthrough videos/diagrams, and automated E2E test commands.

---

## 📂 Repository Structure

```text
naagmani-demo/
├── README.md                      # Repository index and gallery (this file)
├── zomato-ai-demo/                # Zomato Food Delivery AI Assistant
│   ├── src/                       # Application server & frontend UI
│   ├── scripts/                   # Automated onboarding & reset scripts
│   ├── tests/                     # Integration and E2E test suites
│   └── README.md                  # Comprehensive setup & architecture guide
│
└── <future-demo-name>/            # Additional demo applications
```

---

## 🤝 Contributing New Demos

We welcome new demo contributions that showcase unique AI workflows! To contribute a demo:

1. Create a new directory under the root (e.g. `ecommerce-support-demo/`, `fintech-advisor-demo/`).
2. Include a standalone `package.json`, `.env.example`, `.gitignore`, and detailed `README.md`.
3. Add your demo to the [Showcase Applications](#-showcase-applications) table above.
4. Submit a pull request to `main`.

---

## 📚 Official Links & Documentation

* **Naagmani OS Core & Gateway**: [github.com/bhakha-services/naagmani](https://github.com/bhakha-services/naagmani)
* **Naagmani Cloud & Developer Portal**: [naagmani.local / cloud](http://localhost:3000)
* **API & Integration Documentation**: [Naagmani Docs](https://github.com/bhakha-services)
