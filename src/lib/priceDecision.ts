export const PRICE_HISTORY_BADGE_WINDOWS = [
  30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330, 365,
] as const;

export type PriceDecisionLevel = "excellent" | "good" | "normal" | "expensive";

export type PriceHistoryBadgeWindow = {
  days: (typeof PRICE_HISTORY_BADGE_WINDOWS)[number];
  collectedDays: number;
  lowestPrice: number | null;
};

export type PriceDecision = {
  level: PriceDecisionLevel;
  label: string;
  message: string;
  deltaFromAveragePercent: number | null;
  deltaFromLowest30dPercent: number | null;
};

type PriceDecisionInput = {
  currentPrice: number | null | undefined;
  averagePrice30d: number | null | undefined;
  historyWindows?: PriceHistoryBadgeWindow[] | null | undefined;
};

function toCents(value: number | null | undefined) {
  if (!value || value <= 0) return null;
  return Math.round(value * 100);
}

function getDeltaPercent(currentPrice: number, basePrice: number | null | undefined) {
  if (!basePrice || basePrice <= 0) return null;
  return ((currentPrice - basePrice) / basePrice) * 100;
}

function getQualifiedWindow(
  currentPrice: number,
  historyWindows: PriceHistoryBadgeWindow[] | null | undefined
) {
  if (!historyWindows || historyWindows.length === 0) {
    return null;
  }

  const currentCents = toCents(currentPrice);
  if (currentCents === null) {
    return null;
  }

  const sortedWindows = [...historyWindows].sort((a, b) => b.days - a.days);

  for (const window of sortedWindows) {
    const lowestPriceCents = toCents(window.lowestPrice);

    if (
      lowestPriceCents !== null &&
      window.collectedDays >= window.days &&
      currentCents <= lowestPriceCents
    ) {
      return window;
    }
  }

  return null;
}

export function getPriceMessage({
  currentPrice,
  historyWindows,
}: Pick<PriceDecisionInput, "currentPrice" | "historyWindows">): string | null {
  if (!currentPrice || currentPrice <= 0) {
    return null;
  }

  const qualifiedWindow = getQualifiedWindow(currentPrice, historyWindows);
  if (!qualifiedWindow) {
    return null;
  }

  return `Menor pre\u00e7o em ${qualifiedWindow.days} dias`;
}

export function buildPriceDecision({
  currentPrice,
  averagePrice30d,
  historyWindows,
}: PriceDecisionInput): PriceDecision | null {
  if (!currentPrice || currentPrice <= 0) {
    return null;
  }

  const message = getPriceMessage({
    currentPrice,
    historyWindows,
  });

  if (!message) {
    return null;
  }

  const window30 = historyWindows?.find((window) => window.days === 30) ?? null;

  return {
    level: "excellent",
    label: message,
    message,
    deltaFromAveragePercent: getDeltaPercent(currentPrice, averagePrice30d),
    deltaFromLowest30dPercent: getDeltaPercent(currentPrice, window30?.lowestPrice ?? null),
  };
}
