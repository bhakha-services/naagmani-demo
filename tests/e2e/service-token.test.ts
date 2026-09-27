import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import {
  projectServiceTokenService,
  validateServiceTokenFormat,
  parseServiceToken,
  maskServiceToken,
  generateTestServiceToken,
  hashSecret,
} from "../../src/server/service-tokens.js";
import { naagmaniClient } from "../../src/server/naagmani-client.js";

describe("Zomato AI Demo — Project Service Token Integration & Lifecycle Verification", () => {
  const testProjectId = "f7cf337c-2c9a-4631-8957-9dbfe602cc17";
  const testEnvId = "bab66704-4336-4073-b0dc-f3aad8c823ec";

  describe("1. Cryptographic Format, Validation, and Redaction Invariants", () => {
    it("should generate and validate compliant 65-character Project Service Token format (nm_st_<10base32>_<48hex>)", () => {
      const generated = generateTestServiceToken("VAK8CS0FJP");
      assert.equal(generated.token.length, 65, "Token length must be exactly 65 characters");
      assert.ok(generated.token.startsWith("nm_st_VAK8CS0FJP_"), "Must start with nm_st_ and public ID");
      assert.equal(validateServiceTokenFormat(generated.token), true, "Must pass strict format validation");
    });

    it("should correctly parse public ID and secret entropy from token string", () => {
      const generated = generateTestServiceToken("TESTPUB123");
      const parsed = parseServiceToken(generated.token);
      assert.notEqual(parsed, null);
      assert.equal(parsed?.publicId, "TESTPUB123");
      assert.equal(parsed?.secret.length, 48, "Secret entropy must be 48 hex characters (192 bits)");
    });

    it("should mask secret material safely without leaking raw secret in UI or logs", () => {
      const generated = generateTestServiceToken("VAK8CS0FJP");
      const masked = maskServiceToken(generated.token);
      assert.ok(masked.startsWith("nm_st_VAK8CS0FJP_****..."), "Masked output must conceal middle entropy");
      assert.ok(masked.endsWith(generated.secret.slice(-4)), "Masked output should end with last 4 chars for visual confirmation");
      assert.equal(masked.includes(generated.secret), false, "Raw secret MUST NOT appear in masked identifier");
    });

    it("should reject non-compliant, truncated, or tampered token strings", () => {
      assert.equal(validateServiceTokenFormat(""), false);
      assert.equal(validateServiceTokenFormat("nm_live_0123456789abcdef"), false);
      assert.equal(validateServiceTokenFormat("nm_st_SHORT"), false);
      assert.equal(validateServiceTokenFormat("nm_st_invalid_chars_!@#$_1234567890"), false);
      assert.equal(validateServiceTokenFormat("bearer nm_st_VAK8CS0FJP_0123456789abcdef0123456789abcdef0123456789abcdef"), false);
    });

    it("should compute deterministic SHA-256 hash at rest", () => {
      const secret = "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6";
      const h1 = hashSecret(secret);
      const h2 = hashSecret(secret);
      assert.equal(h1, h2);
      assert.equal(h1.length, 64, "SHA-256 hash must be 64 hex characters");
    });
  });

  describe("2. Project Service Token Lifecycle Operations (Sandbox & State Invariants)", () => {
    let createdTokenId = "";
    let rawSecretToken = "";

    it("should create a Project Service Token and return plaintext secret strictly once", async () => {
      const res = await projectServiceTokenService.createToken(testProjectId, {
        name: "zomato-delivery-worker-token",
        description: "Token for autonomous order status investigation and routing",
        environment_id: testEnvId,
        capabilities: ["models.read", "inference.execute", "usage.read"],
        expires_in_days: 60,
      }, { forceSandbox: true });

      assert.ok(res.token, "Plaintext token MUST be returned upon creation");
      assert.equal(validateServiceTokenFormat(res.token), true, "Returned token must be valid format");
      assert.equal(res.service_token.name, "zomato-delivery-worker-token");
      assert.equal(res.service_token.environment_id, testEnvId);
      assert.equal(res.service_token.status, "active");
      assert.ok(res.service_token.capabilities.includes("inference.execute"));
      assert.ok(res.service_token.capabilities.includes("models.read"));

      createdTokenId = res.service_token.id;
      rawSecretToken = res.token;
    });

    it("should list tokens for project with sanitized metadata (no raw secrets exposed)", async () => {
      const list = await projectServiceTokenService.listTokens(testProjectId);
      assert.ok(list.service_tokens.length > 0);
      assert.ok(list.total >= list.service_tokens.length);

      const found = list.service_tokens.find((t) => t.id === createdTokenId);
      assert.notEqual(found, undefined, "Created token should appear in project listing");
      assert.equal(found?.status, "active");
      // Security check: raw secret and hash must NOT be in the listed DTO
      assert.equal((found as any).token, undefined, "Raw token must not appear in list response");
      assert.equal((found as any).token_hash, undefined, "Database hash must not be exposed to consumer");
    });

    it("should filter tokens by environment_id", async () => {
      const list = await projectServiceTokenService.listTokens(testProjectId, testEnvId);
      assert.ok(list.service_tokens.length > 0);
      for (const t of list.service_tokens) {
        assert.equal(t.environment_id, testEnvId);
      }
    });

    it("should retrieve safe token details by ID", async () => {
      const details = await projectServiceTokenService.getToken(testProjectId, createdTokenId);
      assert.equal(details.id, createdTokenId);
      assert.equal(details.name, "zomato-delivery-worker-token");
      assert.equal((details as any).token, undefined);
      assert.equal((details as any).token_hash, undefined);
    });

    it("should rotate token with grace period, activating successor and keeping predecessor expiring", async () => {
      const rotateRes = await projectServiceTokenService.rotateToken(testProjectId, createdTokenId, {
        grace_period_hours: 24,
      }, { forceSandbox: true });

      assert.ok(rotateRes.token, "New successor plaintext secret must be returned");
      assert.equal(validateServiceTokenFormat(rotateRes.token), true);
      assert.notEqual(rotateRes.token, rawSecretToken, "Successor token must have new entropy");
      assert.equal(rotateRes.service_token.status, "active");
      assert.equal(rotateRes.service_token.replaces_token_id, createdTokenId);

      // Predecessor must now be in expiring state
      const pred = await projectServiceTokenService.getToken(testProjectId, createdTokenId);
      assert.equal(pred.status, "expiring");
      assert.equal(pred.replaced_by_token_id, rotateRes.service_token.id);

      // Both predecessor and successor authenticate during grace period
      const predAuth = await projectServiceTokenService.testTokenAuth({
        testName: "Predecessor Auth in Grace Period",
        token: rawSecretToken,
        targetProjectId: testProjectId,
        targetEnvironmentId: testEnvId,
        expectedStatus: 200,
        forceSandbox: true,
      });
      assert.equal(predAuth.status, "PASS");

      const succAuth = await projectServiceTokenService.testTokenAuth({
        testName: "Successor Auth",
        token: rotateRes.token,
        targetProjectId: testProjectId,
        targetEnvironmentId: testEnvId,
        expectedStatus: 200,
        forceSandbox: true,
      });
      assert.equal(succAuth.status, "PASS");
    });

    it("should revoke token and immediately reject future authentication", async () => {
      // Create temporary token to revoke
      const temp = await projectServiceTokenService.createToken(testProjectId, {
        name: "temporary-revocation-token",
        environment_id: testEnvId,
        capabilities: ["models.read"],
      }, { forceSandbox: true });

      const revoked = await projectServiceTokenService.revokeToken(
        testProjectId,
        temp.service_token.id,
        "decommissioned in automated test",
        { forceSandbox: true }
      );
      assert.equal(revoked.status, "revoked");
      assert.equal(revoked.revocation_reason, "decommissioned in automated test");

      // Verify revoked token authentication is rejected with HTTP 401
      const authAttempt = await projectServiceTokenService.testTokenAuth({
        testName: "Revoked Token Rejection Check",
        token: temp.token,
        expectedStatus: 401,
        forceSandbox: true,
      });
      assert.equal(authAttempt.status, "PASS");
      assert.equal(authAttempt.http_status, 401);
    });

    it("should reject rotating an already revoked token", async () => {
      const temp = await projectServiceTokenService.createToken(testProjectId, {
        name: "revoked-cannot-rotate",
        environment_id: testEnvId,
        capabilities: ["models.read"],
      }, { forceSandbox: true });
      await projectServiceTokenService.revokeToken(testProjectId, temp.service_token.id, undefined, { forceSandbox: true });

      await assert.rejects(
        async () => {
          await projectServiceTokenService.rotateToken(testProjectId, temp.service_token.id, undefined, { forceSandbox: true });
        },
        /cannot rotate a revoked service token/
      );
    });
  });

  describe("3. Project & Environment Scoping Isolation Verification", () => {
    let scopedToken = "";

    before(async () => {
      const created = await projectServiceTokenService.createToken(testProjectId, {
        name: "scoping-test-token",
        environment_id: testEnvId,
        capabilities: ["models.read", "inference.execute"],
      }, { forceSandbox: true });
      scopedToken = created.token;
    });

    it("should allow access when project and environment match token container", async () => {
      const res = await projectServiceTokenService.testTokenAuth({
        testName: "Matching Tenant Scope",
        token: scopedToken,
        targetProjectId: testProjectId,
        targetEnvironmentId: testEnvId,
        expectedStatus: 200,
        forceSandbox: true,
      });
      assert.equal(res.status, "PASS");
      assert.equal(res.http_status, 200);
    });

    it("should reject cross-project access attempt (HTTP 403 Forbidden)", async () => {
      const foreignProjectId = "00000000-0000-4000-8000-111111111111";
      const res = await projectServiceTokenService.testTokenAuth({
        testName: "Cross-Project Access Violation",
        token: scopedToken,
        targetProjectId: foreignProjectId,
        targetEnvironmentId: testEnvId,
        expectedStatus: 403,
        forceSandbox: true,
      });
      assert.equal(res.status, "PASS");
      assert.equal(res.http_status, 403);
    });

    it("should reject environment isolation violation (HTTP 403 Forbidden)", async () => {
      const foreignEnvId = "00000000-0000-4000-8000-222222222222";
      const res = await projectServiceTokenService.testTokenAuth({
        testName: "Environment Isolation Violation",
        token: scopedToken,
        targetProjectId: testProjectId,
        targetEnvironmentId: foreignEnvId,
        expectedStatus: 403,
        forceSandbox: true,
      });
      assert.equal(res.status, "PASS");
      assert.equal(res.http_status, 403);
    });

    it("should enforce capability boundaries (HTTP 403 when capability missing)", async () => {
      const readOnly = await projectServiceTokenService.createToken(testProjectId, {
        name: "readonly-token-no-inference",
        environment_id: testEnvId,
        capabilities: ["models.read"], // Missing inference.execute
      }, { forceSandbox: true });

      // Allowed on models endpoint
      const modelRes = await projectServiceTokenService.testTokenAuth({
        testName: "Models Read Allowed",
        token: readOnly.token,
        targetProjectId: testProjectId,
        targetEnvironmentId: testEnvId,
        endpoint: "/v1/models",
        method: "GET",
        expectedStatus: 200,
        requireCapability: "models.read",
        forceSandbox: true,
      });
      assert.equal(modelRes.status, "PASS");

      // Blocked on chat completions
      const chatRes = await projectServiceTokenService.testTokenAuth({
        testName: "Inference Blocked Without Capability",
        token: readOnly.token,
        targetProjectId: testProjectId,
        targetEnvironmentId: testEnvId,
        endpoint: "/v1/chat/completions",
        method: "POST",
        expectedStatus: 403,
        requireCapability: "inference.execute",
        forceSandbox: true,
      });
      assert.equal(chatRes.status, "PASS");
      assert.equal(chatRes.http_status, 403);
    });
  });

  describe("4. Authentication Error Handling & Edge Cases", () => {
    it("should reject missing token with HTTP 401 Unauthorized", async () => {
      const res = await projectServiceTokenService.testTokenAuth({
        testName: "Missing Bearer Token",
        token: "",
        expectedStatus: 401,
      });
      assert.equal(res.status, "PASS");
      assert.equal(res.http_status, 401);
    });

    it("should reject malformed token with HTTP 401 Unauthorized", async () => {
      const res = await projectServiceTokenService.testTokenAuth({
        testName: "Malformed Bearer Token",
        token: "nm_st_invalid_syntax",
        expectedStatus: 401,
      });
      assert.equal(res.status, "PASS");
      assert.equal(res.http_status, 401);
    });

    it("should reject token with tampered entropy with HTTP 401 Unauthorized", async () => {
      const gen = generateTestServiceToken("TAMPER0001");
      const tamperedSecret = gen.secret.slice(0, -2) + "00";
      const tamperedToken = `nm_st_${gen.publicId}_${tamperedSecret}`;

      const res = await projectServiceTokenService.testTokenAuth({
        testName: "Tampered Secret Token",
        token: tamperedToken,
        expectedStatus: 401,
      });
      assert.equal(res.status, "PASS");
      assert.equal(res.http_status, 401);
    });
  });

  describe("5. Complete Auth & Isolation Test Matrix", () => {
    it("should execute runFullTestMatrix() with 100% pass rate across all 10 scenarios", async () => {
      const matrix = await projectServiceTokenService.runFullTestMatrix();
      assert.equal(matrix.total, 10, "Matrix must test all 10 standard scenarios");
      assert.equal(matrix.failed, 0, "No scenarios should fail");
      assert.equal(matrix.passed, 10, "All 10 scenarios must pass");

      for (const r of matrix.results) {
        assert.equal(r.status, "PASS", `Scenario '${r.name}' must pass`);
        assert.ok(r.duration_ms >= 0);
        assert.ok(r.request_id);
        assert.ok(r.correlation_id);
      }
    });
  });

  describe("6. Real-time Consumer Runtime Integration in Zomato AI Assistant", () => {
    it("should switch NaagmaniClient runtime credential to Project Service Token dynamically", async () => {
      const cloudAuth = await projectServiceTokenService.ensureCloudAuth();
      let pstToken: string;

      if (cloudAuth) {
        // Create real token via Cloud so live OS accepts it
        const liveRes = await projectServiceTokenService.createToken(
          "41088b35-0dab-45cd-86cf-ede6e68ff318",
          {
            name: "zomato-chat-live-token",
            environment_id: "9ccb1c2a-d984-4865-9ee6-84050110c104",
            capabilities: ["inference.execute", "models.read"],
          }
        );
        pstToken = liveRes.token;
      } else {
        const mockRes = await projectServiceTokenService.createToken(testProjectId, {
          name: "zomato-chat-runtime-token",
          environment_id: testEnvId,
          capabilities: ["inference.execute", "models.read"],
        }, { forceSandbox: true });
        pstToken = mockRes.token;
      }

      // Switch active token
      projectServiceTokenService.setActiveToken(pstToken);
      naagmaniClient.setAuthToken(pstToken);

      assert.equal(naagmaniClient.isUsingServiceToken(), true);
      assert.equal(naagmaniClient.getAuthToken(), pstToken);

      // Execute chat request with active Project Service Token
      const chatRes = await naagmaniClient.executeChat({
        customerId: "cust_1001",
        messages: [{ role: "user", content: "Where is my order ORD-1001?" }],
      });

      assert.equal(chatRes.success, true);
      const authStage = chatRes.lifecycle.find((s) => s.name === "Authentication");
      assert.notEqual(authStage, undefined);
      assert.equal(authStage?.status, "PASSED");
      assert.ok(authStage?.details?.includes("Project Service Token principal"));
    });
  });

  describe("7. Live Naagmani Infrastructure Integration (When Services Available)", () => {
    it("should verify end-to-end token creation on live Cloud and runtime validation on live OS", async () => {
      const isCloudLive = await projectServiceTokenService.isCloudAlive();
      const isOsLive = await projectServiceTokenService.isOsAlive();

      if (!isCloudLive || !isOsLive) {
        console.log("Skipping live integration test: Naagmani Cloud or OS not reachable");
        return;
      }

      const cloudAuth = await projectServiceTokenService.ensureCloudAuth();
      assert.notEqual(cloudAuth, null, "Must authenticate with live Cloud");

      // 1. Create token on live Cloud under Zomato project
      const created = await projectServiceTokenService.createToken(
        "41088b35-0dab-45cd-86cf-ede6e68ff318",
        {
          name: "e2e-live-verification-token",
          environment_id: "9ccb1c2a-d984-4865-9ee6-84050110c104",
          capabilities: ["models.read", "inference.execute"],
        }
      );

      assert.ok(created.token);
      assert.ok(created.token.startsWith("nm_st_"));
      assert.equal(created.service_token.status, "active");

      // 2. Authenticate directly against live Naagmani OS /v1/models
      const modelsRes = await projectServiceTokenService.testTokenAuth({
        testName: "Live OS GET /v1/models with PST",
        token: created.token,
        endpoint: "/v1/models",
        method: "GET",
        expectedStatus: 200,
      });
      assert.equal(modelsRes.status, "PASS");
      assert.equal(modelsRes.http_status, 200);

      // 3. Authenticate directly against live Naagmani OS /v1/chat/completions
      const chatRes = await projectServiceTokenService.testTokenAuth({
        testName: "Live OS POST /v1/chat/completions with PST",
        token: created.token,
        endpoint: "/v1/chat/completions",
        method: "POST",
        expectedStatus: 200,
      });
      assert.equal(chatRes.status, "PASS");
      assert.equal(chatRes.http_status, 200);

      // 4. Test live rotation on Cloud
      const rotated = await projectServiceTokenService.rotateToken(
        "41088b35-0dab-45cd-86cf-ede6e68ff318",
        created.service_token.id,
        { grace_period_hours: 1 }
      );
      assert.ok(rotated.token);
      assert.notEqual(rotated.token, created.token);

      // Successor token valid on live OS
      const succRes = await projectServiceTokenService.testTokenAuth({
        testName: "Live OS Successor Token Auth",
        token: rotated.token,
        endpoint: "/v1/models",
        method: "GET",
        expectedStatus: 200,
      });
      assert.equal(succRes.status, "PASS");

      // 5. Test live revocation on Cloud
      await projectServiceTokenService.revokeToken(
        "41088b35-0dab-45cd-86cf-ede6e68ff318",
        created.service_token.id,
        "cleanup test token"
      );

      // Revoked predecessor must be rejected on live OS (HTTP 401)
      const postRevokeRes = await projectServiceTokenService.testTokenAuth({
        testName: "Live OS Revoked Token Rejection",
        token: created.token,
        endpoint: "/v1/models",
        method: "GET",
        expectedStatus: 401,
      });
      assert.equal(postRevokeRes.status, "PASS");
      assert.equal(postRevokeRes.http_status, 401);
    });
  });
});
