export function normalizeAttributionSource(
  value: string | null | undefined
): string | null {
  const raw = value?.trim();

  if (!raw) {
    return null;
  }

  const lower = raw.toLowerCase();

  if (lower === "ig" || lower === "instagram_bio") {
    return "instagram_bio";
  }

  if (lower === "instagram" || lower === "instagram_story") {
    return "instagram_story";
  }

  return raw;
}

export function resolveAttributionSource(params: {
  utmSource?: string | null;
  inferredSource?: string | null;
}): string {
  return (
    normalizeAttributionSource(params.utmSource) ||
    normalizeAttributionSource(params.inferredSource) ||
    "direto"
  );
}
