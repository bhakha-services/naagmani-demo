import dotenv from "dotenv";
import { ZomatoOnboardingService, formatOnboardingSummary } from "../src/server/onboarding.js";

dotenv.config();

function getArgValue(args: string[], flag: string): string | undefined {
  const idx = args.indexOf(flag);
  if (idx !== -1 && idx < args.length - 1) {
    return args[idx + 1];
  }
  return undefined;
}

async function main() {
  const args = process.argv.slice(2);
  const freshMode = args.includes("--fresh") || args.includes("--new-user");
  const skipVerify = args.includes("--skip-verify");

  const emailArg =
    getArgValue(args, "--email") ||
    (freshMode ? undefined : process.env.NAAGMANI_DEV_EMAIL || process.env.NAAGMANI_EMAIL || "demo-developer@naagmani.local");
  const passwordArg =
    getArgValue(args, "--password") ||
    (freshMode ? undefined : process.env.NAAGMANI_DEV_PASSWORD || process.env.NAAGMANI_PASSWORD || "NaagmaniDemo2026!");
  const projectArg = getArgValue(args, "--project") || process.env.NAAGMANI_PROJECT_NAME || "Zomato AI Assistant";
  const orgArg = getArgValue(args, "--org") || process.env.NAAGMANI_ORG_NAME;
  const orgIdArg = getArgValue(args, "--org-id") || (freshMode ? undefined : process.env.NAAGMANI_ORG_ID);
  const projectIdArg = getArgValue(args, "--project-id") || (freshMode ? undefined : process.env.NAAGMANI_PROJECT_ID);
  const envIdArg = getArgValue(args, "--env-id") || (freshMode ? undefined : process.env.NAAGMANI_ENVIRONMENT_ID);
  const apiKeyArg = getArgValue(args, "--api-key") || (freshMode ? undefined : process.env.NAAGMANI_API_KEY);

  console.log("================================================================================");
  console.log("🍕 NAAGMANI ZOMATO AI DEMO — COMPLETE ONBOARDING & API VALIDATION");
  console.log("================================================================================");

  const onboarding = new ZomatoOnboardingService({
    email: emailArg,
    password: passwordArg,
    orgId: orgIdArg,
    orgName: orgArg,
    projectId: projectIdArg,
    projectName: projectArg,
    environmentId: envIdArg,
    apiKey: apiKeyArg,
    reuseExisting: !freshMode,
    skipApiValidation: skipVerify,
    saveToEnv: true,
  });

  const result = await onboarding.run();
  console.log(formatOnboardingSummary(result));

  if (!result.success) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Fatal error during demo onboarding:", err);
  process.exit(1);
});
