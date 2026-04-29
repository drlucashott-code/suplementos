export type RefreshTier = "hot" | "warm" | "cold";

export type RefreshSignal =
  | "click"
  | "favorite"
  | "monitored"
  | "list"
  | "public_list"
  | "issue_report"
  | "admin_boost"
  | "back_in_stock";

type SchedulerStateInput = {
  priorityScore: number | null | undefined;
  lastPrioritySignalAt?: Date | null;
  lastInteractionAt?: Date | null;
  lastRefreshAttemptAt?: Date | null;
  lastPriceRefreshAt?: Date | null;
  lastSuccessfulRefreshAt?: Date | null;
  nextPriceRefreshAt?: Date | null;
  nextPriorityEnqueueAt?: Date | null;
  refreshFailCount?: number | null;
  priceChangeFrequency?: number | null;
  dataFreshnessScore?: number | null;
  availabilityStatus?: string | null;
  refreshTier?: string | null;
};

export type SchedulerSnapshot = {
  refreshTier: RefreshTier;
  priorityScore: number;
  lastPrioritySignalAt: Date | null;
  lastInteractionAt: Date | null;
  lastRefreshAttemptAt: Date | null;
  lastPriceRefreshAt: Date | null;
  lastSuccessfulRefreshAt: Date | null;
  nextPriceRefreshAt: Date;
  nextPriorityEnqueueAt: Date;
  refreshFailCount: number;
  priceChangeFrequency: number;
  dataFreshnessScore: number;
};

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
const PRIORITY_HALF_LIFE_MS = 12 * HOUR_MS;

const SIGNAL_WEIGHTS: Record<RefreshSignal, number> = {
  click: 4,
  favorite: 8,
  monitored: 10,
  list: 6,
  public_list: 7,
  issue_report: 14,
  admin_boost: 20,
  back_in_stock: 12,
};

const TIER_COOLDOWNS: Record<RefreshTier, number> = {
  hot: 15 * MINUTE_MS,
  warm: 1 * HOUR_MS,
  cold: 24 * HOUR_MS,
};

const TIER_MAX_AGES: Record<RefreshTier, number> = {
  hot: 30 * MINUTE_MS,
  warm: 6 * HOUR_MS,
  cold: 24 * HOUR_MS,
};

const OUT_OF_STOCK_COOLDOWNS: Record<RefreshTier, number> = {
  hot: 60 * MINUTE_MS,
  warm: 6 * HOUR_MS,
  cold: 24 * HOUR_MS,
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function toTier(value: string | null | undefined): RefreshTier {
  if (value === "hot" || value === "warm" || value === "cold") return value;
  return "cold";
}

function getBaseScore(input: SchedulerStateInput) {
  return clamp(input.priorityScore ?? 0, 0, 100);
}

export function applyPriorityDecay(
  score: number,
  lastSignalAt: Date | null | undefined,
  now = new Date()
) {
  if (!lastSignalAt || score <= 0) return clamp(score, 0, 100);
  const elapsedMs = Math.max(0, now.getTime() - lastSignalAt.getTime());
  const decayFactor = Math.pow(0.5, elapsedMs / PRIORITY_HALF_LIFE_MS);
  return clamp(Number((score * decayFactor).toFixed(4)), 0, 100);
}

export function resolveRefreshTier(score: number, monitorCount = 0) {
  const adjustedScore = score + Math.min(monitorCount, 10);
  if (adjustedScore >= 20) return "hot";
  if (adjustedScore >= 8) return "warm";
  return "cold";
}

export function computeDataFreshnessScore(params: {
  now?: Date;
  nextPriceRefreshAt?: Date | null;
  lastSuccessfulRefreshAt?: Date | null;
  refreshTier: RefreshTier;
  priceChangeFrequency: number;
  availabilityStatus?: string | null;
}) {
  const now = params.now ?? new Date();
  const nextAt = params.nextPriceRefreshAt;
  const lastSuccess = params.lastSuccessfulRefreshAt;
  const baseMaxAge = TIER_MAX_AGES[params.refreshTier];
  const outOfStockPenalty = params.availabilityStatus === "OUT_OF_STOCK" ? 0.65 : 1;
  const volatilityBoost = 1 + clamp(params.priceChangeFrequency, 0, 1.5);

  let overdueRatio = 0;
  if (nextAt) {
    overdueRatio = (now.getTime() - nextAt.getTime()) / baseMaxAge;
  } else if (lastSuccess) {
    overdueRatio = (now.getTime() - lastSuccess.getTime()) / baseMaxAge;
  } else {
    overdueRatio = 1.25;
  }

  return clamp(Number((overdueRatio * volatilityBoost * outOfStockPenalty).toFixed(4)), 0, 10);
}

export function computeNextRefreshAt(params: {
  now?: Date;
  refreshTier: RefreshTier;
  availabilityStatus?: string | null;
  priceChangeFrequency: number;
  refreshFailCount: number;
}) {
  const now = params.now ?? new Date();
  const cooldown =
    params.availabilityStatus === "OUT_OF_STOCK"
      ? OUT_OF_STOCK_COOLDOWNS[params.refreshTier]
      : TIER_COOLDOWNS[params.refreshTier];

  const volatilityReduction = cooldown * clamp(params.priceChangeFrequency, 0, 0.5);
  const failurePenalty = params.refreshFailCount > 0 ? params.refreshFailCount * 10 * MINUTE_MS : 0;
  const nextDelay = clamp(cooldown - volatilityReduction + failurePenalty, 5 * MINUTE_MS, 3 * DAY_MS);

  return new Date(now.getTime() + nextDelay);
}

export function computeNextEnqueueAt(params: {
  now?: Date;
  refreshTier: RefreshTier;
  availabilityStatus?: string | null;
}) {
  const now = params.now ?? new Date();
  const cooldown =
    params.availabilityStatus === "OUT_OF_STOCK"
      ? OUT_OF_STOCK_COOLDOWNS[params.refreshTier]
      : TIER_COOLDOWNS[params.refreshTier];
  return new Date(now.getTime() + cooldown);
}

export function createSchedulerSnapshot(
  input: SchedulerStateInput,
  options?: { now?: Date; monitorCount?: number }
): SchedulerSnapshot {
  const now = options?.now ?? new Date();
  const decayedScore = applyPriorityDecay(getBaseScore(input), input.lastPrioritySignalAt, now);
  const refreshTier = resolveRefreshTier(decayedScore, options?.monitorCount ?? 0);
  const refreshFailCount = Math.max(0, input.refreshFailCount ?? 0);
  const priceChangeFrequency = clamp(input.priceChangeFrequency ?? 0, 0, 1.5);
  const nextPriceRefreshAt =
    input.nextPriceRefreshAt ??
    computeNextRefreshAt({
      now,
      refreshTier,
      availabilityStatus: input.availabilityStatus,
      priceChangeFrequency,
      refreshFailCount,
    });
  const nextPriorityEnqueueAt =
    input.nextPriorityEnqueueAt ??
    computeNextEnqueueAt({
      now,
      refreshTier,
      availabilityStatus: input.availabilityStatus,
    });
  const dataFreshnessScore = computeDataFreshnessScore({
    now,
    nextPriceRefreshAt,
    lastSuccessfulRefreshAt: input.lastSuccessfulRefreshAt,
    refreshTier,
    priceChangeFrequency,
    availabilityStatus: input.availabilityStatus,
  });

  return {
    refreshTier,
    priorityScore: decayedScore,
    lastPrioritySignalAt: input.lastPrioritySignalAt ?? null,
    lastInteractionAt: input.lastInteractionAt ?? null,
    lastRefreshAttemptAt: input.lastRefreshAttemptAt ?? null,
    lastPriceRefreshAt: input.lastPriceRefreshAt ?? null,
    lastSuccessfulRefreshAt: input.lastSuccessfulRefreshAt ?? null,
    nextPriceRefreshAt,
    nextPriorityEnqueueAt,
    refreshFailCount,
    priceChangeFrequency,
    dataFreshnessScore,
  };
}

export function applyPrioritySignal(
  input: SchedulerStateInput,
  signal: RefreshSignal,
  options?: { now?: Date; monitorCount?: number; extraBoost?: number }
) {
  const now = options?.now ?? new Date();
  const base = createSchedulerSnapshot(input, options);
  const boostedScore = clamp(
    base.priorityScore + SIGNAL_WEIGHTS[signal] + (options?.extraBoost ?? 0),
    0,
    100
  );
  let refreshTier: RefreshTier = resolveRefreshTier(boostedScore, options?.monitorCount ?? 0);
  if (signal === "click" && refreshTier === "cold") {
    refreshTier = "warm";
  }
  const nextPriceRefreshAt = computeNextRefreshAt({
    now,
    refreshTier,
    availabilityStatus: input.availabilityStatus,
    priceChangeFrequency: base.priceChangeFrequency,
    refreshFailCount: base.refreshFailCount,
  });
  const nextPriorityEnqueueAt = computeNextEnqueueAt({
    now,
    refreshTier,
    availabilityStatus: input.availabilityStatus,
  });

  return {
    ...base,
    refreshTier,
    priorityScore: boostedScore,
    lastPrioritySignalAt: now,
    lastInteractionAt: now,
    nextPriceRefreshAt,
    nextPriorityEnqueueAt,
    dataFreshnessScore: computeDataFreshnessScore({
      now,
      nextPriceRefreshAt,
      lastSuccessfulRefreshAt: base.lastSuccessfulRefreshAt,
      refreshTier,
      priceChangeFrequency: base.priceChangeFrequency,
      availabilityStatus: input.availabilityStatus,
    }),
  };
}

export function applyRefreshResult(
  input: SchedulerStateInput,
  options: {
    now?: Date;
    success: boolean;
    priceChanged: boolean;
    availabilityStatus?: string | null;
    monitorCount?: number;
  }
) {
  const now = options.now ?? new Date();
  const base = createSchedulerSnapshot(
    {
      ...input,
      availabilityStatus: options.availabilityStatus ?? input.availabilityStatus,
    },
    { now, monitorCount: options.monitorCount }
  );

  const nextFrequency = options.success
    ? clamp(
        base.priceChangeFrequency * 0.75 + (options.priceChanged ? 0.35 : 0.05),
        0,
        1.5
      )
    : clamp(base.priceChangeFrequency * 0.9, 0, 1.5);

  const refreshFailCount = options.success ? 0 : base.refreshFailCount + 1;
  const refreshTier = resolveRefreshTier(base.priorityScore, options.monitorCount ?? 0);
  const nextPriceRefreshAt = computeNextRefreshAt({
    now,
    refreshTier,
    availabilityStatus: options.availabilityStatus ?? input.availabilityStatus,
    priceChangeFrequency: nextFrequency,
    refreshFailCount,
  });

  return {
    ...base,
    refreshTier,
    lastRefreshAttemptAt: now,
    lastPriceRefreshAt: now,
    lastSuccessfulRefreshAt: options.success ? now : base.lastSuccessfulRefreshAt,
    nextPriceRefreshAt,
    nextPriorityEnqueueAt: computeNextEnqueueAt({
      now,
      refreshTier,
      availabilityStatus: options.availabilityStatus ?? input.availabilityStatus,
    }),
    refreshFailCount,
    priceChangeFrequency: nextFrequency,
    dataFreshnessScore: computeDataFreshnessScore({
      now,
      nextPriceRefreshAt,
      lastSuccessfulRefreshAt: options.success ? now : base.lastSuccessfulRefreshAt,
      refreshTier,
      priceChangeFrequency: nextFrequency,
      availabilityStatus: options.availabilityStatus ?? input.availabilityStatus,
    }),
  };
}

export function shouldAttemptEnqueue(params: {
  now?: Date;
  refreshLockUntil?: Date | null;
  nextPriorityEnqueueAt?: Date | null;
  nextPriceRefreshAt?: Date | null;
}) {
  const now = params.now ?? new Date();
  if (params.refreshLockUntil && params.refreshLockUntil.getTime() > now.getTime()) return false;
  if (params.nextPriorityEnqueueAt && params.nextPriorityEnqueueAt.getTime() > now.getTime()) return false;
  if (params.nextPriceRefreshAt && params.nextPriceRefreshAt.getTime() > now.getTime()) return false;
  return true;
}
