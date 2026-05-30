const BLOCKED_MERCHANTS = ["Loja Suplemento", "Drogaria Araujo", "TodaVida"] as const;

type DynamicAttributesLike =
  | Record<string, string | number | boolean | null | undefined>
  | null
  | undefined;

function normalizeAttributeString(value: string | number | boolean | null | undefined) {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeMerchantName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

const NORMALIZED_BLOCKED_MERCHANTS = BLOCKED_MERCHANTS.map(normalizeMerchantName);

export function getBlockedMerchantNames() {
  return [...BLOCKED_MERCHANTS];
}

export function getCanonicalSellerFromAttributes(attributes: unknown) {
  if (!attributes || typeof attributes !== "object" || Array.isArray(attributes)) {
    return null;
  }

  const attrs = attributes as DynamicAttributesLike;
  return normalizeAttributeString(attrs?.seller);
}

export function isBlockedMerchantName(value: string | null | undefined) {
  if (!value) return false;
  return NORMALIZED_BLOCKED_MERCHANTS.includes(normalizeMerchantName(value));
}

export function getBlockedMerchantMatch(value: string | null | undefined) {
  if (!value) return null;
  const normalized = normalizeMerchantName(value);
  const index = NORMALIZED_BLOCKED_MERCHANTS.indexOf(normalized);
  return index >= 0 ? BLOCKED_MERCHANTS[index] : null;
}

export function getBlockedMerchantFromAttributes(attributes: unknown) {
  const canonicalSeller = getCanonicalSellerFromAttributes(attributes);
  const candidates = [canonicalSeller];

  for (const candidate of candidates) {
    if (typeof candidate !== "string" || candidate.length === 0) continue;
    const match = getBlockedMerchantMatch(candidate);
    if (match) return match;
  }

  return null;
}

export function hasBlockedMerchantInAttributes(attributes: unknown) {
  return getBlockedMerchantFromAttributes(attributes) !== null;
}

export function getNormalizedBlockedMerchantNames() {
  return [...NORMALIZED_BLOCKED_MERCHANTS];
}
