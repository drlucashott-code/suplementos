import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { schedulerConfig } from "../src/lib/scheduler/scheduler.config";
import { computeFailureRetryAt } from "../src/lib/scheduler/schedulerRuntime";

/**
 * Reconciliacao operacional unica: aplica o backoff V2 a falhas que ja
 * existiam antes da ativacao. Nunca antecipa uma agenda; apenas posterga
 * tentativas que ocorreriam antes do backoff calculado.
 */
async function main() {
  const now = new Date();
  const maximumBackoffAt = computeFailureRetryAt({
    completedAt: now,
    failureCount: Number.MAX_SAFE_INTEGER,
    firstRetryMinutes: schedulerConfig.failures.firstRetryMinutes,
    maximumRetryMinutes: schedulerConfig.failures.maximumRetryMinutes,
  });
  const eligibleLock = [{ refreshLockUntil: null }, { refreshLockUntil: { lte: now } }];
  const failureGroups = await prisma.dynamicProduct.groupBy({
    by: ["refreshFailCount"],
    where: {
      schedulerVersion: schedulerConfig.policyVersion,
      refreshFailCount: { gt: 0 },
      OR: eligibleLock,
    },
    _count: { _all: true },
  });

  let updated = 0;
  const groups = [] as Array<{ failures: number; products: number; retryAt: string; updated: number }>;

  for (const group of failureGroups) {
    const retryAt = computeFailureRetryAt({
      completedAt: now,
      failureCount: group.refreshFailCount,
      firstRetryMinutes: schedulerConfig.failures.firstRetryMinutes,
      maximumRetryMinutes: schedulerConfig.failures.maximumRetryMinutes,
    });
    const result = await prisma.dynamicProduct.updateMany({
      where: {
        schedulerVersion: schedulerConfig.policyVersion,
        refreshFailCount: group.refreshFailCount,
        AND: [
          { OR: eligibleLock },
          { OR: [{ nextPriceRefreshAt: null }, { nextPriceRefreshAt: { lt: retryAt } }] },
        ],
      },
      data: { nextPriceRefreshAt: retryAt },
    });
    updated += result.count;
    groups.push({
      failures: group.refreshFailCount,
      products: group._count._all,
      retryAt: retryAt.toISOString(),
      updated: result.count,
    });
  }

  console.log("Scheduler V2 failure backoff reconciled", {
    now: now.toISOString(),
    groups: groups.length,
    eligibleProducts: failureGroups.reduce((total, group) => total + group._count._all, 0),
    updated,
    unchanged: failureGroups.reduce((total, group) => total + group._count._all, 0) - updated,
    maximumBackoffProducts: groups
      .filter((group) =>
        group.retryAt === maximumBackoffAt.toISOString()
      )
      .reduce((total, group) => total + group.products, 0),
  });
}

main()
  .catch((error) => {
    console.error("scheduler_v2_failure_backoff_reconciliation_failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
