import "dotenv/config";
import { activateSchedulerV2Cohort } from "../src/lib/scheduler/schedulerV2";

function readPercentage() {
  const raw = process.argv.find((argument) => argument.startsWith("--percentage="));
  const value = raw ? Number(raw.split("=")[1]) : undefined;
  if (value == null || !Number.isFinite(value) || value < 0 || value > 100) {
    throw new Error("Use --percentage=<0..100>. Exemplo: npm run scheduler:v2:rollout -- --percentage=5");
  }
  return value;
}

async function main() {
  const result = await activateSchedulerV2Cohort({ rolloutPercentage: readPercentage() });
  console.log("Scheduler V2 cohort activated", result);
}

main().catch((error) => {
  console.error("scheduler_v2_rollout_failed", error);
  process.exitCode = 1;
});
