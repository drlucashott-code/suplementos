import "dotenv/config";
import { Prisma } from "@prisma/client";
import { prisma } from "../src/lib/prisma";
import { resolveBaseRefreshSchedule } from "../src/lib/scheduler/baseSchedulerPolicy";
import { schedulerConfig } from "../src/lib/scheduler/scheduler.config";
import { computeNextBaseRefreshAt } from "../src/lib/scheduler/schedulerRuntime";

const policyVersion = schedulerConfig.policyVersion;

async function main() {
  const now = new Date();
  const windowStart = new Date(
    now.getTime() - schedulerConfig.base.historyWindowDays * 24 * 60 * 60 * 1000
  );
  const [products, histories] = await Promise.all([
    prisma.dynamicProduct.findMany({
      where: { schedulerVersion: policyVersion },
      select: {
        id: true,
        refreshFailCount: true,
        refreshLockUntil: true,
        schedulerBootstrapObservationCount: true,
        schedulerBootstrapSawChange: true,
        schedulerFirstBaseObservationAt: true,
        category: { select: { group: true } },
      },
    }),
    prisma.$queryRaw<
      Array<{ productId: string; observations: bigint; changes: bigint; firstObservationAt: Date | null }>
    >(Prisma.sql`
      SELECT
        "productId",
        COUNT(*)::bigint AS "observations",
        COALESCE(SUM(GREATEST("updateCount" - 1, 0)), 0)::bigint AS "changes",
        MIN("date") AS "firstObservationAt"
      FROM "DynamicPriceHistory"
      WHERE "date" >= ${windowStart}
      GROUP BY "productId"
    `),
  ]);
  const historyByProduct = new Map(histories.map((history) => [history.productId, history]));
  const rows = products
    .filter((product) => !product.refreshLockUntil || product.refreshLockUntil <= now)
    .map((product) => {
      const history = historyByProduct.get(product.id);
      const observations = Number(history?.observations ?? 0);
      const changes = Number(history?.changes ?? 0);
      const bootstrapObservationCount = Math.min(
        schedulerConfig.base.bootstrap.requiredValidObservations,
        observations
      );
      const changeRate30d = observations > 0 ? Math.min(1, changes / observations) : 0;
      const firstObservationAt = history?.firstObservationAt ?? null;
      const policy = resolveBaseRefreshSchedule(
        {
          firstBaseObservationAt: firstObservationAt,
          validBaseObservationCount: bootstrapObservationCount,
          sawPriceChangeDuringBootstrap: changes > 0,
          changeRate30d,
          categoryGroup: product.category.group,
        },
        now
      );
      return {
        id: product.id,
        baseIntervalMinutes: policy.intervalMinutes,
        bootstrapObservationCount,
        bootstrapSawChange: changes > 0,
        firstObservationAt: firstObservationAt?.toISOString() ?? null,
        changeRate30d,
        nextPriceRefreshAt:
          product.refreshFailCount > 0
            ? null
            : computeNextBaseRefreshAt({
                productId: product.id,
                completedAt: now,
                previousScheduledAt: null,
                intervalMinutes: policy.intervalMinutes,
                phaseAnchorAt: new Date(schedulerConfig.execution.phaseAnchorAt),
              }).toISOString(),
      };
    });

  for (let index = 0; index < rows.length; index += schedulerConfig.execution.rolloutWriteBatchSize) {
    const batch = rows.slice(index, index + schedulerConfig.execution.rolloutWriteBatchSize);
    await prisma.$executeRaw(Prisma.sql`
      UPDATE "DynamicProduct" AS p
      SET
        "schedulerBaseIntervalMinutes" = v."baseIntervalMinutes",
        "schedulerBootstrapObservationCount" = v."bootstrapObservationCount",
        "schedulerBootstrapSawChange" = v."bootstrapSawChange",
        "schedulerFirstBaseObservationAt" = v."firstObservationAt",
        "basePriceChangeRate30d" = v."changeRate30d",
        "nextPriceRefreshAt" = COALESCE(v."nextPriceRefreshAt", p."nextPriceRefreshAt"),
        "updatedAt" = NOW()
      FROM jsonb_to_recordset(${JSON.stringify(batch)}::jsonb) AS v(
        "id" text,
        "baseIntervalMinutes" integer,
        "bootstrapObservationCount" integer,
        "bootstrapSawChange" boolean,
        "firstObservationAt" timestamptz,
        "changeRate30d" double precision,
        "nextPriceRefreshAt" timestamptz
      )
      WHERE p."id" = v."id"
        AND p."schedulerVersion" = ${policyVersion}
        AND (p."refreshLockUntil" IS NULL OR p."refreshLockUntil" <= ${now})
    `);
  }

  console.log("Scheduler V2 history rebased", {
    products: products.length,
    updated: rows.length,
    skippedLocked: products.length - rows.length,
    windowStart: windowStart.toISOString(),
  });
}

main()
  .catch((error) => {
    console.error("scheduler_v2_history_rebase_failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
