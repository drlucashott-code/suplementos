export const PRICE_HISTORY_TIME_ZONE = "America/Sao_Paulo";

export const PRICE_HISTORY_CHART_RANGES = [
  7, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330, 365,
] as const;

export type PriceHistoryChartRange = number;

type ChartWindowSummary = {
  days: number;
  collectedDays: number;
};

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

export function getPriceHistoryBusinessDateKey(date = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: PRICE_HISTORY_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const parts = formatter.formatToParts(date);
  const year = Number(parts.find((part) => part.type === "year")?.value ?? "0");
  const month = Number(parts.find((part) => part.type === "month")?.value ?? "0");
  const day = Number(parts.find((part) => part.type === "day")?.value ?? "0");

  return `${year}-${pad2(month)}-${pad2(day)}`;
}

export function getPriceHistoryCanonicalDate(date = new Date()) {
  return new Date(`${getPriceHistoryBusinessDateKey(date)}T00:00:00.000Z`);
}

export function shiftPriceHistoryDateKey(dateKey: string, days: number) {
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function getAvailablePriceHistoryChartRangesFromWindows(
  windows: ChartWindowSummary[] | null | undefined
): PriceHistoryChartRange[] {
  if (!windows || windows.length === 0) {
    return [];
  }

  const getCollectedDays = (days: number) =>
    windows.find((window) => window.days === days)?.collectedDays ?? 0;

  const availableRanges: PriceHistoryChartRange[] = [];
  const collectedDays30 = getCollectedDays(30);

  if (collectedDays30 >= 1 && collectedDays30 < 30) {
    availableRanges.push(collectedDays30);
    return availableRanges;
  }

  for (const range of PRICE_HISTORY_CHART_RANGES) {
    if (range === 7) continue;

    if (getCollectedDays(range) >= range) {
      availableRanges.push(range);
    }
  }

  return availableRanges;
}

export function getVisiblePriceHistoryChartRanges(
  availableRanges: PriceHistoryChartRange[]
) {
  if (availableRanges.length <= 3) {
    return availableRanges;
  }

  const monthlyRanges = availableRanges.filter((range) => range >= 30);
  if (monthlyRanges.length <= 3) {
    return availableRanges;
  }

  const visible = new Set<PriceHistoryChartRange>();
  const maxRange = monthlyRanges[monthlyRanges.length - 1];

  if (availableRanges.includes(30)) {
    visible.add(30);
  }

  if (maxRange === 365) {
    if (availableRanges.includes(180)) {
      visible.add(180);
    } else if (availableRanges.includes(90)) {
      visible.add(90);
    }

    visible.add(365);
  } else {
    const preferredMiddle =
      [...monthlyRanges]
        .reverse()
        .find((range) => range < maxRange && range <= 180 && range > 30) ??
      monthlyRanges[Math.floor(monthlyRanges.length / 2)];

    if (preferredMiddle && preferredMiddle !== 30 && preferredMiddle !== maxRange) {
      visible.add(preferredMiddle);
    }

    visible.add(maxRange);
  }

  return availableRanges.filter((range) => visible.has(range));
}

export function formatPriceHistoryRangeLabel(range: PriceHistoryChartRange) {
  return range === 365 ? "1 ano" : `${range}d`;
}

export function getAvailablePriceHistoryChartRangesFromDateKeys(
  dateKeys: string[],
  referenceDate = new Date()
): PriceHistoryChartRange[] {
  const todayKey = getPriceHistoryBusinessDateKey(referenceDate);
  const uniqueDateKeys = Array.from(new Set(dateKeys))
    .filter((dateKey) => dateKey <= todayKey)
    .sort();

  if (uniqueDateKeys.length === 0) {
    return [];
  }

  const countDaysInWindow = (days: number) => {
    const sinceKey = shiftPriceHistoryDateKey(todayKey, -(days - 1));
    return uniqueDateKeys.filter((dateKey) => dateKey >= sinceKey).length;
  };

  const availableRanges: PriceHistoryChartRange[] = [];
  const collectedDays30 = countDaysInWindow(30);

  if (collectedDays30 >= 1 && collectedDays30 < 30) {
    availableRanges.push(collectedDays30);
    return availableRanges;
  }

  for (const range of PRICE_HISTORY_CHART_RANGES) {
    if (range === 7) continue;

    if (countDaysInWindow(range) >= range) {
      availableRanges.push(range);
    }
  }

  return availableRanges;
}
