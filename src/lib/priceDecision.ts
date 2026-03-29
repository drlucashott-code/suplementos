export type PriceDecisionLevel = "excellent" | "good" | "normal" | "expensive";

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
  lowestPrice30d: number | null | undefined;
  lowestPrice365d: number | null | undefined;
};

function toCents(value: number | null | undefined) {
  if (!value || value <= 0) return null;
  return Math.round(value * 100);
}

function getDeltaPercent(currentPrice: number, basePrice: number | null | undefined) {
  if (!basePrice || basePrice <= 0) return null;
  return ((currentPrice - basePrice) / basePrice) * 100;
}

export function getPriceMessage({
  currentPrice,
  averagePrice30d,
  lowestPrice30d,
  lowestPrice365d,
}: PriceDecisionInput): string | null {
  if (!currentPrice || currentPrice <= 0) {
    return null;
  }

  const currentCents = toCents(currentPrice);
  const min30Cents = toCents(lowestPrice30d);
  const min365Cents = toCents(lowestPrice365d);
  const avg30 = averagePrice30d && averagePrice30d > 0 ? averagePrice30d : null;

  if (currentCents !== null && min365Cents !== null && currentCents <= min365Cents) {
    return "Menor preço dos últimos 12 meses";
  }

  if (currentCents !== null && min30Cents !== null && currentCents <= min30Cents) {
    return "Menor preço dos últimos 30 dias";
  }

  if (lowestPrice30d && currentPrice <= lowestPrice30d * 1.05) {
    return "Um dos menores preços do mês";
  }

  if (avg30 && currentPrice <= avg30 * 0.95) {
    return "Abaixo do preço normal";
  }

  if (avg30 && currentPrice >= avg30 * 1.05) {
    return "Acima do preço normal";
  }

  if (avg30) {
    return "Preço dentro do normal";
  }

  return null;
}

export function buildPriceDecision({
  currentPrice,
  averagePrice30d,
  lowestPrice30d,
  lowestPrice365d,
}: PriceDecisionInput): PriceDecision | null {
  if (!currentPrice || currentPrice <= 0) {
    return null;
  }

  const message = getPriceMessage({
    currentPrice,
    averagePrice30d,
    lowestPrice30d,
    lowestPrice365d,
  });

  if (!message) {
    return null;
  }

  const deltaFromAveragePercent = getDeltaPercent(currentPrice, averagePrice30d);
  const deltaFromLowest30dPercent = getDeltaPercent(currentPrice, lowestPrice30d);

  let level: PriceDecisionLevel = "normal";
  let label = message;

  if (
    message === "Menor preço dos últimos 12 meses" ||
    message === "Menor preço dos últimos 30 dias" ||
    message === "Um dos menores preços do mês"
  ) {
    level = "excellent";
  } else if (message === "Abaixo do preço normal") {
    level = "good";
  } else if (message === "Acima do preço normal") {
    level = "expensive";
  }

  return {
    level,
    label,
    message,
    deltaFromAveragePercent,
    deltaFromLowest30dPercent,
  };
}
