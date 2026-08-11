"use client";

export type NextOfferImpression = {
  productId: string;
  page: "home" | "offers";
  section: "top-offers-next" | "offers-catalog";
  sortMode: "discount" | "popular";
  position: number;
  currentPrice: number;
  discountPercent: number;
  isDeal: boolean;
  isLowest90: boolean;
};

const pending = new Map<string, NextOfferImpression>();
let flushTimer: ReturnType<typeof setTimeout> | null = null;

export function queueNextOfferImpression(event: NextOfferImpression) {
  pending.set(`${event.sortMode}:${event.productId}`, event);
  flushTimer ??= setTimeout(flushNextOfferImpressions, 250);
}

function flushNextOfferImpressions() {
  flushTimer = null;
  const events = [...pending.values()];
  pending.clear();
  if (!events.length) return;

  void fetch("/api/next-offers/impression", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ events }),
    keepalive: true,
  }).catch(() => undefined);
}
