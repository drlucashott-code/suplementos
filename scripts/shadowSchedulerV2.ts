import "dotenv/config";
import { recordSchedulerV2ShadowDecisions } from "../src/lib/scheduler/schedulerV2";
import { schedulerConfig } from "../src/lib/scheduler/scheduler.config";

async function main() {
  if (!schedulerConfig.flags.shadowMode) {
    throw new Error("Defina SCHEDULER_V2_SHADOW_MODE=true para executar o shadow mode.");
  }

  const count = await recordSchedulerV2ShadowDecisions();
  console.log(`Scheduler V2 shadow decisions recorded: ${count}`);
}

main().catch((error) => {
  console.error("scheduler_v2_shadow_failed", error);
  process.exitCode = 1;
});
