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

  if (lower === "instagram" || lower === "instagram_story" || lower === "story") {
    return "instagram_story";
  }

  if (
    lower === "bio" ||
    lower === "instagrambio" ||
    lower === "ig_bio" ||
    lower === "instagram-bio"
  ) {
    return "instagram_bio";
  }

  if (lower === "google" || lower === "google_search" || lower === "search") {
    return "google";
  }

  if (lower === "facebook" || lower === "meta") {
    return "facebook";
  }

  if (lower === "whatsapp") {
    return "whatsapp";
  }

  if (lower === "youtube" || lower === "yt") {
    return "youtube";
  }

  if (lower === "pinterest") {
    return "pinterest";
  }

  if (lower === "x" || lower === "twitter") {
    return "x";
  }

  return raw;
}

function inferAttributionSourceFromReferrer(referrer?: string | null) {
  const raw = referrer?.trim();
  if (!raw) return null;

  try {
    const hostname = new URL(raw).hostname.toLowerCase().replace(/^www\./, "");

    if (hostname.includes("instagram")) return "instagram_story";
    if (hostname.includes("google")) return "google";
    if (hostname.includes("facebook") || hostname.includes("meta")) return "facebook";
    if (hostname.includes("t.co") || hostname.includes("twitter") || hostname.includes("x.com")) {
      return "x";
    }
    if (hostname.includes("youtube")) return "youtube";
    if (hostname.includes("whatsapp")) return "whatsapp";
    if (hostname.includes("pinterest")) return "pinterest";
  } catch {
    // no-op
  }

  return null;
}

function inferAttributionSourceFromCampaign(utmCampaign?: string | null) {
  const raw = utmCampaign?.trim();
  if (!raw) return null;

  const lower = raw.toLowerCase();
  if (lower.includes("instagram") && lower.includes("bio")) return "instagram_bio";
  if (lower.includes("instagram") && lower.includes("story")) return "instagram_story";
  if (lower.includes("bio")) return "instagram_bio";
  if (lower.includes("story")) return "instagram_story";
  if (lower.includes("google")) return "google";
  if (lower.includes("facebook")) return "facebook";
  if (lower.includes("whatsapp")) return "whatsapp";
  if (lower.includes("youtube")) return "youtube";
  if (lower.includes("pinterest")) return "pinterest";
  if (lower.includes("twitter") || lower.includes("x_") || lower.includes("_x")) return "x";
  return null;
}

export function resolveAttributionSource(params: {
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  inferredSource?: string | null;
  referrer?: string | null;
}): string {
  const normalizedUtmSource = normalizeAttributionSource(params.utmSource);
  const normalizedInferredSource = normalizeAttributionSource(params.inferredSource);
  const normalizedCampaignSource = normalizeAttributionSource(
    inferAttributionSourceFromCampaign(params.utmCampaign)
  );
  const normalizedReferrerSource = normalizeAttributionSource(
    inferAttributionSourceFromReferrer(params.referrer)
  );

  if (
    (normalizedUtmSource === "instagram_story" || normalizedUtmSource === "instagram_bio") &&
    params.utmCampaign
  ) {
    const campaignSource = inferAttributionSourceFromCampaign(params.utmCampaign);
    if (campaignSource) {
      return campaignSource;
    }
  }

  return (
    normalizedUtmSource ||
    normalizedCampaignSource ||
    normalizedReferrerSource ||
    normalizedInferredSource ||
    "direto"
  );
}

export function formatAttributionSourceLabel(value: string | null | undefined) {
  const normalized = normalizeAttributionSource(value);

  switch (normalized) {
    case "instagram_bio":
      return "Instagram bio";
    case "instagram_story":
      return "Instagram story";
    case "google":
      return "Google";
    case "facebook":
      return "Facebook";
    case "whatsapp":
      return "WhatsApp";
    case "youtube":
      return "YouTube";
    case "pinterest":
      return "Pinterest";
    case "x":
      return "X/Twitter";
    case "direto":
      return "Direto";
    default:
      return normalized ?? "Direto";
  }
}
