"use client";

import type { BestDeal } from "@/lib/bestDeals";

export const SAVED_DEALS_STORAGE_KEY = "amazonpicks-saved-deals";
export const SAVED_DEALS_EVENT = "amazonpicks-saved-deals-changed";

export type SavedDeal = Pick<
  BestDeal,
  | "id"
  | "asin"
  | "name"
  | "imageUrl"
  | "url"
  | "totalPrice"
  | "averagePrice30d"
  | "discountPercent"
  | "ratingAverage"
  | "ratingCount"
  | "likeCount"
  | "dislikeCount"
  | "categoryName"
  | "categoryGroup"
  | "categorySlug"
> & {
  savedAt: string;
};

export type SaveableDeal = Pick<
  SavedDeal,
  | "id"
  | "asin"
  | "name"
  | "imageUrl"
  | "url"
  | "totalPrice"
  | "averagePrice30d"
  | "discountPercent"
  | "ratingAverage"
  | "ratingCount"
  | "likeCount"
  | "dislikeCount"
  | "categoryName"
  | "categoryGroup"
  | "categorySlug"
>;

function canUseStorage() {
  return typeof window !== "undefined";
}

function dispatchSavedDealsChange() {
  if (!canUseStorage()) return;
  window.dispatchEvent(new Event(SAVED_DEALS_EVENT));
}

export function getSavedDeals(): SavedDeal[] {
  if (!canUseStorage()) return [];

  try {
    const raw = window.localStorage.getItem(SAVED_DEALS_STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SavedDeal[]) : [];
  } catch {
    return [];
  }
}

function persistSavedDeals(deals: SavedDeal[]) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(SAVED_DEALS_STORAGE_KEY, JSON.stringify(deals));
  dispatchSavedDealsChange();
}

export function isDealSaved(asin: string) {
  return getSavedDeals().some((deal) => deal.asin === asin);
}

export function saveDeal(deal: SaveableDeal) {
  const current = getSavedDeals().filter((item) => item.asin !== deal.asin);
  const next: SavedDeal[] = [
    {
      id: deal.id,
      asin: deal.asin,
      name: deal.name,
      imageUrl: deal.imageUrl,
      url: deal.url,
      totalPrice: deal.totalPrice,
      averagePrice30d: deal.averagePrice30d,
      discountPercent: deal.discountPercent,
      ratingAverage: deal.ratingAverage,
      ratingCount: deal.ratingCount,
      likeCount: deal.likeCount,
      dislikeCount: deal.dislikeCount,
      categoryName: deal.categoryName,
      categoryGroup: deal.categoryGroup,
      categorySlug: deal.categorySlug,
      savedAt: new Date().toISOString(),
    },
    ...current,
  ];

  persistSavedDeals(next);
}

export function removeSavedDeal(asin: string) {
  persistSavedDeals(getSavedDeals().filter((deal) => deal.asin !== asin));
}

export function toggleSavedDeal(deal: SaveableDeal) {
  if (isDealSaved(deal.asin)) {
    removeSavedDeal(deal.asin);
    return false;
  }

  saveDeal(deal);
  return true;
}
