"use client";

import { sendGAEvent } from "@next/third-parties/google";

type ClickTrackingContext = {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  inferredSource?: string;
  pagePath?: string;
  referrer?: string;
};

type TrackProductClickInput = {
  asin: string;
  productId?: string;
  productName?: string;
  value?: number;
  category?: string;
};

const ATTRIBUTION_STORAGE_KEY = "amazonpicks-attribution";

function inferSourceFromReferrer(referrer: string) {
  if (!referrer) {
    return undefined;
  }

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

function getClickTrackingContext(): ClickTrackingContext {
  if (typeof window === "undefined") {
    return {};
  }

  const readStored = () => {
    try {
      const raw = window.sessionStorage.getItem(ATTRIBUTION_STORAGE_KEY);
      return raw ? (JSON.parse(raw) as ClickTrackingContext) : {};
    } catch {
      return {};
    }
  };

  const writeStored = (value: ClickTrackingContext) => {
    try {
      window.sessionStorage.setItem(ATTRIBUTION_STORAGE_KEY, JSON.stringify(value));
    } catch {
      // Ignora falha de storage para nao bloquear o clique.
    }
  };

  const stored = readStored();
  const searchParams = new URLSearchParams(window.location.search);
  const currentReferrer = document.referrer || stored.referrer || "";

  const currentContext: ClickTrackingContext = {
    utmSource: searchParams.get("utm_source") || stored.utmSource,
    utmMedium: searchParams.get("utm_medium") || stored.utmMedium,
    utmCampaign: searchParams.get("utm_campaign") || stored.utmCampaign,
    referrer: currentReferrer || undefined,
    inferredSource:
      stored.inferredSource || inferSourceFromReferrer(currentReferrer) || undefined,
    pagePath: `${window.location.pathname}${window.location.search}`,
  };

  writeStored({
    utmSource: currentContext.utmSource,
    utmMedium: currentContext.utmMedium,
    utmCampaign: currentContext.utmCampaign,
    inferredSource: currentContext.inferredSource,
    referrer: currentContext.referrer,
  });

  return currentContext;
}

export function trackProductClick({
  asin,
  productId,
  productName,
  value,
  category,
}: TrackProductClickInput) {
  const normalizedAsin = asin.trim().toUpperCase();

  if (!/^[A-Z0-9]{10}$/.test(normalizedAsin)) {
    return;
  }

  sendGAEvent("event", "click_na_oferta", {
    produto_nome: productName ? `${productName} - ${normalizedAsin}` : normalizedAsin,
    produto_id: productId,
    valor: value || 0,
    loja: "Amazon",
    asin: normalizedAsin,
    categoria: category || "dinamica",
  });

  const trackingContext = getClickTrackingContext();

  void fetch("/api/priority-refresh", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      asin: normalizedAsin,
      reason: "click",
      ...trackingContext,
    }),
    keepalive: true,
  }).catch(() => {
      // Mantem o clique fluindo mesmo se a fila falhar temporariamente.
  });
}
