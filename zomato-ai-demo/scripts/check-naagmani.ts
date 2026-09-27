import { naagmaniClient } from "../src/server/naagmani-client.js";
import { maskSecret } from "../src/server/onboarding.js";

async function main() {
  console.log("================================================================================");
  console.log("🔍 NAAGMANI SERVICES & CREDENTIAL CONNECTIVITY CHECK");
  console.log("================================================================================");

  const health = await naagmaniClient.checkHealth();
  const apiKey = naagmaniClient.config.apiKey;
  const maskedKey = maskSecret(apiKey, 8, 4);

  console.log(`📡 Naagmani OS Endpoint:    ${naagmaniClient.config.osUrl}`);
  console.log(`☁️  Naagmani Cloud Endpoint: ${naagmaniClient.config.cloudUrl}`);
  console.log(`🔑 Configured API Key:      ${maskedKey}`);
  console.log("--------------------------------------------------------------------------------");

  if (health.os) {
    console.log(`[PASS] Naagmani OS AI Runtime is ONLINE (v${health.osVersion || "0.1.0"})`);
  } else {
    console.log(`[FAIL] Naagmani OS AI Runtime is UNREACHABLE at ${naagmaniClient.config.osUrl}`);
  }

  if (health.cloud) {
    console.log(`[PASS] Naagmani Cloud Control Plane is ONLINE`);
  } else {
    console.log(`[WARN] Naagmani Cloud Control Plane is UNREACHABLE at ${naagmaniClient.config.cloudUrl}`);
  }

  // Verify runtime key against OS
  try {
    const res = await fetch(`${naagmaniClient.config.osUrl}/v1/models`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (res.ok) {
      console.log(`[PASS] API Key Authentication verified with Naagmani OS`);
    } else {
      console.log(`[WARN] API Key Authentication returned HTTP ${res.status}`);
    }
  } catch (err: any) {
    console.log(`[WARN] Could not test API Key against OS: ${err.message}`);
  }

  console.log("================================================================================");
}

main().catch((err) => {
  console.error("Check failed:", err);
  process.exit(1);
});
