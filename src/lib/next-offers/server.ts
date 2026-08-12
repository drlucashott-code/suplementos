import "server-only";

import {
  isNextOffersFeedResponse,
  type NextOffersFeedResponse,
} from "./types";

const allowedFeedParams = new Set([
  "q",
  "category",
  "price",
  "rating",
  "brand",
  "sort",
  "page",
]);

export function getNextOffersBaseUrl() {
  const configured = process.env.NEXT_OFFERS_API_URL?.trim();
  if (configured) return configured.replace(/\/+$/, "");
  return process.env.NODE_ENV === "development" ? "http://localhost:3001" : null;
}

export function getNextOffersAdminUrl() {
  const baseUrl = getNextOffersBaseUrl();
  return baseUrl ? new URL("/admin/vitrine", baseUrl).toString() : null;
}

export async function fetchNextOffersFeed(
  params?: URLSearchParams,
  timeoutMs = 10_000,
): Promise<NextOffersFeedResponse> {
  const baseUrl = getNextOffersBaseUrl();
  if (!baseUrl) throw new Error("NEXT_OFFERS_API_URL não foi configurada.");

  const url = new URL("/api/public/home-feed", baseUrl);
  params?.forEach((value, key) => {
    if (allowedFeedParams.has(key)) url.searchParams.set(key, value);
  });

  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) {
    throw new Error(`Feed novo respondeu com HTTP ${response.status}.`);
  }

  const payload: unknown = await response.json();
  if (!isNextOffersFeedResponse(payload)) {
    throw new Error("O feed novo retornou um contrato incompatível.");
  }
  return payload;
}

export async function tryFetchNextOffersFeed() {
  try {
    return await fetchNextOffersFeed();
  } catch (error) {
    console.error("Não foi possível carregar o feed novo de ofertas.", error);
    return null;
  }
}
