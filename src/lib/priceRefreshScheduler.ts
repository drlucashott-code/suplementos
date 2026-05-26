export type RefreshTier = "hot" | "warm" | "cold";

export type RefreshSignal =
  | "click"
  | "favorite"
  | "monitored"
  | "list"
  | "public_list"
  | "offer_top"
  | "offer_high"
  | "offer_standard"
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
const CLICK_PRIORITY_REENQUEUE_MS = 5 * MINUTE_MS;
const MANDATORY_REFRESH_INTERVAL_MS = 24 * HOUR_MS;

const SIGNAL_WEIGHTS: Record<RefreshSignal, number> = {
  click: 4,
  favorite: 8,
  monitored: 10,
  list: 6,
  public_list: 7,
  offer_top: 16,
  offer_high: 12,
  offer_standard: 9,
  issue_report: 14,
  admin_boost: 20,
  back_in_stock: 12,
};

const SIGNAL_PROFILES: Partial<
  Record<
    RefreshSignal,
    {
      minTier?: RefreshTier;
      refreshDelayMs?: number;
      enqueueDelayMs?: number;
      recentSuccessWindowMs?: number;
    }
  >
> = {
  click: {
    minTier: "warm",
    refreshDelayMs: 5 * MINUTE_MS,
    enqueueDelayMs: 5 * MINUTE_MS,
    recentSuccessWindowMs: 10 * MINUTE_MS,
  },
  favorite: {
    minTier: "warm",
    refreshDelayMs: 30 * MINUTE_MS,
    enqueueDelayMs: 30 * MINUTE_MS,
    recentSuccessWindowMs: 30 * MINUTE_MS,
  },
  monitored: {
    minTier: "hot",
    refreshDelayMs: 15 * MINUTE_MS,
    enqueueDelayMs: 15 * MINUTE_MS,
    recentSuccessWindowMs: 15 * MINUTE_MS,
  },
  list: {
    minTier: "warm",
    refreshDelayMs: 60 * MINUTE_MS,
    enqueueDelayMs: 60 * MINUTE_MS,
    recentSuccessWindowMs: 60 * MINUTE_MS,
  },
  public_list: {
    minTier: "warm",
    refreshDelayMs: 45 * MINUTE_MS,
    enqueueDelayMs: 45 * MINUTE_MS,
    recentSuccessWindowMs: 45 * MINUTE_MS,
  },
  offer_top: {
    minTier: "hot",
    refreshDelayMs: 15 * MINUTE_MS,
    enqueueDelayMs: 15 * MINUTE_MS,
    recentSuccessWindowMs: 15 * MINUTE_MS,
  },
  offer_high: {
    minTier: "warm",
    refreshDelayMs: 30 * MINUTE_MS,
    enqueueDelayMs: 30 * MINUTE_MS,
    recentSuccessWindowMs: 30 * MINUTE_MS,
  },
  offer_standard: {
    minTier: "warm",
    refreshDelayMs: 60 * MINUTE_MS,
    enqueueDelayMs: 60 * MINUTE_MS,
    recentSuccessWindowMs: 60 * MINUTE_MS,
  },
  issue_report: {
    minTier: "hot",
    refreshDelayMs: 10 * MINUTE_MS,
    enqueueDelayMs: 10 * MINUTE_MS,
    recentSuccessWindowMs: 10 * MINUTE_MS,
  },
  back_in_stock: {
    minTier: "hot",
    refreshDelayMs: 15 * MINUTE_MS,
    enqueueDelayMs: 15 * MINUTE_MS,
    recentSuccessWindowMs: 15 * MINUTE_MS,
  },
  admin_boost: {
    minTier: "hot",
    refreshDelayMs: 0,
    enqueueDelayMs: 0,
  },
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

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function pickEarlierDate(current: Date | null | undefined, candidate: Date) {
  if (!current) return candidate;
  return current.getTime() <= candidate.getTime() ? current : candidate;
}

function constrainDateToEarliest(date: Date, earliestAllowedAt: Date | null) {
  if (!earliestAllowedAt) return date;
  return date.getTime() < earliestAllowedAt.getTime() ? earliestAllowedAt : date;
}

function getSignalEarliestEligibleAt(params: {
  signal: RefreshSignal;
  now: Date;
  lastSuccessfulRefreshAt?: Date | null;
}) {
  const profile = SIGNAL_PROFILES[params.signal];
  if (!profile?.recentSuccessWindowMs || !params.lastSuccessfulRefreshAt) {
    return null;
  }

  const earliestAllowedAt = new Date(
    params.lastSuccessfulRefreshAt.getTime() + profile.recentSuccessWindowMs
  );

  return earliestAllowedAt.getTime() > params.now.getTime() ? earliestAllowedAt : null;
}

function pickPriorityDate(params: {
  current: Date | null | undefined;
  candidate: Date;
  earliestAllowedAt: Date | null;
}) {
  const constrainedCandidate = constrainDateToEarliest(
    params.candidate,
    params.earliestAllowedAt
  );

  if (!params.current) {
    return constrainedCandidate;
  }

  if (
    params.earliestAllowedAt &&
    params.current.getTime() < params.earliestAllowedAt.getTime()
  ) {
    return constrainedCandidate;
  }

  return pickEarlierDate(params.current, constrainedCandidate);
}

function getTierRank(tier: RefreshTier) {
  if (tier === "hot") return 3;
  if (tier === "warm") return 2;
  return 1;
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
}) {
  const now = params.now ?? new Date();
  const nextAt = params.nextPriceRefreshAt;
  const lastSuccess = params.lastSuccessfulRefreshAt;
  const baseMaxAge = TIER_MAX_AGES[params.refreshTier];
  const volatilityBoost = 1 + clamp(params.priceChangeFrequency, 0, 1.5);

  let overdueRatio = 0;
  if (nextAt) {
    overdueRatio = (now.getTime() - nextAt.getTime()) / baseMaxAge;
  } else if (lastSuccess) {
    overdueRatio = (now.getTime() - lastSuccess.getTime()) / baseMaxAge;
  } else {
    overdueRatio = 1.25;
  }

  return clamp(Number((overdueRatio * volatilityBoost).toFixed(4)), 0, 10);
}

export function computeNextRefreshAt(params: {
  now?: Date;
  refreshTier: RefreshTier;
  priceChangeFrequency: number;
  refreshFailCount: number;
}) {
  const now = params.now ?? new Date();
  const cooldown = TIER_COOLDOWNS[params.refreshTier];

  const volatilityReduction = cooldown * clamp(params.priceChangeFrequency, 0, 0.5);
  const failurePenalty = params.refreshFailCount > 0 ? params.refreshFailCount * 10 * MINUTE_MS : 0;
  const nextDelay = clamp(cooldown - volatilityReduction + failurePenalty, 5 * MINUTE_MS, 3 * DAY_MS);

  return new Date(now.getTime() + nextDelay);
}

export function computeMandatoryRefreshAt(params: {
  now?: Date;
  lastSuccessfulRefreshAt?: Date | null;
}) {
  const now = params.now ?? new Date();
  if (!params.lastSuccessfulRefreshAt) {
    return now;
  }

  return new Date(
    params.lastSuccessfulRefreshAt.getTime() + MANDATORY_REFRESH_INTERVAL_MS
  );
}

export function resolveEffectiveNextPriceRefreshAt(params: {
  now?: Date;
  nextPriceRefreshAt?: Date | null;
  lastSuccessfulRefreshAt?: Date | null;
}) {
  const mandatoryRefreshAt = computeMandatoryRefreshAt({
    now: params.now,
    lastSuccessfulRefreshAt: params.lastSuccessfulRefreshAt,
  });

  if (!params.nextPriceRefreshAt) {
    return mandatoryRefreshAt;
  }

  return pickEarlierDate(params.nextPriceRefreshAt, mandatoryRefreshAt);
}

export function computeNextEnqueueAt(params: {
  now?: Date;
  refreshTier: RefreshTier;
}) {
  const now = params.now ?? new Date();
  const cooldown = TIER_COOLDOWNS[params.refreshTier];
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
  const computedNextPriceRefreshAt = computeNextRefreshAt({
    now,
    refreshTier,
    priceChangeFrequency,
    refreshFailCount,
  });
  const nextPriceRefreshAt = resolveEffectiveNextPriceRefreshAt({
    now,
    nextPriceRefreshAt: input.nextPriceRefreshAt ?? computedNextPriceRefreshAt,
    lastSuccessfulRefreshAt: input.lastSuccessfulRefreshAt,
  });
  const nextPriorityEnqueueAt =
    input.nextPriorityEnqueueAt ??
    computeNextEnqueueAt({
      now,
      refreshTier,
    });
  const dataFreshnessScore = computeDataFreshnessScore({
    now,
    nextPriceRefreshAt,
    lastSuccessfulRefreshAt: input.lastSuccessfulRefreshAt,
    refreshTier,
    priceChangeFrequency,
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
  const signalProfile = SIGNAL_PROFILES[signal];
  const boostedScore = clamp(
    base.priorityScore + SIGNAL_WEIGHTS[signal] + (options?.extraBoost ?? 0),
    0,
    100
  );
  let refreshTier: RefreshTier = resolveRefreshTier(boostedScore, options?.monitorCount ?? 0);
  if (
    signalProfile?.minTier &&
    getTierRank(signalProfile.minTier) > getTierRank(refreshTier)
  ) {
    refreshTier = signalProfile.minTier;
  }
  const computedNextPriceRefreshAt = computeNextRefreshAt({
    now,
    refreshTier,
    priceChangeFrequency: base.priceChangeFrequency,
    refreshFailCount: base.refreshFailCount,
  });
  const earliestAllowedAt = getSignalEarliestEligibleAt({
    signal,
    now,
    lastSuccessfulRefreshAt: base.lastSuccessfulRefreshAt,
  });
  const signaledNextPriceRefreshAt = signalProfile?.refreshDelayMs != null
    ? new Date(now.getTime() + signalProfile.refreshDelayMs)
    : computedNextPriceRefreshAt;
  const nextPriceRefreshAt = pickPriorityDate({
    current: base.nextPriceRefreshAt,
    candidate: signaledNextPriceRefreshAt,
    earliestAllowedAt,
  });
  const computedNextPriorityEnqueueAt = computeNextEnqueueAt({
    now,
    refreshTier,
  });
  const signaledNextPriorityEnqueueAt = signalProfile?.enqueueDelayMs != null
    ? new Date(now.getTime() + signalProfile.enqueueDelayMs)
    : signal === "click"
      ? new Date(now.getTime() + CLICK_PRIORITY_REENQUEUE_MS)
      : computedNextPriorityEnqueueAt;
  const nextPriorityEnqueueAt = pickPriorityDate({
    current: base.nextPriorityEnqueueAt,
    candidate: signaledNextPriorityEnqueueAt,
    earliestAllowedAt,
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
    }),
  };
}

export function shouldAttemptSignalEnqueue(params: {
  signal: RefreshSignal;
  now?: Date;
  refreshLockUntil?: Date | null;
  nextPriorityEnqueueAt?: Date | null;
  nextPriceRefreshAt?: Date | null;
  lastSuccessfulRefreshAt?: Date | null;
}) {
  const now = params.now ?? new Date();
  const signalProfile = SIGNAL_PROFILES[params.signal];

  if (
    signalProfile?.recentSuccessWindowMs &&
    params.lastSuccessfulRefreshAt &&
    now.getTime() - params.lastSuccessfulRefreshAt.getTime() <
      signalProfile.recentSuccessWindowMs
  ) {
    return false;
  }

  return shouldAttemptEnqueue({
    now,
    refreshLockUntil: params.refreshLockUntil,
    nextPriorityEnqueueAt: params.nextPriorityEnqueueAt,
    nextPriceRefreshAt: params.nextPriceRefreshAt,
    lastSuccessfulRefreshAt: params.lastSuccessfulRefreshAt,
  });
}

export function applyRefreshResult(
  input: SchedulerStateInput,
  options: {
    now?: Date;
    success: boolean;
    priceChanged: boolean;
    monitorCount?: number;
  }
) {
  const now = options.now ?? new Date();
  const base = createSchedulerSnapshot(
    input,
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
    }),
    refreshFailCount,
    priceChangeFrequency: nextFrequency,
    dataFreshnessScore: computeDataFreshnessScore({
      now,
      nextPriceRefreshAt,
      lastSuccessfulRefreshAt: options.success ? now : base.lastSuccessfulRefreshAt,
      refreshTier,
      priceChangeFrequency: nextFrequency,
    }),
  };
}

export function shouldAttemptEnqueue(params: {
  now?: Date;
  refreshLockUntil?: Date | null;
  nextPriorityEnqueueAt?: Date | null;
  nextPriceRefreshAt?: Date | null;
  lastSuccessfulRefreshAt?: Date | null;
}) {
  const now = params.now ?? new Date();
  if (params.refreshLockUntil && params.refreshLockUntil.getTime() > now.getTime()) return false;
  if (params.nextPriorityEnqueueAt && params.nextPriorityEnqueueAt.getTime() > now.getTime()) return false;
  const effectiveNextPriceRefreshAt = resolveEffectiveNextPriceRefreshAt({
    now,
    nextPriceRefreshAt: params.nextPriceRefreshAt,
    lastSuccessfulRefreshAt: params.lastSuccessfulRefreshAt,
  });
  if (effectiveNextPriceRefreshAt.getTime() > now.getTime()) return false;
  return true;
}

export function shouldAttemptClickEnqueue(params: {
  now?: Date;
  refreshLockUntil?: Date | null;
  nextPriorityEnqueueAt?: Date | null;
  lastSuccessfulRefreshAt?: Date | null;
}) {
  const now = params.now ?? new Date();
  if (params.refreshLockUntil && params.refreshLockUntil.getTime() > now.getTime()) return false;
  if (
    params.lastSuccessfulRefreshAt &&
    now.getTime() - params.lastSuccessfulRefreshAt.getTime() < HOUR_MS
  ) {
    return false;
  }
  if (params.nextPriorityEnqueueAt && params.nextPriorityEnqueueAt.getTime() > now.getTime()) return false;
  return true;
}
