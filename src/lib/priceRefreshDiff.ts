type FlatPrimitive = string | number | boolean | null | undefined;

function normalizeNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function getProgramAndSavePriceFromAttributes(
  attributes: Record<string, FlatPrimitive> | null | undefined
) {
  return (
    normalizeNumber(attributes?.precoProgramaPoupe) ??
    normalizeNumber(attributes?.precoAssinatura) ??
    normalizeNumber(attributes?.precoSubscribeAndSave)
  );
}

export function areFlatRecordsEqual(
  left: Record<string, FlatPrimitive>,
  right: Record<string, FlatPrimitive>
) {
  const leftKeys = Object.keys(left).sort();
  const rightKeys = Object.keys(right).sort();

  if (leftKeys.length !== rightKeys.length) return false;

  for (let index = 0; index < leftKeys.length; index += 1) {
    const leftKey = leftKeys[index];
    const rightKey = rightKeys[index];
    if (leftKey !== rightKey) return false;
    if (left[leftKey!] !== right[rightKey!]) return false;
  }

  return true;
}

export function hasMeaningfulDynamicStateChange(params: {
  currentPrice: number;
  nextPrice: number;
  currentAvailabilityStatus: string | null | undefined;
  nextAvailabilityStatus: string;
  currentAttributes: Record<string, FlatPrimitive>;
  nextAttributes: Record<string, FlatPrimitive>;
}) {
  return (
    Math.abs(params.currentPrice - params.nextPrice) > 0.009 ||
    (params.currentAvailabilityStatus ?? null) !== params.nextAvailabilityStatus ||
    !areFlatRecordsEqual(params.currentAttributes, params.nextAttributes)
  );
}

export function hasMeaningfulTrackedStateChange(params: {
  currentPrice: number;
  nextPrice: number;
  currentAvailabilityStatus: string | null | undefined;
  nextAvailabilityStatus: string;
  currentProgramAndSavePrice: number | null | undefined;
  nextProgramAndSavePrice: number | null | undefined;
}) {
  const currentProgramAndSavePrice = params.currentProgramAndSavePrice ?? null;
  const nextProgramAndSavePrice = params.nextProgramAndSavePrice ?? null;

  return (
    Math.abs(params.currentPrice - params.nextPrice) > 0.009 ||
    (params.currentAvailabilityStatus ?? null) !== params.nextAvailabilityStatus ||
    currentProgramAndSavePrice !== nextProgramAndSavePrice
  );
}
