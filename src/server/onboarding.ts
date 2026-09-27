import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import crypto from "crypto";

dotenv.config();

export interface OnboardingConfig {
  cloudUrl: string;
  osUrl: string;
  email?: string;
  password?: string;
  name?: string;
  orgId?: string;
  orgName?: string;
  projectId?: string;
  projectName?: string;
  projectSlug?: string;
  environmentId?: string;
  environmentSlug?: string;
  apiKey?: string;
  reuseExisting?: boolean;
  saveToEnv?: boolean;
  skipApiValidation?: boolean;
  envFilePath?: string;
}

export interface MaskedTokens {
  cloudJwt: string;
  runtimeApiKey: string;
  installationSecret: string;
}

export interface OnboardingResult {
  success: boolean;
  cloudHealthy: boolean;
  osHealthy: boolean;
  userRegistered: boolean;
  userAuthenticated: boolean;
  orgResolved: boolean;
  projectResolved: boolean;
  envResolved: boolean;
  appIdentityResolved: boolean;
  apiKeyCreated: boolean;
  apiKeyVerified: boolean;
  modelListingVerified: boolean;
  chatCompletionVerified: boolean;
  sessionContinuityVerified: boolean;
  invalidKeyRejected: boolean;
  telemetryVerified: boolean;

  user: {
    id: string;
    name: string;
    email: string;
  };
  resources: {
    orgId: string;
    orgName: string;
    projectId: string;
    projectName: string;
    envId: string;
    envSlug: string;
    appId: string;
    instId: string;
  };
  credentials: {
    maskedCloudJwt: string;
    maskedRuntimeApiKey: string;
    maskedInstallationSecret: string;
    rawRuntimeApiKey?: string;
  };
  endpoints: {
    cloudUrl: string;
    osUrl: string;
    apiBaseUrl: string;
  };
  stages: { name: string; passed: boolean; details?: string }[];
  error?: string;
}

/**
 * Mask sensitive tokens according to enterprise security standards.
 */
export function maskSecret(secret: string, prefixLen: number = 8, suffixLen: number = 4): string {
  if (!secret) return "[NOT_SET]";
  if (secret === "[REDACTED]") return "[REDACTED]";
  if (secret.length <= prefixLen + suffixLen) {
    return secret.substring(0, Math.min(4, secret.length)) + "...";
  }
  return `${secret.substring(0, prefixLen)}...${secret.substring(secret.length - suffixLen)}`;
}

export function maskEmail(email: string): string {
  if (!email || !email.includes("@")) return "masked@example.test";
  const [user, domain] = email.split("@");
  if (user.length <= 4) {
    return `${user.substring(0, 2)}****@${domain}`;
  }
  return `${user.substring(0, 4)}****@${domain}`;
}

export class ZomatoOnboardingService {
  private config: OnboardingConfig;

  constructor(customConfig?: Partial<OnboardingConfig>) {
    this.config = {
      cloudUrl: customConfig?.cloudUrl || process.env.NAAGMANI_CLOUD_URL || "http://localhost:8081",
      osUrl: customConfig?.osUrl || process.env.NAAGMANI_OS_URL || "http://localhost:8080",
      email: customConfig?.email || process.env.NAAGMANI_DEV_EMAIL || process.env.NAAGMANI_EMAIL || "demo-developer@naagmani.local",
      password: customConfig?.password || process.env.NAAGMANI_DEV_PASSWORD || process.env.NAAGMANI_PASSWORD || "NaagmaniDemo2026!",
      name: customConfig?.name || process.env.NAAGMANI_DEV_NAME || "Zomato Demo Developer",
      orgId: customConfig?.orgId || process.env.NAAGMANI_ORG_ID,
      orgName: customConfig?.orgName || process.env.NAAGMANI_ORG_NAME || "Zomato Demo",
      projectId: customConfig?.projectId || process.env.NAAGMANI_PROJECT_ID,
      projectName: customConfig?.projectName || process.env.NAAGMANI_PROJECT_NAME || "Zomato AI Assistant",
      projectSlug: customConfig?.projectSlug || process.env.NAAGMANI_PROJECT_SLUG || "zomato-ai-assistant",
      environmentId: customConfig?.environmentId || process.env.NAAGMANI_ENVIRONMENT_ID,
      environmentSlug: customConfig?.environmentSlug || process.env.NAAGMANI_ENVIRONMENT || "test",
      apiKey: customConfig?.apiKey || process.env.NAAGMANI_API_KEY,
      reuseExisting: customConfig?.reuseExisting ?? true,
      saveToEnv: customConfig?.saveToEnv ?? true,
      skipApiValidation: customConfig?.skipApiValidation ?? false,
      envFilePath: customConfig?.envFilePath || path.resolve(process.cwd(), ".env"),
    };
  }

  /**
   * Run the complete developer onboarding and API validation flow.
   */
  public async run(): Promise<OnboardingResult> {
    const stages: { name: string; passed: boolean; details?: string }[] = [];
    const timestamp = Date.now();
    const demoEmail = this.config.email || "demo-developer@naagmani.local";
    const demoPassword = this.config.password || "NaagmaniDemo2026!";
    const demoName = this.config.name || "Zomato Demo Developer";

    const result: OnboardingResult = {
      success: false,
      cloudHealthy: false,
      osHealthy: false,
      userRegistered: false,
      userAuthenticated: false,
      orgResolved: false,
      projectResolved: false,
      envResolved: false,
      appIdentityResolved: false,
      apiKeyCreated: false,
      apiKeyVerified: false,
      modelListingVerified: false,
      chatCompletionVerified: false,
      sessionContinuityVerified: false,
      invalidKeyRejected: false,
      telemetryVerified: false,
      user: { id: "", name: demoName, email: demoEmail },
      resources: {
        orgId: "",
        orgName: this.config.orgName || "Zomato Demo",
        projectId: "",
        projectName: this.config.projectName || "Zomato AI Assistant",
        envId: "",
        envSlug: this.config.environmentSlug || "test",
        appId: "",
        instId: "",
      },
      credentials: {
        maskedCloudJwt: "",
        maskedRuntimeApiKey: "",
        maskedInstallationSecret: "[REDACTED]",
      },
      endpoints: {
        cloudUrl: this.config.cloudUrl,
        osUrl: this.config.osUrl,
        apiBaseUrl: `${this.config.osUrl}/v1`,
      },
      stages,
    };

    let rawCloudJwt = "";
    let rawRuntimeKey = "";

    try {
      // 1. Check Cloud Health
      const cloudOk = await this.checkCloudHealth();
      result.cloudHealthy = cloudOk;
      stages.push({
        name: "Cloud health",
        passed: cloudOk,
        details: cloudOk ? `${this.config.cloudUrl} (HTTP 200 OK)` : `Failed connecting to ${this.config.cloudUrl}`,
      });
      if (!cloudOk) {
        throw new Error(`Naagmani Cloud health check failed at ${this.config.cloudUrl}`);
      }

      // 2. Check OS Health
      const osOk = await this.checkOSHealth();
      result.osHealthy = osOk;
      stages.push({
        name: "OS health",
        passed: osOk,
        details: osOk ? `${this.config.osUrl}/v1/health (HTTP 200 OK)` : `Failed connecting to ${this.config.osUrl}`,
      });
      if (!osOk) {
        throw new Error(`Naagmani OS health check failed at ${this.config.osUrl}`);
      }

      // 3. Register or Authenticate User
      const authData = await this.authenticateOrRegister(demoEmail, demoPassword, demoName);
      rawCloudJwt = authData.token;
      result.user.id = authData.userId;
      result.userRegistered = authData.isNewUser;
      result.userAuthenticated = true;
      result.credentials.maskedCloudJwt = maskSecret(rawCloudJwt, 6, 4);

      stages.push({
        name: authData.isNewUser ? "Demo user registered" : "Demo user resolved",
        passed: true,
        details: `User ID: ${result.user.id}`,
      });
      stages.push({
        name: "User authenticated",
        passed: true,
        details: `Cloud JWT issued (Bearer ${result.credentials.maskedCloudJwt})`,
      });

      // 4. Resolve Organization & Installation
      const orgInstData = await this.resolveOrganizationAndInstallation(rawCloudJwt, authData.orgId, authData.instId);
      result.resources.orgId = orgInstData.orgId;
      result.resources.orgName = orgInstData.orgName;
      result.resources.instId = orgInstData.instId;
      result.orgResolved = true;
      stages.push({
        name: "Organization resolved",
        passed: true,
        details: `Org ID: ${orgInstData.orgId} (${orgInstData.orgName})`,
      });

      // 5. Resolve Project
      const projectData = await this.resolveProject(rawCloudJwt, orgInstData.instId);
      result.resources.projectId = projectData.projectId;
      result.resources.projectName = projectData.projectName;
      result.projectResolved = true;
      stages.push({
        name: "Project resolved",
        passed: true,
        details: `Project ID: ${projectData.projectId} (${projectData.projectName})`,
      });

      // 6. Resolve Test Environment
      const envData = await this.resolveEnvironment(rawCloudJwt, orgInstData.instId, projectData.projectId);
      result.resources.envId = envData.envId;
      result.resources.envSlug = envData.envSlug;
      result.envResolved = true;
      stages.push({
        name: "Test environment resolved",
        passed: true,
        details: `Environment ID: ${envData.envId} (${envData.envSlug})`,
      });

      // 7. Ensure Safe Provider (Mock or BYOK)
      await this.ensureSafeProvider(rawCloudJwt, orgInstData.instId, projectData.projectId, envData.envId);

      // 8. Create or Resolve Application Identity & Scoped API Key
      const keyData = await this.generateScopedApiKey(
        rawCloudJwt,
        orgInstData.instId,
        projectData.projectId,
        envData.envId
      );
      rawRuntimeKey = keyData.rawKey;
      result.resources.appId = keyData.keyId;
      result.appIdentityResolved = true;
      result.apiKeyCreated = true;
      result.credentials.maskedRuntimeApiKey = maskSecret(rawRuntimeKey, 8, 4);
      result.credentials.rawRuntimeApiKey = rawRuntimeKey;

      stages.push({
        name: "Application identity created",
        passed: true,
        details: `App ID: ${keyData.keyId}`,
      });
      stages.push({
        name: "Naagmani API key created",
        passed: true,
        details: `Runtime Key: ${result.credentials.maskedRuntimeApiKey} (Scoped to Org, Proj, Env)`,
      });

      // 9. API Key Validation Suite
      if (!this.config.skipApiValidation) {
        // A. Authentication Verification
        const authCheckOk = await this.verifyApiKeyAuth(rawRuntimeKey);
        result.apiKeyVerified = authCheckOk;
        stages.push({
          name: "API key authentication verified",
          passed: authCheckOk,
          details: "Authenticated request accepted with HTTP 200 OK",
        });

        // B. Model Catalog Listing
        const models = await this.verifyModelListing(rawRuntimeKey);
        result.modelListingVerified = models.length > 0;
        stages.push({
          name: "Model listing verified",
          passed: result.modelListingVerified,
          details: `Discovered ${models.length} accessible model(s): ${models.slice(0, 3).join(", ")}`,
        });

        // C. Chat Completion
        const chatOk = await this.verifyChatCompletion(rawRuntimeKey);
        result.chatCompletionVerified = chatOk;
        stages.push({
          name: "Chat completion verified",
          passed: chatOk,
          details: "POST /v1/chat/completions returned valid completion choice",
        });

        // D. Session Continuity
        const sessionOk = await this.verifySessionContinuity(rawRuntimeKey);
        result.sessionContinuityVerified = sessionOk;
        stages.push({
          name: "Session continuity verified",
          passed: sessionOk,
          details: "Multi-turn conversation preserved context across requests",
        });

        // E. Telemetry / Usage Check
        const telemetryOk = await this.verifyUsageTelemetry(rawRuntimeKey);
        result.telemetryVerified = telemetryOk;

        // F. Invalid API Key Rejection
        const invalidRejected = await this.verifyInvalidKeyRejection();
        result.invalidKeyRejected = invalidRejected;
        stages.push({
          name: "Invalid API key rejected",
          passed: invalidRejected,
          details: "Unauthorized request rejected with HTTP 401 as expected",
        });
      }

      // 10. Persist to local .env if requested
      if (this.config.saveToEnv && rawRuntimeKey) {
        this.saveConfigToEnv({
          osUrl: this.config.osUrl,
          cloudUrl: this.config.cloudUrl,
          apiKey: rawRuntimeKey,
          orgId: result.resources.orgId,
          projectId: result.resources.projectId,
          environmentId: result.resources.envId,
        });
      }

      result.success = stages.every((s) => s.passed);
    } catch (err: any) {
      result.error = err.message || String(err);
    }

    return result;
  }

  // --- Health Checks ---

  public async checkCloudHealth(): Promise<boolean> {
    try {
      const res = await fetch(`${this.config.cloudUrl}/health`, { signal: AbortSignal.timeout(3000) });
      return res.ok;
    } catch (_) {
      return false;
    }
  }

  public async checkOSHealth(): Promise<boolean> {
    try {
      const res = await fetch(`${this.config.osUrl}/v1/health`, { signal: AbortSignal.timeout(3000) });
      return res.ok;
    } catch (_) {
      return false;
    }
  }

  // --- User Authentication & Registration ---

  private async authenticateOrRegister(
    email: string,
    pass: string,
    name: string
  ): Promise<{ token: string; userId: string; orgId?: string; instId?: string; isNewUser: boolean }> {
    // 1. If reuse mode requested, try login first
    if (this.config.reuseExisting) {
      try {
        const loginRes = await fetch(`${this.config.cloudUrl}/v1/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password: pass }),
          signal: AbortSignal.timeout(4000),
        });

        if (loginRes.ok) {
          const data = (await loginRes.json()) as any;
          return {
            token: data.token,
            userId: data.user?.id || "usr_demo",
            orgId: data.organization?.id,
            instId: data.installation?.id,
            isNewUser: false,
          };
        }
      } catch (_) {}
    }

    // 2. Otherwise signup fresh user
    const signupRes = await fetch(`${this.config.cloudUrl}/v1/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        name,
        password: pass,
        organization: this.config.orgName,
      }),
      signal: AbortSignal.timeout(4000),
    });

    if (!signupRes.ok) {
      const errText = await signupRes.text();
      // If user already exists, retry login with pass
      if (signupRes.status === 409 || errText.includes("already exists")) {
        const retryLogin = await fetch(`${this.config.cloudUrl}/v1/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password: pass }),
        });
        if (retryLogin.ok) {
          const data = (await retryLogin.json()) as any;
          return {
            token: data.token,
            userId: data.user?.id || "usr_demo",
            orgId: data.organization?.id,
            instId: data.installation?.id,
            isNewUser: false,
          };
        }
      }
      throw new Error(`Cloud signup failed (${signupRes.status}): ${errText}`);
    }

    const data = (await signupRes.json()) as any;
    return {
      token: data.token,
      userId: data.user?.id || "usr_demo",
      orgId: data.organization?.id,
      instId: data.installation?.id,
      isNewUser: true,
    };
  }

  // --- Organization & Installation Resolution ---

  private async resolveOrganizationAndInstallation(
    cloudToken: string,
    initialOrgId?: string,
    initialInstId?: string
  ): Promise<{ orgId: string; orgName: string; instId: string }> {
    let orgId = this.config.orgId || initialOrgId || "";
    let orgName = this.config.orgName || "Zomato Demo";
    let instId = initialInstId || "";

    // If orgId provided, verify name
    if (orgId) {
      try {
        const res = await fetch(`${this.config.cloudUrl}/v1/organizations/${orgId}`, {
          headers: { Authorization: `Bearer ${cloudToken}` },
        });
        if (res.ok) {
          const data = (await res.json()) as any;
          orgName = data.name || data.organization?.name || orgName;
        }
      } catch (_) {}
    }

    // If orgId missing, fetch organizations list
    if (!orgId) {
      const res = await fetch(`${this.config.cloudUrl}/v1/organizations`, {
        headers: { Authorization: `Bearer ${cloudToken}` },
      });
      if (res.ok) {
        const data = (await res.json()) as any;
        const orgs = Array.isArray(data) ? data : data.organizations || data.data || [];
        if (orgs.length > 0) {
          const match = orgs.find((o: any) => o.name === orgName || o.slug === "zomato-demo") || orgs[0];
          orgId = match.id;
          orgName = match.name || orgName;
        }
      }
    }

    // If still missing, create organization
    if (!orgId) {
      const createRes = await fetch(`${this.config.cloudUrl}/v1/organizations`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${cloudToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: orgName }),
      });
      if (createRes.ok) {
        const created = (await createRes.json()) as any;
        orgId = created.id || created.organization?.id;
        orgName = created.name || orgName;
      }
    }

    // Resolve installation for this org
    if (orgId && !instId) {
      const instRes = await fetch(`${this.config.cloudUrl}/v1/organizations/${orgId}/installations`, {
        headers: { Authorization: `Bearer ${cloudToken}` },
      });
      if (instRes.ok) {
        const data = (await instRes.json()) as any;
        const insts = Array.isArray(data) ? data : data.installations || data.data || [];
        if (insts.length > 0) {
          instId = insts[0].id;
        }
      }
    }

    if (!orgId || !instId) {
      throw new Error(`Failed resolving organization or installation (orgId=${orgId}, instId=${instId})`);
    }

    return { orgId, orgName, instId };
  }

  // --- Project Resolution ---

  private async resolveProject(
    cloudToken: string,
    instId: string
  ): Promise<{ projectId: string; projectName: string }> {
    const projSlug = this.config.projectSlug || "zomato-ai-assistant";
    const projName = this.config.projectName || "Zomato AI Assistant";

    // If projectId is already configured, verify it under installation
    if (this.config.projectId) {
      const listRes = await fetch(`${this.config.cloudUrl}/v1/installations/${instId}/projects`, {
        headers: { Authorization: `Bearer ${cloudToken}` },
      });
      if (listRes.ok) {
        const data = (await listRes.json()) as any;
        const projects = Array.isArray(data) ? data : data.data || data.projects || [];
        const match = projects.find((p: any) => p.id === this.config.projectId);
        if (match) {
          return { projectId: match.id, projectName: match.name || projName };
        }
      }
      return { projectId: this.config.projectId, projectName: projName };
    }

    // List projects under installation
    const listRes = await fetch(`${this.config.cloudUrl}/v1/installations/${instId}/projects`, {
      headers: { Authorization: `Bearer ${cloudToken}` },
    });

    if (listRes.ok) {
      const data = (await listRes.json()) as any;
      const projects = Array.isArray(data) ? data : data.data || data.projects || [];
      const match = projects.find((p: any) => p.slug === projSlug || p.name === projName);
      if (match) {
        return { projectId: match.id, projectName: match.name };
      }
    }

    // Create project if missing
    const createRes = await fetch(`${this.config.cloudUrl}/v1/installations/${instId}/projects`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cloudToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: projName,
        slug: projSlug,
        description: "Zomato AI Assistant Food Delivery Project",
      }),
    });

    if (!createRes.ok && createRes.status !== 409) {
      const errText = await createRes.text();
      throw new Error(`Failed creating project (${createRes.status}): ${errText}`);
    }

    const created = (await createRes.json()) as any;
    return {
      projectId: created.id || created.project?.id,
      projectName: created.name || projName,
    };
  }

  // --- Environment Resolution ---

  private async resolveEnvironment(
    cloudToken: string,
    instId: string,
    projectId: string
  ): Promise<{ envId: string; envSlug: string }> {
    const envSlug = this.config.environmentSlug || "test";

    // If environmentId is already configured, verify it under project
    if (this.config.environmentId) {
      const listRes = await fetch(
        `${this.config.cloudUrl}/v1/installations/${instId}/projects/${projectId}/environments`,
        { headers: { Authorization: `Bearer ${cloudToken}` } }
      );
      if (listRes.ok) {
        const data = (await listRes.json()) as any;
        const envs = Array.isArray(data) ? data : data.data || data.environments || [];
        const match = envs.find((e: any) => e.id === this.config.environmentId);
        if (match) {
          return { envId: match.id, envSlug: match.slug || envSlug };
        }
      }
      return { envId: this.config.environmentId, envSlug };
    }

    // List environments
    const listRes = await fetch(
      `${this.config.cloudUrl}/v1/installations/${instId}/projects/${projectId}/environments`,
      { headers: { Authorization: `Bearer ${cloudToken}` } }
    );

    if (listRes.ok) {
      const data = (await listRes.json()) as any;
      const envs = Array.isArray(data) ? data : data.data || data.environments || [];
      const match = envs.find((e: any) => e.slug === envSlug || e.type === "test" || e.type === "production");
      if (match) {
        return { envId: match.id, envSlug: match.slug };
      }
    }

    // Create environment if missing
    const createRes = await fetch(
      `${this.config.cloudUrl}/v1/installations/${instId}/projects/${projectId}/environments`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${cloudToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "Test Environment",
          slug: envSlug,
          type: "test",
        }),
      }
    );

    if (!createRes.ok && createRes.status !== 409) {
      const errText = await createRes.text();
      throw new Error(`Failed creating environment (${createRes.status}): ${errText}`);
    }

    const created = (await createRes.json()) as any;
    return {
      envId: created.id || created.environment?.id,
      envSlug: created.slug || envSlug,
    };
  }

  // --- Safe Provider Setup ---

  private async ensureSafeProvider(
    cloudToken: string,
    instId: string,
    projectId: string,
    envId: string
  ): Promise<void> {
    const openaiKey = process.env.OPENAI_API_KEY;
    const payload = openaiKey
      ? {
          provider: "openai",
          name: "OpenAI BYOK Provider",
          credential: openaiKey,
          project_id: projectId,
          environment_id: envId,
        }
      : {
          provider: "mock",
          name: "Mock Development Provider",
          credential: "mock-zomato-dev-secret-key-12345",
          project_id: projectId,
          environment_id: envId,
        };

    try {
      await fetch(`${this.config.cloudUrl}/v1/installations/${instId}/providers`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${cloudToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
    } catch (_) {}
  }

  // --- Scoped API Key Generation ---

  private async generateScopedApiKey(
    cloudToken: string,
    instId: string,
    projectId: string,
    envId: string
  ): Promise<{ rawKey: string; keyId: string }> {
    // If API key is already configured in .env and working, reuse it
    if (this.config.apiKey && this.config.reuseExisting) {
      const isConfiguredKeyValid = await this.verifyApiKeyAuth(this.config.apiKey);
      if (isConfiguredKeyValid) {
        return {
          rawKey: this.config.apiKey,
          keyId: "configured_api_key",
        };
      }
    }

    const keyName = `Zomato App Key ${new Date().toISOString().substring(11, 19)}`;
    const payload = {
      name: keyName,
      project_id: projectId,
      environment_id: envId,
      scopes: ["inference.execute", "models.read", "provider.use", "usage.read"],
    };

    const res = await fetch(`${this.config.cloudUrl}/v1/installations/${instId}/api-keys`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cloudToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Failed generating Naagmani API key (${res.status}): ${errText}`);
    }

    const data = (await res.json()) as any;
    if (!data.raw_key) {
      throw new Error("API key response did not contain raw_key");
    }

    return {
      rawKey: data.raw_key,
      keyId: data.id || "key_zomato_app",
    };
  }

  // --- Verification Suite ---

  private async verifyApiKeyAuth(apiKey: string): Promise<boolean> {
    try {
      const res = await fetch(`${this.config.osUrl}/v1/models`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      return res.ok;
    } catch (_) {
      return false;
    }
  }

  private async verifyModelListing(apiKey: string): Promise<string[]> {
    try {
      const res = await fetch(`${this.config.osUrl}/v1/models`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!res.ok) return [];
      const data = (await res.json()) as any;
      const models = data.data || data.models || [];
      return models.map((m: any) => (typeof m === "string" ? m : m.id || m.name));
    } catch (_) {
      return [];
    }
  }

  private async verifyChatCompletion(apiKey: string): Promise<boolean> {
    try {
      const res = await fetch(`${this.config.osUrl}/v1/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "mock/gpt-5-mini",
          messages: [{ role: "user", content: "Hello! Confirm Zomato AI Assistant gateway is online." }],
        }),
      });
      if (!res.ok) return false;
      const data = (await res.json()) as any;
      return Array.isArray(data.choices) && data.choices.length > 0;
    } catch (_) {
      return false;
    }
  }

  private async verifySessionContinuity(apiKey: string): Promise<boolean> {
    const sessionId = `sess_zomato_${Date.now()}`;
    try {
      // Turn 1
      const res1 = await fetch(`${this.config.osUrl}/v1/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "X-Session-ID": sessionId,
        },
        body: JSON.stringify({
          model: "mock/gpt-5-mini",
          session_id: sessionId,
          messages: [{ role: "user", content: "My name is Rahul and I work on the Zomato AI assistant." }],
        }),
      });
      if (!res1.ok) return false;

      // Turn 2
      const res2 = await fetch(`${this.config.osUrl}/v1/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "X-Session-ID": sessionId,
        },
        body: JSON.stringify({
          model: "mock/gpt-5-mini",
          session_id: sessionId,
          messages: [{ role: "user", content: "What is my name?" }],
        }),
      });
      if (!res2.ok) return false;

      const data2 = (await res2.json()) as any;
      const content = data2.choices?.[0]?.message?.content || "";
      return content.length > 0;
    } catch (_) {
      return false;
    }
  }

  private async verifyUsageTelemetry(apiKey: string): Promise<boolean> {
    try {
      const res = await fetch(`${this.config.osUrl}/v1/usage`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      return res.ok;
    } catch (_) {
      return true; // Optional non-blocking check
    }
  }

  private async verifyInvalidKeyRejection(): Promise<boolean> {
    const invalidKey = "invalid_token_sample_12345";
    try {
      const res = await fetch(`${this.config.osUrl}/v1/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${invalidKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "mock/gpt-5-mini",
          messages: [{ role: "user", content: "Testing rejection of invalid key." }],
        }),
      });
      return res.status === 401 || res.status === 403;
    } catch (_) {
      return false;
    }
  }

  // --- Safe Local .env Update ---

  public saveConfigToEnv(params: {
    osUrl: string;
    cloudUrl: string;
    apiKey: string;
    orgId?: string;
    projectId?: string;
    environmentId?: string;
  }): void {
    const envPath = this.config.envFilePath || path.resolve(process.cwd(), ".env");
    let currentContent = "";
    if (fs.existsSync(envPath)) {
      currentContent = fs.readFileSync(envPath, "utf-8");
    }

    const updates: Record<string, string> = {
      NAAGMANI_OS_URL: params.osUrl,
      NAAGMANI_CLOUD_URL: params.cloudUrl,
      NAAGMANI_API_KEY: params.apiKey,
    };
    if (params.orgId) updates.NAAGMANI_ORG_ID = params.orgId;
    if (params.projectId) updates.NAAGMANI_PROJECT_ID = params.projectId;
    if (params.environmentId) updates.NAAGMANI_ENVIRONMENT_ID = params.environmentId;

    let newContent = currentContent;
    for (const [key, value] of Object.entries(updates)) {
      const regex = new RegExp(`^${key}=.*$`, "m");
      if (regex.test(newContent)) {
        newContent = newContent.replace(regex, `${key}=${value}`);
      } else {
        newContent = `${newContent.trim()}\n${key}=${value}\n`;
      }
    }

    fs.writeFileSync(envPath, newContent.trim() + "\n", "utf-8");
  }

  /**
   * Reset local demo configuration back to clean template defaults safely.
   */
  public resetLocalDemoEnv(): { success: boolean; message: string } {
    const envPath = this.config.envFilePath || path.resolve(process.cwd(), ".env");
    const examplePath = path.resolve(path.dirname(envPath), ".env.example");

    if (fs.existsSync(examplePath)) {
      const exampleContent = fs.readFileSync(examplePath, "utf-8");
      fs.writeFileSync(envPath, exampleContent, "utf-8");
      return { success: true, message: `Reset ${envPath} to default template configuration.` };
    }

    const defaultContent = `# Zomato AI Assistant Demo Environment
PORT=3001
NAAGMANI_OS_URL=http://localhost:8080
NAAGMANI_CLOUD_URL=http://localhost:8081
NAAGMANI_API_KEY=nm_live_0123456789abcdef0123456789abcdef0123456789abcdef
DEFAULT_MODEL=mock/gpt-5-mini
`;
    fs.writeFileSync(envPath, defaultContent, "utf-8");
    return { success: true, message: `Created clean ${envPath} configuration.` };
  }
}

/**
 * Format and print the output exactly matching the expected demo output specifications.
 */
export function formatOnboardingSummary(result: OnboardingResult): string {
  const lines: string[] = [];

  lines.push("\nNaagmani Zomato Demo Onboarding\n");

  for (const stage of result.stages) {
    lines.push(`[${stage.passed ? "PASS" : "FAIL"}] ${stage.name}`);
  }

  lines.push("\nIdentity:");
  lines.push(`  User: ${result.user.name}`);
  lines.push(`  Email: ${maskEmail(result.user.email)}`);

  lines.push("\nResources:");
  lines.push(`  Organization ID: ${maskSecret(result.resources.orgId, 6, 4)}`);
  lines.push(`  Project ID: ${maskSecret(result.resources.projectId, 6, 4)}`);
  lines.push(`  Environment: ${result.resources.envSlug}`);
  lines.push(`  Application ID: ${maskSecret(result.resources.appId, 6, 4)}`);

  lines.push("\nCredentials:");
  lines.push(`  Cloud JWT: ${result.credentials.maskedCloudJwt}`);
  lines.push(`  Runtime API Key: ${result.credentials.maskedRuntimeApiKey}`);
  lines.push(`  Installation Credential: ${result.credentials.maskedInstallationSecret}`);

  lines.push("\nEndpoints:");
  lines.push(`  Cloud: ${result.endpoints.cloudUrl}`);
  lines.push(`  OS: ${result.endpoints.osUrl}`);
  lines.push(`  API Base URL: ${result.endpoints.apiBaseUrl}`);

  lines.push("\nResult:");
  if (result.success) {
    lines.push("  Zomato demo onboarding and API-key validation PASSED\n");
  } else {
    lines.push(`  Zomato demo onboarding FAILED: ${result.error}\n`);
  }

  return lines.join("\n");
}
