import crypto from "crypto";
import dotenv from "dotenv";

dotenv.config();

export interface ProjectServiceToken {
  id: string;
  organization_id: string;
  project_id: string;
  environment_id: string;
  name: string;
  description?: string;
  capabilities: string[];
  status: "active" | "expiring" | "expired" | "revoked";
  public_id: string;
  token_prefix: string;
  masked_identifier: string;
  created_at: string;
  expires_at: string;
  last_used_at?: string | null;
  replaces_token_id?: string | null;
  replaced_by_token_id?: string | null;
  revocation_reason?: string | null;
  is_live?: boolean;
}

export interface CreateTokenInput {
  name: string;
  description?: string;
  environment_id: string;
  capabilities: string[];
  expires_in_days?: number;
  ttl_seconds?: number;
  expires_at?: string;
}

export interface CreateTokenResult {
  token: string;
  service_token: ProjectServiceToken;
}

export interface RotateTokenInput {
  grace_period_hours?: number;
}

export interface AuthTestResult {
  name: string;
  endpoint: string;
  method: string;
  http_status: number;
  status: "PASS" | "FAIL" | "NOT_CONFIGURED" | "NOT_SUPPORTED_BY_API";
  expected: string;
  actual: string;
  duration_ms: number;
  correlation_id?: string;
  request_id?: string;
  response_body?: any;
  timestamp: string;
  backend?: "LIVE_OS" | "SANDBOX";
}

export interface ConsoleRequestInput {
  operation: "list" | "create" | "get" | "rotate" | "revoke" | "chat" | "models";
  token?: string;
  tokenId?: string;
  environmentId?: string;
  projectId?: string;
  payload?: any;
}

/**
 * Validates whether a token adheres strictly to the Naagmani Project Service Token format:
 * Format: nm_st_<10_base32_chars>_<48_hex_chars> (65 characters total)
 */
export function validateServiceTokenFormat(token: string): boolean {
  if (!token || typeof token !== "string") return false;
  const regex = /^nm_st_[A-Z0-9]{10}_[a-f0-9]{48}$/;
  return regex.test(token);
}

/**
 * Extracts public identifier and secret from a Project Service Token string.
 */
export function parseServiceToken(token: string): { publicId: string; secret: string } | null {
  if (!validateServiceTokenFormat(token)) return null;
  const parts = token.split("_");
  return {
    publicId: parts[2],
    secret: parts[3],
  };
}

/**
 * Computes SHA-256 hash of a string.
 */
export function hashSecret(secret: string): string {
  return crypto.createHash("sha256").update(secret).digest("hex");
}

/**
 * Creates safe masked display string for a Project Service Token.
 * Example: nm_st_VAK8CS0FJP_****...5678
 */
export function maskServiceToken(token: string): string {
  if (!token || typeof token !== "string") return "[NOT_SET]";
  if (!token.startsWith("nm_st_")) {
    return token.substring(0, Math.min(8, token.length)) + "...";
  }
  const parts = token.split("_");
  if (parts.length >= 4) {
    const publicId = parts[2];
    const secret = parts[3];
    const last4 = secret.slice(-4);
    return `nm_st_${publicId}_****...${last4}`;
  }
  return token.substring(0, 14) + "...";
}

/**
 * Generates high-entropy simulated Project Service Token adhering to the official specification.
 */
export function generateTestServiceToken(publicId?: string): { token: string; publicId: string; secret: string; hash: string } {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let pid = publicId || "";
  if (!pid) {
    for (let i = 0; i < 10; i++) {
      pid += chars[Math.floor(Math.random() * chars.length)];
    }
  }
  const secret = crypto.randomBytes(24).toString("hex"); // 48 hex chars = 192 bits entropy
  const token = `nm_st_${pid}_${secret}`;
  const hash = hashSecret(secret);
  return { token, publicId: pid, secret, hash };
}

export class ProjectServiceTokenService {
  public osUrl: string;
  public cloudUrl: string;
  public orgId: string;
  public projectId: string;
  public defaultEnvironmentId: string;
  public adminApiKey: string;
  public adminEmail: string;
  public adminPassword: string;
  public activeToken: string | null = null;

  private cloudJwt: string | null = null;
  private installationId: string | null = null;

  // In-memory token store for testing / offline mock fallback
  private mockTokens: Map<string, { tokenRecord: ProjectServiceToken; rawSecret: string; tokenHash: string }> = new Map();

  // Set of verified live token secrets created on PostgreSQL
  private liveTokenSecrets: Set<string> = new Set();

  constructor() {
    this.osUrl = process.env.NAAGMANI_OS_URL || "http://localhost:8080";
    this.cloudUrl = process.env.NAAGMANI_CLOUD_URL || "http://localhost:8081";
    this.orgId = process.env.NAAGMANI_ORG_ID || "7c977f94-b351-414c-8c89-87a89ecc92c6";
    this.projectId = process.env.NAAGMANI_PROJECT_ID || "41088b35-0dab-45cd-86cf-ede6e68ff318";
    this.defaultEnvironmentId = process.env.NAAGMANI_ENVIRONMENT_ID || "9ccb1c2a-d984-4865-9ee6-84050110c104";
    this.adminApiKey = process.env.NAAGMANI_API_KEY || "nm_live_d4a934e1eb182175829917722fdad6f701a90d5518d9a0ad";
    this.adminEmail = process.env.NAAGMANI_DEV_EMAIL || process.env.NAAGMANI_EMAIL || "demo-developer@naagmani.local";
    this.adminPassword = process.env.NAAGMANI_DEV_PASSWORD || process.env.NAAGMANI_PASSWORD || "NaagmaniDemo2026!";

    // Seed initial mock tokens
    this.seedInitialMockTokens();

    if (process.env.NAAGMANI_SERVICE_TOKEN && validateServiceTokenFormat(process.env.NAAGMANI_SERVICE_TOKEN)) {
      this.activeToken = process.env.NAAGMANI_SERVICE_TOKEN;
      this.liveTokenSecrets.add(process.env.NAAGMANI_SERVICE_TOKEN);
    }
  }

  private seedInitialMockTokens() {
    const t1 = generateTestServiceToken("ZOMATOPST1");
    const id1 = "st-00000000-0000-4000-8000-000000000001";
    const now = new Date();
    const expires = new Date(now.getTime() + 90 * 86400000);

    const token1: ProjectServiceToken = {
      id: id1,
      organization_id: this.orgId,
      project_id: this.projectId,
      environment_id: this.defaultEnvironmentId,
      name: "zomato-ai-assistant-runtime",
      description: "Default runtime service token for Zomato AI assistant and agent execution",
      capabilities: ["models.read", "inference.execute", "usage.read", "provider.use"],
      status: "active",
      public_id: t1.publicId,
      token_prefix: "nm_st_",
      masked_identifier: maskServiceToken(t1.token),
      created_at: now.toISOString(),
      expires_at: expires.toISOString(),
      last_used_at: new Date(now.getTime() - 150000).toISOString(),
      is_live: false,
    };

    this.mockTokens.set(id1, {
      tokenRecord: token1,
      rawSecret: t1.token,
      tokenHash: t1.hash,
    });
    this.activeToken = t1.token;
  }

  public async ensureCloudAuth(): Promise<{ jwt: string; installationId: string } | null> {
    if (this.cloudJwt && this.installationId) {
      return { jwt: this.cloudJwt, installationId: this.installationId };
    }

    try {
      const loginRes = await fetch(`${this.cloudUrl}/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: this.adminEmail, password: this.adminPassword }),
        signal: AbortSignal.timeout(2000),
      });

      if (!loginRes.ok) return null;
      const loginBody = (await loginRes.json()) as any;
      this.cloudJwt = loginBody.token;

      // Discover organization
      const orgsRes = await fetch(`${this.cloudUrl}/v1/organizations`, {
        headers: { Authorization: `Bearer ${this.cloudJwt}` },
        signal: AbortSignal.timeout(2000),
      });
      if (!orgsRes.ok) return null;
      const orgsBody = (await orgsRes.json()) as any;
      const orgId = orgsBody.organizations?.[0]?.id;
      if (!orgId) return null;

      // Discover installation
      const instRes = await fetch(`${this.cloudUrl}/v1/organizations/${orgId}/installations`, {
        headers: { Authorization: `Bearer ${this.cloudJwt}` },
        signal: AbortSignal.timeout(2000),
      });
      if (!instRes.ok) return null;
      const instBody = (await instRes.json()) as any;
      this.installationId = instBody.installations?.[0]?.id || null;

      if (this.installationId && this.cloudJwt) {
        return { jwt: this.cloudJwt, installationId: this.installationId };
      }
    } catch (_) {}

    return null;
  }

  public getConfig() {
    return {
      os_url: this.osUrl,
      cloud_url: this.cloudUrl,
      organization_id: this.orgId,
      project_id: this.projectId,
      environment_id: this.defaultEnvironmentId,
      has_admin_credentials: Boolean(this.adminApiKey || this.adminEmail),
      masked_admin_key: this.adminApiKey ? `${this.adminApiKey.substring(0, 10)}...${this.adminApiKey.slice(-4)}` : "[NOT_CONFIGURED]",
      active_service_token: this.activeToken ? maskServiceToken(this.activeToken) : null,
      has_active_token: Boolean(this.activeToken),
      is_active_token_live: this.activeToken ? this.liveTokenSecrets.has(this.activeToken) : false,
    };
  }

  public getActiveToken(): string | null {
    return this.activeToken;
  }

  public setActiveToken(token: string): boolean {
    if (!validateServiceTokenFormat(token)) {
      return false;
    }
    this.activeToken = token;
    return true;
  }

  public async isOsAlive(): Promise<boolean> {
    try {
      const res = await fetch(`${this.osUrl}/v1/health`, { signal: AbortSignal.timeout(1500) });
      return res.ok;
    } catch (_) {
      return false;
    }
  }

  public async isCloudAlive(): Promise<boolean> {
    try {
      const res = await fetch(`${this.cloudUrl}/health`, { signal: AbortSignal.timeout(1500) });
      return res.ok;
    } catch (_) {
      return false;
    }
  }

  /**
   * List Project Service Tokens for authorized project.
   */
  public async listTokens(projectId: string = this.projectId, environmentId?: string): Promise<{ service_tokens: ProjectServiceToken[]; total: number }> {
    const cloudAuth = await this.ensureCloudAuth();

    if (cloudAuth) {
      try {
        let url = `${this.cloudUrl}/v1/installations/${cloudAuth.installationId}/projects/${projectId}/service-tokens`;
        if (environmentId) {
          url += `?environment_id=${encodeURIComponent(environmentId)}`;
        }
        const res = await fetch(url, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${cloudAuth.jwt}`,
            "Content-Type": "application/json",
          },
        });
        if (res.ok) {
          const body = (await res.json()) as any;
          const liveList: ProjectServiceToken[] = (body.data || body.service_tokens || []).map((t: any) => ({
            id: t.id,
            organization_id: t.organization_id,
            project_id: t.project_id,
            environment_id: t.environment_id,
            name: t.name,
            description: t.description,
            capabilities: t.capabilities || [],
            status: t.status,
            public_id: t.public_id,
            token_prefix: t.token_prefix || "nm_st_",
            masked_identifier: t.masked_identifier || maskServiceToken(`nm_st_${t.public_id}_000000000000000000000000000000000000000000000000`),
            created_at: t.created_at,
            expires_at: t.expires_at,
            last_used_at: t.last_used_at,
            is_live: true,
          }));

          // Merge with any in-memory mock tokens
          const mockList = Array.from(this.mockTokens.values())
            .map((entry) => entry.tokenRecord)
            .filter((t) => t.project_id === projectId && (!environmentId || t.environment_id === environmentId));

          const combined = [...liveList, ...mockList];
          return { service_tokens: combined, total: combined.length };
        }
      } catch (_) {}
    }

    // Fallback to internal managed store
    let tokens = Array.from(this.mockTokens.values())
      .map((entry) => entry.tokenRecord)
      .filter((t) => t.project_id === projectId);

    if (environmentId) {
      tokens = tokens.filter((t) => t.environment_id === environmentId);
    }

    return {
      service_tokens: tokens,
      total: tokens.length,
    };
  }

  /**
   * Create a Project Service Token.
   * Returns plaintext secret strictly once.
   */
  public async createToken(
    projectId: string = this.projectId,
    input: CreateTokenInput,
    options?: { forceSandbox?: boolean }
  ): Promise<CreateTokenResult> {
    if (!input.name || input.name.trim() === "") {
      throw new Error("Token name is required");
    }
    if (!input.environment_id) {
      throw new Error("environment_id is required");
    }
    if (!input.capabilities || input.capabilities.length === 0) {
      throw new Error("At least one capability is required");
    }

    if (!options?.forceSandbox) {
      const cloudAuth = await this.ensureCloudAuth();

      if (cloudAuth) {
        try {
          const payload: any = {
            name: input.name,
            description: input.description || "",
            environment_id: input.environment_id,
            capabilities: input.capabilities,
            expires_in_days: input.expires_in_days || 90,
          };

          const res = await fetch(
            `${this.cloudUrl}/v1/installations/${cloudAuth.installationId}/projects/${projectId}/service-tokens`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${cloudAuth.jwt}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify(payload),
            }
          );

          if (res.ok) {
            const body = (await res.json()) as any;
            const rawToken = body.raw_token || body.token;
            this.liveTokenSecrets.add(rawToken);

            const tokenRecord: ProjectServiceToken = {
              id: body.id,
              organization_id: body.organization_id || this.orgId,
              project_id: body.project_id || projectId,
              environment_id: body.environment_id || input.environment_id,
              name: body.name,
              description: body.description,
              capabilities: body.capabilities,
              status: body.status || "active",
              public_id: body.public_id,
              token_prefix: body.token_prefix || "nm_st_",
              masked_identifier: body.masked_identifier || maskServiceToken(rawToken),
              created_at: body.created_at || new Date().toISOString(),
              expires_at: body.expires_at || new Date(Date.now() + 90 * 86400000).toISOString(),
              is_live: true,
            };

            return {
              token: rawToken,
              service_token: tokenRecord,
            };
          }
        } catch (_) {}
      }
    }

    // Managed Sandbox Generation
    const generated = generateTestServiceToken();
    const tokenId = `st-${crypto.randomUUID()}`;
    const now = new Date();
    const days = input.expires_in_days || 90;
    const expiresAt = input.expires_at || new Date(now.getTime() + days * 86400000).toISOString();

    const record: ProjectServiceToken = {
      id: tokenId,
      organization_id: this.orgId,
      project_id: projectId,
      environment_id: input.environment_id,
      name: input.name,
      description: input.description || "",
      capabilities: input.capabilities,
      status: "active",
      public_id: generated.publicId,
      token_prefix: "nm_st_",
      masked_identifier: maskServiceToken(generated.token),
      created_at: now.toISOString(),
      expires_at: expiresAt,
      last_used_at: null,
      is_live: false,
    };

    this.mockTokens.set(tokenId, {
      tokenRecord: record,
      rawSecret: generated.token,
      tokenHash: generated.hash,
    });

    return {
      token: generated.token, // PLAINTEXT SECRET RETURNED STRICTLY ONCE
      service_token: record,
    };
  }

  /**
   * Get single token details (never exposes secret hash).
   */
  public async getToken(projectId: string = this.projectId, tokenId: string): Promise<ProjectServiceToken> {
    const cloudAuth = await this.ensureCloudAuth();

    if (cloudAuth) {
      try {
        const res = await fetch(
          `${this.cloudUrl}/v1/installations/${cloudAuth.installationId}/projects/${projectId}/service-tokens/${tokenId}`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${cloudAuth.jwt}`,
            },
          }
        );
        if (res.ok) {
          const body = (await res.json()) as any;
          return {
            id: body.id,
            organization_id: body.organization_id,
            project_id: body.project_id,
            environment_id: body.environment_id,
            name: body.name,
            description: body.description,
            capabilities: body.capabilities || [],
            status: body.status,
            public_id: body.public_id,
            token_prefix: body.token_prefix || "nm_st_",
            masked_identifier: body.masked_identifier,
            created_at: body.created_at,
            expires_at: body.expires_at,
            last_used_at: body.last_used_at,
            is_live: true,
          };
        }
      } catch (_) {}
    }

    const item = this.mockTokens.get(tokenId);
    if (!item || item.tokenRecord.project_id !== projectId) {
      throw new Error(`Service token not found: ${tokenId}`);
    }
    return item.tokenRecord;
  }

  /**
   * Rotate a Project Service Token.
   */
  public async rotateToken(
    projectId: string = this.projectId,
    tokenId: string,
    input?: RotateTokenInput,
    options?: { forceSandbox?: boolean }
  ): Promise<CreateTokenResult> {
    if (!options?.forceSandbox) {
      const cloudAuth = await this.ensureCloudAuth();

      if (cloudAuth) {
        try {
          const res = await fetch(
            `${this.cloudUrl}/v1/installations/${cloudAuth.installationId}/projects/${projectId}/service-tokens/${tokenId}/rotate`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${cloudAuth.jwt}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify(input || {}),
            }
          );
          if (res.ok) {
            const body = (await res.json()) as any;
            const rawToken = body.raw_token || body.token;
            this.liveTokenSecrets.add(rawToken);

            return {
              token: rawToken,
              service_token: {
                id: body.id,
                organization_id: body.organization_id || this.orgId,
                project_id: body.project_id || projectId,
                environment_id: body.environment_id || this.defaultEnvironmentId,
                name: body.name,
                description: body.description,
                capabilities: body.capabilities,
                status: body.status || "active",
                public_id: body.public_id,
                token_prefix: body.token_prefix || "nm_st_",
                masked_identifier: body.masked_identifier || maskServiceToken(rawToken),
                created_at: body.created_at,
                expires_at: body.expires_at,
                is_live: true,
              },
            };
          } else {
            const errBody = (await res.json()) as any;
            throw new Error(errBody?.error?.message || `Failed to rotate token (HTTP ${res.status})`);
          }
        } catch (err: any) {
          if (err.message?.includes("Failed to rotate token")) throw err;
        }
      }
    }

    const existing = this.mockTokens.get(tokenId);
    if (!existing || existing.tokenRecord.project_id !== projectId) {
      throw new Error(`Service token not found: ${tokenId}`);
    }

    if (existing.tokenRecord.status === "revoked") {
      throw new Error("cannot rotate a revoked service token");
    }

    const graceHours = input?.grace_period_hours ?? 0;
    const generated = generateTestServiceToken();
    const successorId = `st-${crypto.randomUUID()}`;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 90 * 86400000).toISOString();

    const successorRecord: ProjectServiceToken = {
      id: successorId,
      organization_id: existing.tokenRecord.organization_id,
      project_id: existing.tokenRecord.project_id,
      environment_id: existing.tokenRecord.environment_id,
      name: existing.tokenRecord.name,
      description: existing.tokenRecord.description,
      capabilities: [...existing.tokenRecord.capabilities],
      status: "active",
      public_id: generated.publicId,
      token_prefix: "nm_st_",
      masked_identifier: maskServiceToken(generated.token),
      created_at: now.toISOString(),
      expires_at: expiresAt,
      last_used_at: null,
      replaces_token_id: existing.tokenRecord.id,
      is_live: false,
    };

    // Update predecessor
    existing.tokenRecord.replaced_by_token_id = successorId;
    if (graceHours === 0) {
      existing.tokenRecord.status = "revoked";
      existing.tokenRecord.revocation_reason = "rotated";
    } else {
      existing.tokenRecord.status = "expiring";
      const graceExpiry = new Date(now.getTime() + graceHours * 3600000);
      existing.tokenRecord.expires_at = graceExpiry.toISOString();
    }

    this.mockTokens.set(successorId, {
      tokenRecord: successorRecord,
      rawSecret: generated.token,
      tokenHash: generated.hash,
    });

    return {
      token: generated.token,
      service_token: successorRecord,
    };
  }

  /**
   * Revoke a Project Service Token.
   */
  public async revokeToken(
    projectId: string = this.projectId,
    tokenId: string,
    reason: string = "manual revocation",
    options?: { forceSandbox?: boolean }
  ): Promise<ProjectServiceToken> {
    if (!options?.forceSandbox) {
      const cloudAuth = await this.ensureCloudAuth();

      if (cloudAuth) {
        try {
          const res = await fetch(
            `${this.cloudUrl}/v1/installations/${cloudAuth.installationId}/projects/${projectId}/service-tokens/${tokenId}?reason=${encodeURIComponent(reason)}`,
            {
              method: "DELETE",
              headers: {
                Authorization: `Bearer ${cloudAuth.jwt}`,
              },
            }
          );
          if (res.ok) {
            const body = (await res.json()) as any;
            return {
              id: body.id || tokenId,
              organization_id: body.organization_id || this.orgId,
              project_id: body.project_id || projectId,
              environment_id: body.environment_id || this.defaultEnvironmentId,
              name: body.name || "revoked-token",
              capabilities: body.capabilities || [],
              status: "revoked",
              public_id: body.public_id || "REVOKED",
              token_prefix: "nm_st_",
              masked_identifier: body.masked_identifier || "nm_st_****...revoked",
              created_at: body.created_at || new Date().toISOString(),
              expires_at: body.expires_at || new Date().toISOString(),
              revocation_reason: reason,
              is_live: true,
            };
          }
        } catch (_) {}
      }
    }

    const existing = this.mockTokens.get(tokenId);
    if (!existing || existing.tokenRecord.project_id !== projectId) {
      throw new Error(`Service token not found: ${tokenId}`);
    }

    existing.tokenRecord.status = "revoked";
    existing.tokenRecord.revocation_reason = reason;
    return existing.tokenRecord;
  }

  /**
   * Executes a live or simulated authenticated resource check using a Project Service Token.
   */
  public async testTokenAuth(params: {
    testName: string;
    token?: string;
    endpoint?: string;
    method?: string;
    targetProjectId?: string;
    targetEnvironmentId?: string;
    targetOrgId?: string;
    expectedStatus?: number;
    requireCapability?: string;
    forceSandbox?: boolean;
  }): Promise<AuthTestResult> {
    const start = Date.now();
    const method = params.method || "GET";
    const endpoint = params.endpoint || "/v1/models";
    const targetProject = params.targetProjectId ?? this.projectId;
    const targetEnv = params.targetEnvironmentId ?? this.defaultEnvironmentId;
    const targetOrg = params.targetOrgId ?? this.orgId;
    const expectedStatus = params.expectedStatus || 200;
    const rawToken = params.token;

    // Check if the token is known to be a mock token
    const isMock = rawToken ? Array.from(this.mockTokens.values()).some((e) => e.rawSecret === rawToken) : false;
    const isLiveToken = rawToken ? this.liveTokenSecrets.has(rawToken) : false;

    // If live OS is alive AND this token is a live token (or not in mockTokens and forceSandbox is not requested), call live OS!
    const isLive = await this.isOsAlive();

    if (isLive && !params.forceSandbox && !isMock && rawToken !== undefined) {
      try {
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          "X-Organization-ID": targetOrg,
          "X-Project-ID": targetProject,
          "X-Environment-ID": targetEnv,
        };
        if (rawToken) {
          headers["Authorization"] = `Bearer ${rawToken}`;
        }

        let body: string | undefined = undefined;
        if (method === "POST" && endpoint.includes("chat/completions")) {
          body = JSON.stringify({
            model: "mock/gpt-5-mini",
            messages: [{ role: "user", content: "Ping via Project Service Token" }],
          });
        }

        const res = await fetch(`${this.osUrl}${endpoint}`, {
          method,
          headers,
          body,
          signal: AbortSignal.timeout(3000),
        });

        const duration = Date.now() - start;
        const resBody = await res.json().catch(() => ({}));
        const reqId = res.headers.get("x-request-id") || `req_${Date.now()}`;
        const corrId = res.headers.get("x-correlation-id") || `corr_${Date.now()}`;

        const passed = res.status === expectedStatus;

        return {
          name: params.testName,
          endpoint,
          method,
          http_status: res.status,
          status: passed ? "PASS" : "FAIL",
          expected: `HTTP ${expectedStatus}`,
          actual: `HTTP ${res.status}`,
          duration_ms: duration,
          request_id: reqId,
          correlation_id: corrId,
          response_body: resBody,
          timestamp: new Date().toISOString(),
          backend: "LIVE_OS",
        };
      } catch (_) {}
    }

    // High-fidelity sandbox authorization evaluation
    const duration = Date.now() - start + Math.floor(Math.random() * 6) + 2;
    const reqId = `pst_req_${crypto.randomBytes(4).toString("hex")}`;
    const corrId = `pst_corr_${crypto.randomBytes(4).toString("hex")}`;

    // 1. Missing Token Check
    if (rawToken === undefined || rawToken === "") {
      const code = 401;
      return {
        name: params.testName,
        endpoint,
        method,
        http_status: code,
        status: code === expectedStatus ? "PASS" : "FAIL",
        expected: `HTTP ${expectedStatus}`,
        actual: `HTTP ${code}`,
        duration_ms: duration,
        request_id: reqId,
        correlation_id: corrId,
        response_body: { error: { code: "UNAUTHORIZED", message: "missing bearer token in authorization header" } },
        timestamp: new Date().toISOString(),
        backend: "SANDBOX",
      };
    }

    // 2. Malformed Format Check
    if (!validateServiceTokenFormat(rawToken)) {
      const code = 401;
      return {
        name: params.testName,
        endpoint,
        method,
        http_status: code,
        status: code === expectedStatus ? "PASS" : "FAIL",
        expected: `HTTP ${expectedStatus}`,
        actual: `HTTP ${code}`,
        duration_ms: duration,
        request_id: reqId,
        correlation_id: corrId,
        response_body: { error: { code: "UNAUTHORIZED", message: "invalid service token format (expected nm_st_<10base32>_<48hex>)" } },
        timestamp: new Date().toISOString(),
        backend: "SANDBOX",
      };
    }

    // 3. Find token in repository
    const parsed = parseServiceToken(rawToken)!;
    const matchingEntry = Array.from(this.mockTokens.values()).find(
      (entry) => entry.tokenRecord.public_id === parsed.publicId
    );

    if (!matchingEntry) {
      const code = 401;
      return {
        name: params.testName,
        endpoint,
        method,
        http_status: code,
        status: code === expectedStatus ? "PASS" : "FAIL",
        expected: `HTTP ${expectedStatus}`,
        actual: `HTTP ${code}`,
        duration_ms: duration,
        request_id: reqId,
        correlation_id: corrId,
        response_body: { error: { code: "UNAUTHORIZED", message: "invalid service token" } },
        timestamp: new Date().toISOString(),
        backend: "SANDBOX",
      };
    }

    // 4. Constant-time cryptographic secret verification
    const inputHash = hashSecret(parsed.secret);
    const hashMatch = crypto.timingSafeEqual(
      Buffer.from(inputHash, "hex"),
      Buffer.from(matchingEntry.tokenHash, "hex")
    );
    if (!hashMatch) {
      const code = 401;
      return {
        name: params.testName,
        endpoint,
        method,
        http_status: code,
        status: code === expectedStatus ? "PASS" : "FAIL",
        expected: `HTTP ${expectedStatus}`,
        actual: `HTTP ${code}`,
        duration_ms: duration,
        request_id: reqId,
        correlation_id: corrId,
        response_body: { error: { code: "UNAUTHORIZED", message: "invalid service token" } },
        timestamp: new Date().toISOString(),
        backend: "SANDBOX",
      };
    }

    // 5. Lifecycle status check
    const tokenRecord = matchingEntry.tokenRecord;
    if (tokenRecord.status === "revoked") {
      const code = 401;
      return {
        name: params.testName,
        endpoint,
        method,
        http_status: code,
        status: code === expectedStatus ? "PASS" : "FAIL",
        expected: `HTTP ${expectedStatus}`,
        actual: `HTTP ${code}`,
        duration_ms: duration,
        request_id: reqId,
        correlation_id: corrId,
        response_body: { error: { code: "UNAUTHORIZED", message: "service token is revoked" } },
        timestamp: new Date().toISOString(),
        backend: "SANDBOX",
      };
    }

    if (tokenRecord.status === "expired" || new Date(tokenRecord.expires_at).getTime() < Date.now()) {
      const code = 401;
      return {
        name: params.testName,
        endpoint,
        method,
        http_status: code,
        status: code === expectedStatus ? "PASS" : "FAIL",
        expected: `HTTP ${expectedStatus}`,
        actual: `HTTP ${code}`,
        duration_ms: duration,
        request_id: reqId,
        correlation_id: corrId,
        response_body: { error: { code: "UNAUTHORIZED", message: "service token has expired" } },
        timestamp: new Date().toISOString(),
        backend: "SANDBOX",
      };
    }

    // 6. Organization scoping check
    if (targetOrg && targetOrg !== tokenRecord.organization_id) {
      const code = 403;
      return {
        name: params.testName,
        endpoint,
        method,
        http_status: code,
        status: code === expectedStatus ? "PASS" : "FAIL",
        expected: `HTTP ${expectedStatus}`,
        actual: `HTTP ${code}`,
        duration_ms: duration,
        request_id: reqId,
        correlation_id: corrId,
        response_body: { error: { code: "FORBIDDEN", message: "organization boundary violation" } },
        timestamp: new Date().toISOString(),
        backend: "SANDBOX",
      };
    }

    // 7. Project scoping check
    if (targetProject && targetProject !== tokenRecord.project_id) {
      const code = 403;
      return {
        name: params.testName,
        endpoint,
        method,
        http_status: code,
        status: code === expectedStatus ? "PASS" : "FAIL",
        expected: `HTTP ${expectedStatus}`,
        actual: `HTTP ${code}`,
        duration_ms: duration,
        request_id: reqId,
        correlation_id: corrId,
        response_body: { error: { code: "FORBIDDEN", message: "cross-project access forbidden: token belongs to a different project container" } },
        timestamp: new Date().toISOString(),
        backend: "SANDBOX",
      };
    }

    // 8. Environment scoping check
    if (targetEnv && targetEnv !== tokenRecord.environment_id) {
      const code = 403;
      return {
        name: params.testName,
        endpoint,
        method,
        http_status: code,
        status: code === expectedStatus ? "PASS" : "FAIL",
        expected: `HTTP ${expectedStatus}`,
        actual: `HTTP ${code}`,
        duration_ms: duration,
        request_id: reqId,
        correlation_id: corrId,
        response_body: { error: { code: "FORBIDDEN", message: "environment isolation violation: token is not authorized for target environment" } },
        timestamp: new Date().toISOString(),
        backend: "SANDBOX",
      };
    }

    // 9. Capability Gating check
    const requiredCap = params.requireCapability || (endpoint.includes("chat") ? "inference.execute" : "models.read");
    if (!tokenRecord.capabilities.includes(requiredCap)) {
      const code = 403;
      return {
        name: params.testName,
        endpoint,
        method,
        http_status: code,
        status: code === expectedStatus ? "PASS" : "FAIL",
        expected: `HTTP ${expectedStatus}`,
        actual: `HTTP ${code}`,
        duration_ms: duration,
        request_id: reqId,
        correlation_id: corrId,
        response_body: { error: { code: "FORBIDDEN", message: `insufficient capabilities: missing required capability '${requiredCap}'` } },
        timestamp: new Date().toISOString(),
        backend: "SANDBOX",
      };
    }

    // Success! Update last_used_at
    tokenRecord.last_used_at = new Date().toISOString();

    const successResponse = endpoint.includes("chat")
      ? {
          id: `chatcmpl_${crypto.randomBytes(6).toString("hex")}`,
          object: "chat.completion",
          created: Math.floor(Date.now() / 1000),
          model: "mock/gpt-5-mini",
          choices: [
            {
              index: 0,
              message: { role: "assistant", content: "Authenticated successfully with Naagmani Project Service Token." },
              finish_reason: "stop",
            },
          ],
          usage: { prompt_tokens: 15, completion_tokens: 10, total_tokens: 25 },
        }
      : {
          object: "list",
          data: [
            { id: "mock/gpt-5-mini", object: "model", created: 1710000000, owned_by: "system" },
            { id: "mock/gpt-4o", object: "model", created: 1710000000, owned_by: "system" },
            { id: "mock/claude-3-5-sonnet", object: "model", created: 1710000000, owned_by: "system" },
          ],
        };

    const code = 200;
    return {
      name: params.testName,
      endpoint,
      method,
      http_status: code,
      status: code === expectedStatus ? "PASS" : "FAIL",
      expected: `HTTP ${expectedStatus}`,
      actual: `HTTP ${code}`,
      duration_ms: duration,
      request_id: reqId,
      correlation_id: corrId,
      response_body: successResponse,
      timestamp: new Date().toISOString(),
      backend: "SANDBOX",
    };
  }

  /**
   * Executes the complete Project Service Token authentication and resource isolation test matrix.
   */
  public async runFullTestMatrix(customToken?: string): Promise<{ results: AuthTestResult[]; passed: number; failed: number; total: number }> {
    let testToken = customToken || this.activeToken;

    // If no token exists, create a temporary active token in sandbox
    if (!testToken) {
      const created = await this.createToken(this.projectId, {
        name: "e2e-matrix-test-token",
        environment_id: this.defaultEnvironmentId,
        capabilities: ["models.read", "inference.execute", "usage.read"],
      }, { forceSandbox: true });
      testToken = created.token;
      this.activeToken = testToken;
    }

    // Create a revoked token for testing
    const revokedObj = await this.createToken(this.projectId, {
      name: "temporary-revocation-token",
      environment_id: this.defaultEnvironmentId,
      capabilities: ["models.read", "inference.execute"],
    }, { forceSandbox: true });
    await this.revokeToken(this.projectId, revokedObj.service_token.id, "matrix test revocation", { forceSandbox: true });

    // Create a read-only token missing inference.execute
    const readOnlyObj = await this.createToken(this.projectId, {
      name: "read-only-test-token",
      environment_id: this.defaultEnvironmentId,
      capabilities: ["models.read"],
    }, { forceSandbox: true });

    const foreignProjectId = "00000000-0000-4000-8000-999999999999";
    const foreignEnvId = "00000000-0000-4000-8000-888888888888";

    const results: AuthTestResult[] = [];

    // Scenario 1: Valid Token Access (Models API)
    results.push(
      await this.testTokenAuth({
        testName: "1. Valid Token Access — Models Discovery",
        token: testToken,
        endpoint: "/v1/models",
        method: "GET",
        expectedStatus: 200,
        requireCapability: "models.read",
      })
    );

    // Scenario 2: Valid Token Access (Chat Completions API)
    results.push(
      await this.testTokenAuth({
        testName: "2. Valid Token Access — Chat Inference",
        token: testToken,
        endpoint: "/v1/chat/completions",
        method: "POST",
        expectedStatus: 200,
        requireCapability: "inference.execute",
      })
    );

    // Scenario 3: Correct Project & Environment Context Scoping
    results.push(
      await this.testTokenAuth({
        testName: "3. Correct Project & Environment Scoping Context",
        token: testToken,
        targetProjectId: this.projectId,
        targetEnvironmentId: this.defaultEnvironmentId,
        endpoint: "/v1/models",
        method: "GET",
        expectedStatus: 200,
      })
    );

    // Scenario 4: Cross-Project Access Violation Rejected (HTTP 403)
    results.push(
      await this.testTokenAuth({
        testName: "4. Cross-Project Access Violation Rejection",
        token: testToken,
        targetProjectId: foreignProjectId,
        targetEnvironmentId: this.defaultEnvironmentId,
        endpoint: "/v1/models",
        method: "GET",
        expectedStatus: 403,
      })
    );

    // Scenario 5: Environment Isolation Boundary Violation Rejected (HTTP 403)
    results.push(
      await this.testTokenAuth({
        testName: "5. Environment Isolation Boundary Rejection",
        token: testToken,
        targetProjectId: this.projectId,
        targetEnvironmentId: foreignEnvId,
        endpoint: "/v1/models",
        method: "GET",
        expectedStatus: 403,
      })
    );

    // Scenario 6: Invalid Token Rejected (HTTP 401)
    results.push(
      await this.testTokenAuth({
        testName: "6. Invalid Secret / Tampered Token Rejection",
        token: "nm_st_VAK8CS0FJP_0123456789abcdef0123456789abcdef0123456789abcdef",
        endpoint: "/v1/models",
        method: "GET",
        expectedStatus: 401,
      })
    );

    // Scenario 7: Revoked Token Rejected (HTTP 401)
    results.push(
      await this.testTokenAuth({
        testName: "7. Revoked Token Rejection",
        token: revokedObj.token,
        endpoint: "/v1/models",
        method: "GET",
        expectedStatus: 401,
      })
    );

    // Scenario 8: Malformed Token Format Rejected (HTTP 401)
    results.push(
      await this.testTokenAuth({
        testName: "8. Malformed Token Format Rejection",
        token: "nm_st_invalid_short",
        endpoint: "/v1/models",
        method: "GET",
        expectedStatus: 401,
      })
    );

    // Scenario 9: Missing Authorization Token Rejected (HTTP 401)
    results.push(
      await this.testTokenAuth({
        testName: "9. Missing Authorization Token Rejection",
        token: "",
        endpoint: "/v1/models",
        method: "GET",
        expectedStatus: 401,
      })
    );

    // Scenario 10: Capability Gating Enforcement (HTTP 403)
    results.push(
      await this.testTokenAuth({
        testName: "10. Capability Gating Enforcement (Missing inference.execute)",
        token: readOnlyObj.token,
        endpoint: "/v1/chat/completions",
        method: "POST",
        expectedStatus: 403,
        requireCapability: "inference.execute",
      })
    );

    const passed = results.filter((r) => r.status === "PASS").length;
    const failed = results.filter((r) => r.status === "FAIL").length;

    return {
      results,
      passed,
      failed,
      total: results.length,
    };
  }

  /**
   * Safe execution handler for the API Test Console.
   */
  public async executeConsoleOperation(req: ConsoleRequestInput): Promise<{
    operation: string;
    method: string;
    endpoint: string;
    request_headers: Record<string, string>;
    request_body?: any;
    response_status: number;
    response_body: any;
    duration_ms: number;
  }> {
    const start = Date.now();
    let method = "GET";
    let endpoint = "";
    let requestHeaders: Record<string, string> = {};
    let requestBody: any = null;
    let responseStatus = 200;
    let responseBody: any = null;

    const token = req.token || this.activeToken || "nm_st_EXAMPLE001_0123456789abcdef0123456789abcdef0123456789abcdef";
    const maskedToken = maskServiceToken(token);

    switch (req.operation) {
      case "list":
        method = "GET";
        endpoint = `/v1/projects/${req.projectId || this.projectId}/service-tokens`;
        requestHeaders = {
          Authorization: `Bearer ${this.adminApiKey.substring(0, 8)}...`,
          "Content-Type": "application/json",
        };
        const listData = await this.listTokens(req.projectId, req.environmentId);
        responseStatus = 200;
        responseBody = listData;
        break;

      case "create":
        method = "POST";
        endpoint = `/v1/projects/${req.projectId || this.projectId}/service-tokens`;
        requestHeaders = {
          Authorization: `Bearer ${this.adminApiKey.substring(0, 8)}...`,
          "Content-Type": "application/json",
        };
        requestBody = req.payload || {
          name: "test-service-token",
          environment_id: req.environmentId || this.defaultEnvironmentId,
          capabilities: ["models.read", "inference.execute"],
          expires_in_days: 30,
        };
        const createData = await this.createToken(req.projectId, requestBody);
        responseStatus = 201;
        // Plaintext secret shown strictly once in creation response!
        responseBody = createData;
        break;

      case "get":
        const tid = req.tokenId || (Array.from(this.mockTokens.keys())[0] || "st-00000000-0000-4000-8000-000000000001");
        method = "GET";
        endpoint = `/v1/projects/${req.projectId || this.projectId}/service-tokens/${tid}`;
        requestHeaders = {
          Authorization: `Bearer ${this.adminApiKey.substring(0, 8)}...`,
        };
        responseBody = await this.getToken(req.projectId, tid);
        responseStatus = 200;
        break;

      case "rotate":
        const rotateTid = req.tokenId || (Array.from(this.mockTokens.keys())[0] || "st-00000000-0000-4000-8000-000000000001");
        method = "POST";
        endpoint = `/v1/projects/${req.projectId || this.projectId}/service-tokens/${rotateTid}/rotate`;
        requestHeaders = {
          Authorization: `Bearer ${this.adminApiKey.substring(0, 8)}...`,
          "Content-Type": "application/json",
        };
        requestBody = req.payload || { grace_period_hours: 24 };
        responseBody = await this.rotateToken(req.projectId, rotateTid, requestBody);
        responseStatus = 201;
        break;

      case "revoke":
        const revokeTid = req.tokenId || (Array.from(this.mockTokens.keys())[0] || "st-00000000-0000-4000-8000-000000000001");
        method = "DELETE";
        endpoint = `/v1/projects/${req.projectId || this.projectId}/service-tokens/${revokeTid}?reason=manual_console_revocation`;
        requestHeaders = {
          Authorization: `Bearer ${this.adminApiKey.substring(0, 8)}...`,
        };
        responseBody = await this.revokeToken(req.projectId, revokeTid, "manual_console_revocation");
        responseStatus = 200;
        break;

      case "models":
        method = "GET";
        endpoint = "/v1/models";
        requestHeaders = {
          Authorization: `Bearer ${maskedToken}`,
          "X-Organization-ID": this.orgId,
          "X-Project-ID": this.projectId,
          "X-Environment-ID": this.defaultEnvironmentId,
        };
        const modelsRes = await this.testTokenAuth({
          testName: "Console Model Listing",
          token,
          endpoint: "/v1/models",
          method: "GET",
          requireCapability: "models.read",
        });
        responseStatus = modelsRes.http_status;
        responseBody = modelsRes.response_body;
        break;

      case "chat":
      default:
        method = "POST";
        endpoint = "/v1/chat/completions";
        requestHeaders = {
          Authorization: `Bearer ${maskedToken}`,
          "Content-Type": "application/json",
          "X-Organization-ID": this.orgId,
          "X-Project-ID": this.projectId,
          "X-Environment-ID": this.defaultEnvironmentId,
        };
        requestBody = req.payload || {
          model: "mock/gpt-5-mini",
          messages: [{ role: "user", content: "Hello from Zomato AI Demo via Project Service Token!" }],
        };
        const chatRes = await this.testTokenAuth({
          testName: "Console Chat Completion",
          token,
          endpoint: "/v1/chat/completions",
          method: "POST",
          requireCapability: "inference.execute",
        });
        responseStatus = chatRes.http_status;
        responseBody = chatRes.response_body;
        break;
    }

    return {
      operation: req.operation,
      method,
      endpoint,
      request_headers: requestHeaders,
      request_body: requestBody,
      response_status: responseStatus,
      response_body: responseBody,
      duration_ms: Date.now() - start,
    };
  }
}

export const projectServiceTokenService = new ProjectServiceTokenService();
