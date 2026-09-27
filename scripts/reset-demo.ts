import { ZomatoOnboardingService } from "../src/server/onboarding.js";

async function main() {
  console.log("================================================================================");
  console.log("🔄 NAAGMANI ZOMATO AI DEMO — SAFE LOCAL DEMO RESET");
  console.log("================================================================================");

  const onboarding = new ZomatoOnboardingService();
  const res = onboarding.resetLocalDemoEnv();

  if (res.success) {
    console.log(`[PASS] ${res.message}`);
    console.log("Local demo configuration has been safely restored to clean template defaults.");
  } else {
    console.log(`[FAIL] ${res.message}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Reset failed:", err);
  process.exit(1);
});
