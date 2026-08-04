const MILLISECONDS_PER_MINUTE = 60_000;

function stableHash(input: string) {
  let hash = 2_166_136_261;

  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }

  return hash >>> 0;
}

function assertPositiveInterval(intervalMinutes: number) {
  if (!Number.isInteger(intervalMinutes) || intervalMinutes <= 0) {
    throw new Error("scheduler_runtime_invalid_interval");
  }
}

/**
 * Mantém a coorte estável entre execuções e deploys, permitindo rollout e
 * rollback sem reclassificar produtos aleatoriamente.
 */
export function isSchedulerV2RolloutEligible(productId: string, rolloutPercentage: number) {
  if (rolloutPercentage <= 0) return false;
  if (rolloutPercentage >= 100) return true;

  return stableHash(productId) % 100 < rolloutPercentage;
}

/**
 * Agenda em uma fase estável por produto. Se o worker atrasar, avança para a
 * próxima ocorrência futura da mesma fase em vez de concentrar vencimentos.
 */
export function computeNextBaseRefreshAt({
  productId,
  completedAt,
  previousScheduledAt,
  intervalMinutes,
  phaseAnchorAt,
}: {
  productId: string;
  completedAt: Date;
  previousScheduledAt: Date | null;
  intervalMinutes: number;
  phaseAnchorAt: Date;
}) {
  assertPositiveInterval(intervalMinutes);

  const intervalMs = intervalMinutes * MILLISECONDS_PER_MINUTE;
  const anchorMs = phaseAnchorAt.getTime();
  const completedMs = completedAt.getTime();

  if (Number.isNaN(anchorMs) || Number.isNaN(completedMs)) {
    throw new Error("scheduler_runtime_invalid_date");
  }

  const phaseBaseMs = previousScheduledAt?.getTime() ?? anchorMs + (stableHash(productId) % intervalMs);
  const elapsedIntervals = Math.floor((completedMs - phaseBaseMs) / intervalMs) + 1;
  const nextMs = phaseBaseMs + Math.max(1, elapsedIntervals) * intervalMs;

  return new Date(nextMs);
}

export function computeFailureRetryAt({
  completedAt,
  failureCount,
  firstRetryMinutes,
  maximumRetryMinutes,
}: {
  completedAt: Date;
  failureCount: number;
  firstRetryMinutes: number;
  maximumRetryMinutes: number;
}) {
  assertPositiveInterval(firstRetryMinutes);
  assertPositiveInterval(maximumRetryMinutes);

  const boundedFailureCount = Math.max(1, Math.floor(failureCount));
  const exponent = Math.min(boundedFailureCount - 1, 30);
  const delayMinutes = Math.min(firstRetryMinutes * 2 ** exponent, maximumRetryMinutes);

  return new Date(completedAt.getTime() + delayMinutes * MILLISECONDS_PER_MINUTE);
}
