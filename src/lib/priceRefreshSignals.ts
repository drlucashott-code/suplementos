import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  applyPrioritySignal,
  applyRefreshResult,
  createSchedulerSnapshot,
  shouldAttemptEnqueue,
  type RefreshSignal,
} from "@/lib/priceRefreshScheduler";

type DynamicSchedulerRow = {
  id: string;
  asin: string | null;
  refreshTier: string | null;
  priorityScore: number | null;
  lastPrioritySignalAt: Date | null;
  lastInteractionAt: Date | null;
  lastRefreshAttemptAt: Date | null;
  lastPriceRefreshAt: Date | null;
  lastSuccessfulRefreshAt: Date | null;
  nextPriceRefreshAt: Date | null;
  nextPriorityEnqueueAt: Date | null;
  refreshFailCount: number | null;
  priceChangeFrequency: number | null;
  dataFreshnessScore: number | null;
  refreshLockUntil: Date | null;
  availabilityStatus: string | null;
};

type TrackedSchedulerRow = DynamicSchedulerRow & { monitorCount: number | null };

const LOCK_WINDOW_MS = 10 * 60 * 1000;

async function claimDynamicRefreshAttemptByWhere(whereSql: Prisma.Sql) {
  const now = new Date();
  const lockUntil = new Date(now.getTime() + LOCK_WINDOW_MS);

  const rows = await prisma.$queryRaw<DynamicSchedulerRow[]>(Prisma.sql`
    WITH candidate AS (
      SELECT
        p."id",
        p."asin",
        p."refreshTier",
        p."priorityScore",
        p."lastPrioritySignalAt",
        p."lastInteractionAt",
        p."lastRefreshAttemptAt",
        p."lastPriceRefreshAt",
        p."lastSuccessfulRefreshAt",
        p."nextPriceRefreshAt",
        p."nextPriorityEnqueueAt",
        p."refreshFailCount",
        p."priceChangeFrequency",
        p."dataFreshnessScore",
        p."refreshLockUntil",
        p."availabilityStatus"
      FROM "DynamicProduct" p
      WHERE ${whereSql}
        AND (p."refreshLockUntil" IS NULL OR p."refreshLockUntil" <= ${now})
      LIMIT 1
      FOR UPDATE
    ),
    updated AS (
      UPDATE "DynamicProduct" p
      SET
        "refreshLockUntil" = ${lockUntil},
        "lastRefreshAttemptAt" = ${now},
        "updatedAt" = NOW()
      FROM candidate
      WHERE p."id" = candidate."id"
      RETURNING
        candidate."id",
        candidate."asin",
        candidate."refreshTier",
        candidate."priorityScore",
        candidate."lastPrioritySignalAt",
        candidate."lastInteractionAt",
        candidate."lastRefreshAttemptAt",
        candidate."lastPriceRefreshAt",
        candidate."lastSuccessfulRefreshAt",
        candidate."nextPriceRefreshAt",
        candidate."nextPriorityEnqueueAt",
        candidate."refreshFailCount",
        candidate."priceChangeFrequency",
        candidate."dataFreshnessScore",
        candidate."refreshLockUntil",
        candidate."availabilityStatus"
    )
    SELECT * FROM updated
  `);

  return rows[0] ?? null;
}

async function claimTrackedRefreshAttemptByWhere(whereSql: Prisma.Sql) {
  const now = new Date();
  const lockUntil = new Date(now.getTime() + LOCK_WINDOW_MS);

  const rows = await prisma.$queryRaw<TrackedSchedulerRow[]>(Prisma.sql`
    WITH candidate AS (
      SELECT
        tp."id",
        tp."asin",
        tp."refreshTier",
        tp."priorityScore",
        tp."lastPrioritySignalAt",
        tp."lastInteractionAt",
        tp."lastRefreshAttemptAt",
        tp."lastPriceRefreshAt",
        tp."lastSuccessfulRefreshAt",
        tp."nextPriceRefreshAt",
        tp."nextPriorityEnqueueAt",
        tp."refreshFailCount",
        tp."priceChangeFrequency",
        tp."dataFreshnessScore",
        tp."refreshLockUntil",
        tp."availabilityStatus",
        tp."monitorCount"
      FROM "SiteTrackedAmazonProduct" tp
      WHERE ${whereSql}
        AND (tp."refreshLockUntil" IS NULL OR tp."refreshLockUntil" <= ${now})
      LIMIT 1
      FOR UPDATE
    ),
    updated AS (
      UPDATE "SiteTrackedAmazonProduct" tp
      SET
        "refreshLockUntil" = ${lockUntil},
        "lastRefreshAttemptAt" = ${now},
        "updatedAt" = NOW()
      FROM candidate
      WHERE tp."id" = candidate."id"
      RETURNING
        candidate."id",
        candidate."asin",
        candidate."refreshTier",
        candidate."priorityScore",
        candidate."lastPrioritySignalAt",
        candidate."lastInteractionAt",
        candidate."lastRefreshAttemptAt",
        candidate."lastPriceRefreshAt",
        candidate."lastSuccessfulRefreshAt",
        candidate."nextPriceRefreshAt",
        candidate."nextPriorityEnqueueAt",
        candidate."refreshFailCount",
        candidate."priceChangeFrequency",
        candidate."dataFreshnessScore",
        candidate."refreshLockUntil",
        candidate."availabilityStatus",
        candidate."monitorCount"
    )
    SELECT * FROM updated
  `);

  return rows[0] ?? null;
}

export async function touchDynamicProductPriority(params: {
  productId: string;
  signal: RefreshSignal;
  extraBoost?: number;
}) {
  const rows = await prisma.$queryRaw<DynamicSchedulerRow[]>(Prisma.sql`
    SELECT
      p."id",
      p."asin",
      p."refreshTier",
      p."priorityScore",
      p."lastPrioritySignalAt",
      p."lastInteractionAt",
      p."lastRefreshAttemptAt",
      p."lastPriceRefreshAt",
      p."lastSuccessfulRefreshAt",
      p."nextPriceRefreshAt",
      p."nextPriorityEnqueueAt",
      p."refreshFailCount",
      p."priceChangeFrequency",
      p."dataFreshnessScore",
      p."refreshLockUntil",
      p."availabilityStatus"
    FROM "DynamicProduct" p
    WHERE p."id" = ${params.productId}
    LIMIT 1
  `);
  const row = rows[0];
  if (!row) return null;

  const now = new Date();
  const next = applyPrioritySignal(row, params.signal, { extraBoost: params.extraBoost });
  const nextDueAt =
    row.nextPriceRefreshAt && row.nextPriceRefreshAt.getTime() < now.getTime()
      ? row.nextPriceRefreshAt
      : now;
  await prisma.$executeRaw(Prisma.sql`
    UPDATE "DynamicProduct"
    SET
      "refreshTier" = ${next.refreshTier},
      "priorityScore" = ${next.priorityScore},
      "lastPrioritySignalAt" = ${next.lastPrioritySignalAt},
      "lastInteractionAt" = ${next.lastInteractionAt},
      "nextPriceRefreshAt" = ${nextDueAt},
      "nextPriorityEnqueueAt" = ${next.nextPriorityEnqueueAt},
      "dataFreshnessScore" = ${next.dataFreshnessScore},
      "updatedAt" = NOW()
    WHERE "id" = ${params.productId}
  `);

  return {
    asin: row.asin,
    shouldEnqueue: shouldAttemptEnqueue({
      refreshLockUntil: row.refreshLockUntil,
      nextPriorityEnqueueAt: row.nextPriorityEnqueueAt,
      nextPriceRefreshAt: row.nextPriceRefreshAt,
    }),
  };
}

export async function touchTrackedProductPriority(params: {
  trackedProductId: string;
  signal: RefreshSignal;
  extraBoost?: number;
}) {
  const rows = await prisma.$queryRaw<TrackedSchedulerRow[]>(Prisma.sql`
    SELECT
      tp."id",
      tp."asin",
      tp."refreshTier",
      tp."priorityScore",
      tp."lastPrioritySignalAt",
      tp."lastInteractionAt",
      tp."lastRefreshAttemptAt",
      tp."lastPriceRefreshAt",
      tp."lastSuccessfulRefreshAt",
      tp."nextPriceRefreshAt",
      tp."nextPriorityEnqueueAt",
      tp."refreshFailCount",
      tp."priceChangeFrequency",
      tp."dataFreshnessScore",
      tp."refreshLockUntil",
      tp."availabilityStatus",
      tp."monitorCount"
    FROM "SiteTrackedAmazonProduct" tp
    WHERE tp."id" = ${params.trackedProductId}
    LIMIT 1
  `);
  const row = rows[0];
  if (!row) return null;

  const now = new Date();
  const next = applyPrioritySignal(row, params.signal, {
    extraBoost: params.extraBoost,
    monitorCount: row.monitorCount ?? 0,
  });
  const nextDueAt =
    row.nextPriceRefreshAt && row.nextPriceRefreshAt.getTime() < now.getTime()
      ? row.nextPriceRefreshAt
      : now;
  await prisma.$executeRaw(Prisma.sql`
    UPDATE "SiteTrackedAmazonProduct"
    SET
      "refreshTier" = ${next.refreshTier},
      "priorityScore" = ${next.priorityScore},
      "lastPrioritySignalAt" = ${next.lastPrioritySignalAt},
      "lastInteractionAt" = ${next.lastInteractionAt},
      "nextPriceRefreshAt" = ${nextDueAt},
      "nextPriorityEnqueueAt" = ${next.nextPriorityEnqueueAt},
      "dataFreshnessScore" = ${next.dataFreshnessScore},
      "updatedAt" = NOW()
    WHERE "id" = ${params.trackedProductId}
  `);

  return {
    asin: row.asin,
    shouldEnqueue: shouldAttemptEnqueue({
      refreshLockUntil: row.refreshLockUntil,
      nextPriorityEnqueueAt: row.nextPriorityEnqueueAt,
      nextPriceRefreshAt: row.nextPriceRefreshAt,
    }),
  };
}

export async function markDynamicRefreshAttempt(asin: string) {
  return claimDynamicRefreshAttemptByWhere(Prisma.sql`p."asin" = ${asin}`);
}

export async function markDynamicRefreshAttemptById(productId: string) {
  return claimDynamicRefreshAttemptByWhere(Prisma.sql`p."id" = ${productId}`);
}

export async function markTrackedRefreshAttemptById(trackedProductId: string) {
  return claimTrackedRefreshAttemptByWhere(Prisma.sql`tp."id" = ${trackedProductId}`);
}

export async function applyDynamicRefreshOutcome(params: {
  productId: string;
  previousState: DynamicSchedulerRow;
  success: boolean;
  priceChanged: boolean;
  availabilityStatus?: string | null;
}) {
  const next = applyRefreshResult(params.previousState, {
    success: params.success,
    priceChanged: params.priceChanged,
    availabilityStatus: params.availabilityStatus,
  });

  await prisma.$executeRaw(Prisma.sql`
    UPDATE "DynamicProduct"
    SET
      "refreshTier" = ${next.refreshTier},
      "priorityScore" = ${next.priorityScore},
      "lastRefreshAttemptAt" = ${next.lastRefreshAttemptAt},
      "lastPriceRefreshAt" = ${next.lastPriceRefreshAt},
      "lastSuccessfulRefreshAt" = ${next.lastSuccessfulRefreshAt},
      "nextPriceRefreshAt" = ${next.nextPriceRefreshAt},
      "nextPriorityEnqueueAt" = ${next.nextPriorityEnqueueAt},
      "refreshFailCount" = ${next.refreshFailCount},
      "priceChangeFrequency" = ${next.priceChangeFrequency},
      "dataFreshnessScore" = ${next.dataFreshnessScore},
      "refreshLockUntil" = NULL,
      "updatedAt" = NOW()
    WHERE "id" = ${params.productId}
  `);
}

export async function applyTrackedRefreshOutcome(params: {
  trackedProductId: string;
  previousState: TrackedSchedulerRow;
  success: boolean;
  priceChanged: boolean;
  availabilityStatus?: string | null;
}) {
  const next = applyRefreshResult(params.previousState, {
    success: params.success,
    priceChanged: params.priceChanged,
    availabilityStatus: params.availabilityStatus,
    monitorCount: params.previousState.monitorCount ?? 0,
  });

  await prisma.$executeRaw(Prisma.sql`
    UPDATE "SiteTrackedAmazonProduct"
    SET
      "refreshTier" = ${next.refreshTier},
      "priorityScore" = ${next.priorityScore},
      "lastRefreshAttemptAt" = ${next.lastRefreshAttemptAt},
      "lastPriceRefreshAt" = ${next.lastPriceRefreshAt},
      "lastSuccessfulRefreshAt" = ${next.lastSuccessfulRefreshAt},
      "nextPriceRefreshAt" = ${next.nextPriceRefreshAt},
      "nextPriorityEnqueueAt" = ${next.nextPriorityEnqueueAt},
      "refreshFailCount" = ${next.refreshFailCount},
      "priceChangeFrequency" = ${next.priceChangeFrequency},
      "dataFreshnessScore" = ${next.dataFreshnessScore},
      "refreshLockUntil" = NULL,
      "updatedAt" = NOW()
    WHERE "id" = ${params.trackedProductId}
  `);
}

export async function seedDynamicSchedulerState(productId: string) {
  const rows = await prisma.$queryRaw<DynamicSchedulerRow[]>(Prisma.sql`
    SELECT
      p."id",
      p."asin",
      p."refreshTier",
      p."priorityScore",
      p."lastPrioritySignalAt",
      p."lastInteractionAt",
      p."lastRefreshAttemptAt",
      p."lastPriceRefreshAt",
      p."lastSuccessfulRefreshAt",
      p."nextPriceRefreshAt",
      p."nextPriorityEnqueueAt",
      p."refreshFailCount",
      p."priceChangeFrequency",
      p."dataFreshnessScore",
      p."refreshLockUntil",
      p."availabilityStatus"
    FROM "DynamicProduct" p
    WHERE p."id" = ${productId}
    LIMIT 1
  `);
  const row = rows[0];
  if (!row) return;
  const next = createSchedulerSnapshot(row);
  await prisma.$executeRaw(Prisma.sql`
    UPDATE "DynamicProduct"
    SET
      "refreshTier" = ${next.refreshTier},
      "priorityScore" = ${next.priorityScore},
      "nextPriceRefreshAt" = COALESCE("nextPriceRefreshAt", ${next.nextPriceRefreshAt}),
      "nextPriorityEnqueueAt" = COALESCE("nextPriorityEnqueueAt", ${next.nextPriorityEnqueueAt}),
      "priceChangeFrequency" = COALESCE("priceChangeFrequency", ${next.priceChangeFrequency}),
      "dataFreshnessScore" = ${next.dataFreshnessScore},
      "updatedAt" = NOW()
    WHERE "id" = ${productId}
  `);
}

export async function seedTrackedSchedulerState(trackedProductId: string) {
  const rows = await prisma.$queryRaw<TrackedSchedulerRow[]>(Prisma.sql`
    SELECT
      tp."id",
      tp."asin",
      tp."refreshTier",
      tp."priorityScore",
      tp."lastPrioritySignalAt",
      tp."lastInteractionAt",
      tp."lastRefreshAttemptAt",
      tp."lastPriceRefreshAt",
      tp."lastSuccessfulRefreshAt",
      tp."nextPriceRefreshAt",
      tp."nextPriorityEnqueueAt",
      tp."refreshFailCount",
      tp."priceChangeFrequency",
      tp."dataFreshnessScore",
      tp."refreshLockUntil",
      tp."availabilityStatus",
      tp."monitorCount"
    FROM "SiteTrackedAmazonProduct" tp
    WHERE tp."id" = ${trackedProductId}
    LIMIT 1
  `);
  const row = rows[0];
  if (!row) return;
  const next = createSchedulerSnapshot(row, { monitorCount: row.monitorCount ?? 0 });
  await prisma.$executeRaw(Prisma.sql`
    UPDATE "SiteTrackedAmazonProduct"
    SET
      "refreshTier" = ${next.refreshTier},
      "priorityScore" = ${next.priorityScore},
      "nextPriceRefreshAt" = COALESCE("nextPriceRefreshAt", ${next.nextPriceRefreshAt}),
      "nextPriorityEnqueueAt" = COALESCE("nextPriorityEnqueueAt", ${next.nextPriorityEnqueueAt}),
      "priceChangeFrequency" = COALESCE("priceChangeFrequency", ${next.priceChangeFrequency}),
      "dataFreshnessScore" = ${next.dataFreshnessScore},
      "updatedAt" = NOW()
    WHERE "id" = ${trackedProductId}
  `);
}
