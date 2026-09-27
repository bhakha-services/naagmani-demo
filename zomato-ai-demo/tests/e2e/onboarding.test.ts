import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import {
  ZomatoOnboardingService,
  formatOnboardingSummary,
  maskSecret,
  maskEmail,
} from "../../src/server/onboarding.js";

describe("Zomato AI Demo — Onboarding & API Key Lifecycle Verification", () => {
  describe("1. Token Masking & Secret Security Invariants", () => {
    it("should correctly mask Cloud JWT token without revealing payload", () => {
      const jwt = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.doNotLeakThisSecretSignature7f91";
      const masked = maskSecret(jwt, 8, 4);
      assert.ok(masked.startsWith("eyJhbGci..."));
      assert.ok(masked.endsWith("7f91"));
      assert.ok(!masked.includes("doNotLeakThisSecretSignature"));
    });

    it("should correctly mask Naagmani Runtime API Key", () => {
      const apiKey = "nm_live_0123456789abcdef0123456789abcdef0123456789abcdef";
      const masked = maskSecret(apiKey, 8, 4);
      assert.equal(masked, "nm_live_...cdef");
      assert.ok(!masked.includes("0123456789abcdef0123456789abcdef"));
    });

    it("should handle [REDACTED] and short tokens safely", () => {
      assert.equal(maskSecret("[REDACTED]"), "[REDACTED]");
      assert.equal(maskSecret(""), "[NOT_SET]");
      assert.equal(maskSecret("short"), "shor...");
    });

    it("should mask email addresses safely for console display", () => {
      const email = "zomato-demo-1727000000@example.test";
      const masked = maskEmail(email);
      assert.equal(masked, "zoma****@example.test");
      assert.ok(!masked.includes("1727000000"));
    });
  });

  describe("2. Onboarding Lifecycle against Mocked Control Plane & OS", () => {
    let mockServer: http.Server;
    let mockPort: number;
    let baseUrl: string;

    let receivedChatRequests: any[] = [];
    let receivedApiKeyRequests: any[] = [];
    let sessionStore: Record<string, string[]> = {};

    before(async () => {
      // Start a local mock server emulating Naagmani Cloud (:8081) and OS (:8080)
      mockServer = http.createServer((req, res) => {
        const url = req.url || "";
        const method = req.method || "GET";
        const auth = req.headers["authorization"] || "";

        let body = "";
        req.on("data", (chunk) => (body += chunk));
        req.on("end", () => {
          let parsedBody: any = {};
          try {
            if (body) parsedBody = JSON.parse(body);
          } catch (_) {}

          // Cloud health
          if (url === "/health" && method === "GET") {
            res.writeHead(200, { "Content-Type": "application/json" });
            return res.end(JSON.stringify({ status: "healthy", version: "0.1.0" }));
          }

          // OS health
          if (url === "/v1/health" && method === "GET") {
            res.writeHead(200, { "Content-Type": "application/json" });
            return res.end(JSON.stringify({ status: "healthy", version: "2.0.0" }));
          }

          // Cloud Signup
          if (url === "/v1/auth/signup" && method === "POST") {
            res.writeHead(201, { "Content-Type": "application/json" });
            return res.end(
              JSON.stringify({
                token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mock.jwt.signature7f91",
                user: { id: "usr_zomato_demo_101", email: parsedBody.email, name: parsedBody.name },
                organization: { id: "org_zomato_demo_201", name: "Zomato Demo", slug: "zomato-demo" },
                installation: { id: "inst_zomato_demo_301", status: "active" },
              })
            );
          }

          // Cloud Login
          if (url === "/v1/auth/login" && method === "POST") {
            res.writeHead(200, { "Content-Type": "application/json" });
            return res.end(
              JSON.stringify({
                token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mock.jwt.signature7f91",
                user: { id: "usr_zomato_demo_101", email: parsedBody.email, name: "Zomato Demo Developer" },
                organization: { id: "org_zomato_demo_201", name: "Zomato Demo", slug: "zomato-demo" },
                installation: { id: "inst_zomato_demo_301", status: "active" },
              })
            );
          }

          // Projects List & Create
          if (url.includes("/projects") && !url.includes("/environments")) {
            if (method === "GET") {
              res.writeHead(200, { "Content-Type": "application/json" });
              return res.end(
                JSON.stringify({
                  data: [
                    { id: "proj_zomato_ai_401", name: "Zomato AI Assistant", slug: "zomato-ai-assistant" },
                  ],
                })
              );
            }
            if (method === "POST") {
              res.writeHead(201, { "Content-Type": "application/json" });
              return res.end(
                JSON.stringify({ id: "proj_zomato_ai_401", name: parsedBody.name, slug: parsedBody.slug })
              );
            }
          }

          // Environments List & Create
          if (url.includes("/environments")) {
            if (method === "GET") {
              res.writeHead(200, { "Content-Type": "application/json" });
              return res.end(
                JSON.stringify({
                  data: [{ id: "env_zomato_test_501", name: "Test Environment", slug: "test", type: "development" }],
                })
              );
            }
            if (method === "POST") {
              res.writeHead(201, { "Content-Type": "application/json" });
              return res.end(
                JSON.stringify({ id: "env_zomato_test_501", name: parsedBody.name, slug: parsedBody.slug })
              );
            }
          }

          // Providers Setup
          if (url.includes("/providers") && method === "POST") {
            res.writeHead(201, { "Content-Type": "application/json" });
            return res.end(JSON.stringify({ id: "prov_mock_601", status: "active" }));
          }

          // API Key Generation
          if (url.includes("/api-keys") && method === "POST") {
            receivedApiKeyRequests.push(parsedBody);
            res.writeHead(201, { "Content-Type": "application/json" });
            return res.end(
              JSON.stringify({
                id: "key_zomato_app_701",
                name: parsedBody.name,
                raw_key: "nm_live_1234567890abcdef1234567890abcdef1234567890abcdef",
                status: "active",
                scopes: parsedBody.scopes,
              })
            );
          }

          // OS Models Catalog
          if (url === "/v1/models" && method === "GET") {
            if (!auth.startsWith("Bearer nm_live_")) {
              res.writeHead(401, { "Content-Type": "application/json" });
              return res.end(JSON.stringify({ error: { code: "UNAUTHORIZED", message: "Invalid API key" } }));
            }
            res.writeHead(200, { "Content-Type": "application/json" });
            return res.end(
              JSON.stringify({
                object: "list",
                data: [{ id: "mock/gpt-5-mini", name: "mock/gpt-5-mini" }, { id: "gpt-4o-mini", name: "gpt-4o-mini" }],
              })
            );
          }

          // OS Chat Completions (OpenAI compatible)
          if (url === "/v1/chat/completions" && method === "POST") {
            receivedChatRequests.push(parsedBody);

            if (auth.includes("nm_live_000000000000000000000000000000000000000000000000")) {
              res.writeHead(401, { "Content-Type": "application/json" });
              return res.end(JSON.stringify({ error: { code: "UNAUTHORIZED", message: "Invalid API Key" } }));
            }

            if (!auth.startsWith("Bearer nm_live_")) {
              res.writeHead(401, { "Content-Type": "application/json" });
              return res.end(JSON.stringify({ error: { code: "UNAUTHORIZED", message: "Unauthorized token" } }));
            }

            const sessId = parsedBody.session_id || req.headers["x-session-id"] || "default";
            const userMsg = parsedBody.messages?.[parsedBody.messages.length - 1]?.content || "";

            if (!sessionStore[sessId]) sessionStore[sessId] = [];
            sessionStore[sessId].push(userMsg);

            let reply = "I am the Zomato AI assistant powered by Naagmani OS.";
            if (userMsg.toLowerCase().includes("what is my name")) {
              const previousIntro = sessionStore[sessId].find((m) => m.includes("Rahul"));
              if (previousIntro) {
                reply = "Your name is Rahul, working on the Zomato AI assistant.";
              } else {
                reply = "I don't know your name yet.";
              }
            }

            res.writeHead(200, { "Content-Type": "application/json" });
            return res.end(
              JSON.stringify({
                id: "chatcmpl_mock_001",
                object: "chat.completion",
                choices: [
                  {
                    index: 0,
                    message: { role: "assistant", content: reply },
                    finish_reason: "stop",
                  },
                ],
                usage: { prompt_tokens: 15, completion_tokens: 25, total_tokens: 40 },
              })
            );
          }

          // Fallback 404
          res.writeHead(404, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Not found" }));
        });
      });

      await new Promise<void>((resolve) => {
        mockServer.listen(0, "127.0.0.1", () => {
          const addr = mockServer.address() as any;
          mockPort = addr.port;
          baseUrl = `http://127.0.0.1:${mockPort}`;
          resolve();
        });
      });
    });

    after(async () => {
      await new Promise<void>((resolve) => {
        mockServer.close(() => resolve());
      });
    });

    it("should successfully execute end-to-end quick register and full API validation", async () => {
      const onboarding = new ZomatoOnboardingService({
        cloudUrl: baseUrl,
        osUrl: baseUrl,
        email: "zomato-demo-fresh@example.test",
        reuseExisting: false,
        saveToEnv: false, // do not modify actual files in test
        skipApiValidation: false,
      });

      const res = await onboarding.run();

      assert.equal(res.success, true);
      assert.equal(res.cloudHealthy, true);
      assert.equal(res.osHealthy, true);
      assert.equal(res.userRegistered, true);
      assert.equal(res.userAuthenticated, true);
      assert.equal(res.orgResolved, true);
      assert.equal(res.projectResolved, true);
      assert.equal(res.envResolved, true);
      assert.equal(res.appIdentityResolved, true);
      assert.equal(res.apiKeyCreated, true);
      assert.equal(res.apiKeyVerified, true);
      assert.equal(res.modelListingVerified, true);
      assert.equal(res.chatCompletionVerified, true);
      assert.equal(res.sessionContinuityVerified, true);
      assert.equal(res.invalidKeyRejected, true);

      // Verify token masking
      assert.ok(res.credentials.maskedCloudJwt.startsWith("eyJ"));
      assert.ok(res.credentials.maskedRuntimeApiKey.startsWith("nm_live_"));
      assert.equal(res.credentials.maskedInstallationSecret, "[REDACTED]");

      // Format output check
      const summaryText = formatOnboardingSummary(res);
      assert.ok(summaryText.includes("[PASS] Cloud health"));
      assert.ok(summaryText.includes("[PASS] OS health"));
      assert.ok(summaryText.includes("[PASS] Demo user registered"));
      assert.ok(summaryText.includes("[PASS] User authenticated"));
      assert.ok(summaryText.includes("[PASS] Organization resolved"));
      assert.ok(summaryText.includes("[PASS] Project resolved"));
      assert.ok(summaryText.includes("[PASS] Test environment resolved"));
      assert.ok(summaryText.includes("[PASS] Application identity created"));
      assert.ok(summaryText.includes("[PASS] Naagmani API key created"));
      assert.ok(summaryText.includes("[PASS] API key authentication verified"));
      assert.ok(summaryText.includes("[PASS] Model listing verified"));
      assert.ok(summaryText.includes("[PASS] Chat completion verified"));
      assert.ok(summaryText.includes("[PASS] Session continuity verified"));
      assert.ok(summaryText.includes("[PASS] Invalid API key rejected"));
      assert.ok(summaryText.includes("Zomato demo onboarding and API-key validation PASSED"));

      // Invariant: Full raw tokens must not leak in summary
      assert.ok(!summaryText.includes("1234567890abcdef1234567890abcdef1234567890abcdef"));
      assert.ok(!summaryText.includes("doNotLeakThisSecretSignature"));
    });

    it("should support idempotent reuse of existing demo developer account (--reuse)", async () => {
      const onboarding = new ZomatoOnboardingService({
        cloudUrl: baseUrl,
        osUrl: baseUrl,
        reuseExisting: true,
        saveToEnv: false,
        skipApiValidation: false,
      });

      const res = await onboarding.run();
      assert.equal(res.success, true);
      assert.equal(res.userAuthenticated, true);
      assert.equal(res.projectResolved, true);
      assert.equal(res.apiKeyCreated, true);
    });
  });
});
