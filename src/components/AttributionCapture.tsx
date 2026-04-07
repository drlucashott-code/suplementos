"use client";

import { useEffect } from "react";

type ClickTrackingContext = {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  inferredSource?: string;
  referrer?: string;
};

const ATTRIBUTION_STORAGE_KEY = "amazonpicks-attribution";

function inferSourceFromReferrer(referrer: string) {
  if (!referrer) return undefined;

  try {
    const hostname = new URL(referrer).hostname.toLowerCase().replace(/^www\./, "");

    if (hostname.includes("instagram")) return "instagram";
    if (hostname.includes("facebook")) return "facebook";
    if (hostname.includes("t.co") || hostname.includes("twitter") || hostname.includes("x.com")) {
      return "x";
    }
    if (hostname.includes("google")) return "google";
    if (hostname.includes("youtube")) return "youtube";
    if (hostname.includes("whatsapp")) return "whatsapp";
    if (hostname.includes("pinterest")) return "pinterest";

    return hostname;
  } catch {
    return undefined;
  }
}

function readStoredAttribution(): ClickTrackingContext {
  try {
    const raw = window.sessionStorage.getItem(ATTRIBUTION_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ClickTrackingContext) : {};
  } catch {
    return {};
  }
}

function writeStoredAttribution(value: ClickTrackingContext) {
  try {
    window.sessionStorage.setItem(ATTRIBUTION_STORAGE_KEY, JSON.stringify(value));
  } catch {
    // Ignore storage failures to avoid breaking navigation.
  }
}

function removeUtmParamsFromCurrentUrl() {
  const url = new URL(window.location.href);
  const paramsToDelete: string[] = [];

  url.searchParams.forEach((_value, key) => {
    if (key.toLowerCase().startsWith("utm_")) {
      paramsToDelete.push(key);
    }
  });

  if (paramsToDelete.length === 0) {
    return;
  }

  for (const key of paramsToDelete) {
    url.searchParams.delete(key);
  }

  const query = url.searchParams.toString();
  const nextUrl = `${url.pathname}${query ? `?${query}` : ""}${url.hash ?? ""}`;
  window.history.replaceState(window.history.state, "", nextUrl);
}

export function AttributionCapture() {
  useEffect(() => {
    const url = new URL(window.location.href);
    const utmSource = url.searchParams.get("utm_source")?.trim() || "";
    const utmMedium = url.searchParams.get("utm_medium")?.trim() || "";
    const utmCampaign = url.searchParams.get("utm_campaign")?.trim() || "";

    const hasUtm = Boolean(utmSource || utmMedium || utmCampaign);

    if (hasUtm) {
      const stored = readStoredAttribution();
      const referrer = document.referrer || stored.referrer || "";
      const inferredSource =
        stored.inferredSource || inferSourceFromReferrer(referrer) || undefined;

      writeStoredAttribution({
        utmSource: utmSource || stored.utmSource,
        utmMedium: utmMedium || stored.utmMedium,
        utmCampaign: utmCampaign || stored.utmCampaign,
        inferredSource,
        referrer: referrer || undefined,
      });

      removeUtmParamsFromCurrentUrl();
    }
  }, []);

  return null;
}

