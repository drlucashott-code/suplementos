import crypto from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { resolveBaseRefreshSchedule, type BaseSchedulerDecisionReason } from "@/lib/scheduler/baseSchedulerPolicy";
import { schedulerConfig } from "@/lib/scheduler/scheduler.config";
import {
  computeFailureRetryAt,
  computeNextBaseRefreshAt,
  isSchedulerV2RolloutEligible,
} from "@/lib/scheduler/schedulerRuntime";

const SCHEDULER_VERSION = schedulerConfig.policyVersion;

type SchedulerV2ProductState = {
  id: string;
  asin: string;
  nextPriceRefreshAt: Date | null;
  refreshLockUntil: Date | null;
  refreshClaimToken: string | null;
  schedulerRevision: number;
  schedulerBootstrapObservationCount: number;
  schedulerBootstrapSawChange: boolean;
  schedulerFirstBaseObservationAt: Date | null;
  basePriceChangeRate30d: number | null;
  refreshFailCount: number;
};

export type SchedulerV2Claim = SchedulerV2ProductState & {
  attemptId: string;
  workerId: string;
  reason: "base" | "urgent";
  claimedAt: Date;
};

type ObservationResult = "success" | "failure" | "out_of_stock" | "excluded";

function getPhaseAnchorAt() {
  return new Date(schedulerConfig.execution.phaseAnchorAt);
}

function makeDecision(state: SchedulerV2ProductState, now: Date, changeRate30d: number) {
  const policy = resolveBaseRefreshSchedule(
    {
      firstBaseObservationAt: state.schedulerFirstBaseObservationAt,
      validBaseObservationCount: state.schedulerBootstrapObservationCount,
      sawPriceChangeDuringBootstrap: state.schedulerBootstrapSawChange,
      changeRate30d,
    },
    now
  );
  const nextPriceRefreshAt = computeNextBaseRefreshAt({
    productId: state.id,
    completedAt: now,
    previousScheduledAt: state.nextPriceRefreshAt,
    intervalMinutes: policy.intervalMinutes,
    phaseAnchorAt: getPhaseAnchorAt(),
  });

  return { policy, nextPriceRefreshAt };
}

async function claimProduct(params: {
  productId: string;
  workerId: string;
  reason: "base" | "urgent";
  now?: Date;
}) {
  const now = params.now ?? new Date();
  const claimToken = crypto.randomUUID();
  const attemptId = crypto.randomUUID();
  const lockUntil = new Date(
    now.getTime() + schedulerConfig.execution.claimLeaseMinutes * 60 * 1000
  );
  const dueCondition =
    params.reason === "base"
      ? Prisma.sql`AND p."nextPriceRefreshAt" <= ${now}`
      : Prisma.empty;

  const rows = await prisma.$queryRaw<SchedulerV2ProductState[]>(Prisma.sql`
    WITH candidate AS (
      SELECT p."id"
      FROM "DynamicProduct" p
      WHERE p."id" = ${params.productId}
        AND p."schedulerVersion" = ${SCHEDULER_VERSION}
        AND (p."refreshLockUntil" IS NULL OR p."refreshLockUntil" <= ${now})
        ${dueCondition}
      FOR UPDATE SKIP LOCKED
    )
    UPDATE "DynamicProduct" p
    SET
      "refreshLockUntil" = ${lockUntil},
      "refreshClaimToken" = ${claimToken},
      "lastRefreshAttemptAt" = ${now},
      "updatedAt" = NOW()
    FROM candidate
    WHERE p."id" = candidate."id"
    RETURNING
      p."id", p."asin", p."nextPriceRefreshAt", p."refreshLockUntil",
      p."refreshClaimToken", p."schedulerRevision",
      p."schedulerBootstrapObservationCount", p."schedulerBootstrapSawChange",
      p."schedulerFirstBaseObservationAt", p."basePriceChangeRate30d",
      p."refreshFailCount"
  `);
  const row = rows[0];
  if (!row) return null;

  return {
    ...row,
    attemptId,
    workerId: params.workerId,
    reason: params.reason,
    claimedAt: now,
  } satisfies SchedulerV2Claim;
}

export function claimSchedulerV2BaseRefresh(productId: string, workerId: string) {
  return claimProduct({ productId, workerId, reason: "base" });
}

export function claimSchedulerV2UrgentRefresh(productId: string, workerId: string) {
  return claimProduct({ productId, workerId, reason: "urgent" });
}

export async function applySchedulerV2BaseOutcome(params: {
  claim: SchedulerV2Claim;
  success: boolean;
  priceChanged: boolean;
  observedPrice?: number | null;
  result?: ObservationResult;
  errorCode?: string | null;
  finishedAt?: Date;
}) {
  const finishedAt = params.finishedAt ?? new Date();

  if (!params.success) {
    const nextPriceRefreshAt = computeFailureRetryAt({
      completedAt: finishedAt,
      failureCount: params.claim.refreshFailCount + 1,
      firstRetryMinutes: schedulerConfig.failures.firstRetryMinutes,
      maximumRetryMinutes: schedulerConfig.failures.maximumRetryMinutes,
    });
    return persistOutcome({
      claim: params.claim,
      finishedAt,
      nextPriceRefreshAt,
      refreshFailCount: params.claim.refreshFailCount + 1,
      observedPrice: params.observedPrice ?? null,
      priceChanged: null,
      result: params.result ?? "failure",
      errorCode: params.errorCode ?? null,
      baseUpdate: null,
    });
  }

  const validBaseObservationCount = params.claim.schedulerBootstrapObservationCount + 1;
  const firstBaseObservationAt = params.claim.schedulerFirstBaseObservationAt ?? params.claim.claimedAt;
  const sawPriceChangeDuringBootstrap =
    params.claim.schedulerBootstrapSawChange || params.priceChanged;

  const windowStart = new Date(
    finishedAt.getTime() - schedulerConfig.base.historyWindowDays * 24 * 60 * 60 * 1000
  );
  const [counts] = await prisma.$queryRaw<Array<{ total: bigint; changes: bigint }>>(Prisma.sql`
    SELECT
      COUNT(*)::bigint AS "total",
      COUNT(*) FILTER (WHERE "priceChanged" = true)::bigint AS "changes"
    FROM "PriceRefreshObservation"
    WHERE "productId" = ${params.claim.id}
      AND "reason" = 'base'
      AND "result" = 'success'
      AND "startedAt" >= ${windowStart}
  `);
  const total = Number(counts?.total ?? 0) + 1;
  const changes = Number(counts?.changes ?? 0) + (params.priceChanged ? 1 : 0);
  const changeRate30d = total > 0 ? changes / total : 0;
  const state = {
    ...params.claim,
    schedulerBootstrapObservationCount: validBaseObservationCount,
    schedulerBootstrapSawChange: sawPriceChangeDuringBootstrap,
    schedulerFirstBaseObservationAt: firstBaseObservationAt,
  };
  const { policy, nextPriceRefreshAt } = makeDecision(state, finishedAt, changeRate30d);

  return persistOutcome({
    claim: params.claim,
    finishedAt,
    nextPriceRefreshAt,
    refreshFailCount: 0,
    observedPrice: params.observedPrice ?? null,
    priceChanged: params.priceChanged,
    result: params.result ?? "success",
    errorCode: params.errorCode ?? null,
    baseUpdate: {
      baseIntervalMinutes: policy.intervalMinutes,
      decisionReason: policy.reason,
      decisionEvidence: policy.evidence,
      validBaseObservationCount,
      firstBaseObservationAt,
      sawPriceChangeDuringBootstrap,
      changeRate30d,
    },
  });
}

export async function applySchedulerV2UrgentOutcome(params: {
  claim: SchedulerV2Claim;
  success: boolean;
  priceChanged: boolean;
  observedPrice?: number | null;
  result?: ObservationResult;
  errorCode?: string | null;
  finishedAt?: Date;
}) {
  const finishedAt = params.finishedAt ?? new Date();
  return persistOutcome({
    claim: params.claim,
    finishedAt,
    // Refreshes urgentes não alteram a agenda-base nem o aprendizado dela.
    nextPriceRefreshAt: params.claim.nextPriceRefreshAt ?? finishedAt,
    refreshFailCount: params.claim.refreshFailCount,
    observedPrice: params.observedPrice ?? null,
    priceChanged: params.success ? params.priceChanged : null,
    result: params.result ?? (params.success ? "success" : "failure"),
    errorCode: params.errorCode ?? null,
    baseUpdate: null,
  });
}

async function persistOutcome(params: {
  claim: SchedulerV2Claim;
  finishedAt: Date;
  nextPriceRefreshAt: Date;
  refreshFailCount: number;
  observedPrice: number | null;
  priceChanged: boolean | null;
  result: ObservationResult;
  errorCode: string | null;
  baseUpdate: null | {
    baseIntervalMinutes: number;
    decisionReason: BaseSchedulerDecisionReason;
    decisionEvidence: Record<string, unknown>;
    validBaseObservationCount: number;
    firstBaseObservationAt: Date;
    sawPriceChangeDuringBootstrap: boolean;
    changeRate30d: number;
  };
}) {
  return prisma.$transaction(async (tx) => {
    const updated = await tx.dynamicProduct.updateMany({
      where: {
        id: params.claim.id,
        schedulerVersion: SCHEDULER_VERSION,
        refreshClaimToken: params.claim.refreshClaimToken,
        schedulerRevision: params.claim.schedulerRevision,
      },
      data: {
        refreshLockUntil: null,
        refreshClaimToken: null,
        refreshFailCount: params.refreshFailCount,
        ...(params.claim.reason === "base"
          ? {
              nextPriceRefreshAt: params.nextPriceRefreshAt,
              lastBaseRefreshAt: params.finishedAt,
              ...(params.result === "success"
                ? { lastBaseSuccessfulRefreshAt: params.finishedAt }
                : {}),
              ...(params.baseUpdate
                ? {
                    schedulerBaseIntervalMinutes: params.baseUpdate.baseIntervalMinutes,
                    schedulerBootstrapObservationCount:
                      params.baseUpdate.validBaseObservationCount,
                    schedulerBootstrapSawChange: params.baseUpdate.sawPriceChangeDuringBootstrap,
                    schedulerFirstBaseObservationAt: params.baseUpdate.firstBaseObservationAt,
                    basePriceChangeRate30d: params.baseUpdate.changeRate30d,
                  }
                : {}),
            }
          : {}),
        schedulerRevision: { increment: 1 },
      },
    });

    if (updated.count !== 1) return { applied: false as const };

    await tx.priceRefreshObservation.create({
      data: {
        attemptId: params.claim.attemptId,
        productId: params.claim.id,
        reason: params.claim.reason,
        schedulerVersion: SCHEDULER_VERSION,
        scheduledAt: params.claim.nextPriceRefreshAt,
        startedAt: params.claim.claimedAt,
        finishedAt: params.finishedAt,
        durationMs: Math.max(0, params.finishedAt.getTime() - params.claim.claimedAt.getTime()),
        baseIntervalMinutes: params.baseUpdate?.baseIntervalMinutes ?? null,
        decisionReason: params.baseUpdate?.decisionReason ?? null,
        decisionEvidence: params.baseUpdate?.decisionEvidence
          ? (params.baseUpdate.decisionEvidence as Prisma.InputJsonValue)
          : undefined,
        observedPrice: params.observedPrice,
        priceChanged: params.priceChanged,
        result: params.result,
        errorCode: params.errorCode,
        workerId: params.claim.workerId,
      },
    });

    return { applied: true as const };
  });
}

export async function requestSchedulerV2UrgentRefresh(productId: string) {
  if (!schedulerConfig.flags.enabled || !schedulerConfig.flags.urgentQueueEnabled) return null;

  const now = new Date();
  const cooldownBefore = new Date(
    now.getTime() - schedulerConfig.urgent.clickCooldownMinutes * 60 * 1000
  );
  const nextAllowedAt = new Date(
    now.getTime() + schedulerConfig.urgent.clickCooldownMinutes * 60 * 1000
  );
  const rows = await prisma.$queryRaw<Array<{ asin: string }>>(Prisma.sql`
    UPDATE "DynamicProduct"
    SET
      "lastPrioritySignalAt" = ${now},
      "nextPriorityEnqueueAt" = ${nextAllowedAt},
      "updatedAt" = NOW()
    WHERE "id" = ${productId}
      AND "schedulerVersion" = ${SCHEDULER_VERSION}
      AND (
        "lastPrioritySignalAt" IS NULL
        OR "lastPrioritySignalAt" <= ${cooldownBefore}
      )
      AND ("refreshLockUntil" IS NULL OR "refreshLockUntil" <= ${now})
    RETURNING "asin"
  `);

  return rows[0]?.asin ?? null;
}

export async function recordSchedulerV2ShadowDecisions(limit = schedulerConfig.execution.claimBatchSize) {
  if (!schedulerConfig.flags.shadowMode) return 0;
  const now = new Date();
  const products = await prisma.dynamicProduct.findMany({
    where: { schedulerVersion: { in: ["legacy", SCHEDULER_VERSION] } },
    select: {
      id: true,
      schedulerVersion: true,
      nextPriceRefreshAt: true,
      schedulerBootstrapObservationCount: true,
      schedulerBootstrapSawChange: true,
      schedulerFirstBaseObservationAt: true,
      basePriceChangeRate30d: true,
    },
    orderBy: [{ refreshScheduleDecisions: { _count: "asc" } }, { updatedAt: "asc" }],
    take: limit,
  });
  const productIds = products.map((product) => product.id);
  const historyWindowStart = new Date(
    now.getTime() - schedulerConfig.base.historyWindowDays * 24 * 60 * 60 * 1000
  );
  const historicalRows =
    productIds.length === 0
      ? []
      : await prisma.$queryRaw<
          Array<{
            productId: string;
            validObservations: bigint;
            changes: bigint;
            firstObservationAt: Date | null;
          }>
        >(Prisma.sql`
          SELECT
            "productId",
            COUNT(*)::bigint AS "validObservations",
            COALESCE(SUM(GREATEST("updateCount" - 1, 0)), 0)::bigint AS "changes",
            MIN("date") AS "firstObservationAt"
          FROM "DynamicPriceHistory"
          WHERE "productId" IN (${Prisma.join(productIds)})
            AND "date" >= ${historyWindowStart}
          GROUP BY "productId"
        `);
  const historyByProductId = new Map(historicalRows.map((row) => [row.productId, row]));

  await prisma.$transaction(
    products.map((product) => {
      const historical = historyByProductId.get(product.id);
      const isV2 = product.schedulerVersion === SCHEDULER_VERSION;
      const validBaseObservationCount = isV2
        ? product.schedulerBootstrapObservationCount
        : Math.min(
            schedulerConfig.base.bootstrap.requiredValidObservations,
            Number(historical?.validObservations ?? 0)
          );
      const changes = isV2 ? 0 : Number(historical?.changes ?? 0);
      const rate = isV2
        ? product.basePriceChangeRate30d ?? 0
        : validBaseObservationCount > 0
          ? Math.min(1, changes / validBaseObservationCount)
          : 0;
      const { policy, nextPriceRefreshAt } = makeDecision(
        {
          id: product.id,
          asin: "",
          nextPriceRefreshAt: product.nextPriceRefreshAt,
          refreshLockUntil: null,
          refreshClaimToken: null,
          schedulerRevision: 0,
          schedulerBootstrapObservationCount: validBaseObservationCount,
          schedulerBootstrapSawChange: isV2
            ? product.schedulerBootstrapSawChange
            : changes > 0,
          schedulerFirstBaseObservationAt: isV2
            ? product.schedulerFirstBaseObservationAt
            : historical?.firstObservationAt ?? null,
          basePriceChangeRate30d: rate,
          refreshFailCount: 0,
        },
        now,
        rate
      );
      return prisma.priceRefreshScheduleDecision.upsert({
        where: {
          productId_schedulerVersion: {
            productId: product.id,
            schedulerVersion: SCHEDULER_VERSION,
          },
        },
        create: {
          productId: product.id,
          schedulerVersion: SCHEDULER_VERSION,
          currentScheduledAt: product.nextPriceRefreshAt,
          proposedScheduledAt: nextPriceRefreshAt,
          intervalMinutes: policy.intervalMinutes,
          reason: policy.reason,
          evidence: policy.evidence as Prisma.InputJsonValue,
        },
        update: {
          calculatedAt: now,
          currentScheduledAt: product.nextPriceRefreshAt,
          proposedScheduledAt: nextPriceRefreshAt,
          intervalMinutes: policy.intervalMinutes,
          reason: policy.reason,
          evidence: policy.evidence as Prisma.InputJsonValue,
        },
      });
    })
  );

  return products.length;
}

export function isProductEligibleForSchedulerV2Rollout(productId: string) {
  return schedulerConfig.flags.enabled && isSchedulerV2RolloutEligible(
    productId,
    schedulerConfig.execution.rolloutPercentage
  );
}

/**
 * Entrada explícita de rollout. Reaproveita o histórico diário já existente
 * apenas para iniciar a coorte; depois disso, somente o Observation Ledger V2
 * é usado. Não é chamado pelo cron e não altera produtos fora da coorte.
 */
export async function activateSchedulerV2Cohort(params?: { rolloutPercentage?: number }) {
  if (!schedulerConfig.flags.enabled || !schedulerConfig.flags.observationLedgerEnabled) {
    throw new Error("scheduler_v2_activation_requires_enabled_observation_ledger");
  }
  const rolloutPercentage = params?.rolloutPercentage ?? schedulerConfig.execution.rolloutPercentage;
  const now = new Date();
  const windowStart = new Date(
    now.getTime() - schedulerConfig.base.historyWindowDays * 24 * 60 * 60 * 1000
  );
  const rows = await prisma.$queryRaw<
    Array<{
      id: string;
      nextPriceRefreshAt: Date | null;
      validObservations: bigint;
      changes: bigint;
      firstObservationAt: Date | null;
    }>
  >(Prisma.sql`
    SELECT
      p."id",
      p."nextPriceRefreshAt",
      COUNT(h."id")::bigint AS "validObservations",
      COALESCE(SUM(GREATEST(h."updateCount" - 1, 0)), 0)::bigint AS "changes",
      MIN(h."date") AS "firstObservationAt"
    FROM "DynamicProduct" p
    LEFT JOIN "DynamicPriceHistory" h
      ON h."productId" = p."id"
      AND h."date" >= ${windowStart}
    WHERE p."schedulerVersion" = 'legacy'
    GROUP BY p."id", p."nextPriceRefreshAt"
  `);
  const eligibleRows = rows.filter((row) =>
    isSchedulerV2RolloutEligible(row.id, rolloutPercentage)
  );

  const activationRows = eligibleRows.map((row) => {
    const validBaseObservationCount = Math.min(
      schedulerConfig.base.bootstrap.requiredValidObservations,
      Number(row.validObservations)
    );
    const changes = Number(row.changes);
    const changeRate30d =
      validBaseObservationCount > 0 ? Math.min(1, changes / validBaseObservationCount) : 0;
    const state: SchedulerV2ProductState = {
      id: row.id,
      asin: "",
      nextPriceRefreshAt: row.nextPriceRefreshAt,
      refreshLockUntil: null,
      refreshClaimToken: null,
      schedulerRevision: 0,
      schedulerBootstrapObservationCount: validBaseObservationCount,
      schedulerBootstrapSawChange: changes > 0,
      schedulerFirstBaseObservationAt: row.firstObservationAt,
      basePriceChangeRate30d: changeRate30d,
      refreshFailCount: 0,
    };
    const { policy, nextPriceRefreshAt } = makeDecision(state, now, changeRate30d);

    return {
      id: row.id,
      baseIntervalMinutes: policy.intervalMinutes,
      bootstrapObservationCount: validBaseObservationCount,
      bootstrapSawChange: changes > 0,
      firstBaseObservationAt: row.firstObservationAt?.toISOString() ?? null,
      changeRate30d,
      nextPriceRefreshAt: nextPriceRefreshAt.toISOString(),
    };
  });

  for (
    let index = 0;
    index < activationRows.length;
    index += schedulerConfig.execution.rolloutWriteBatchSize
  ) {
    const batch = activationRows.slice(
      index,
      index + schedulerConfig.execution.rolloutWriteBatchSize
    );
    await prisma.$executeRaw(Prisma.sql`
      UPDATE "DynamicProduct" AS p
      SET
        "schedulerVersion" = ${SCHEDULER_VERSION},
        "schedulerRevision" = 0,
        "schedulerBaseIntervalMinutes" = v."baseIntervalMinutes",
        "schedulerBootstrapObservationCount" = v."bootstrapObservationCount",
        "schedulerBootstrapSawChange" = v."bootstrapSawChange",
        "schedulerFirstBaseObservationAt" = v."firstBaseObservationAt",
        "basePriceChangeRate30d" = v."changeRate30d",
        "nextPriceRefreshAt" = v."nextPriceRefreshAt",
        "refreshLockUntil" = NULL,
        "refreshClaimToken" = NULL,
        "updatedAt" = NOW()
      FROM jsonb_to_recordset(${JSON.stringify(batch)}::jsonb) AS v(
        "id" text,
        "baseIntervalMinutes" integer,
        "bootstrapObservationCount" integer,
        "bootstrapSawChange" boolean,
        "firstBaseObservationAt" timestamptz,
        "changeRate30d" double precision,
        "nextPriceRefreshAt" timestamptz
      )
      WHERE p."id" = v."id"
        AND p."schedulerVersion" = 'legacy'
    `);
  }

  return {
    considered: rows.length,
    activated: eligibleRows.length,
    rolloutPercentage,
  };
}
