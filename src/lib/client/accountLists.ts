"use client";

export type AccountListSummary = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  isPublic: boolean;
  isDefault: boolean;
  updatedAt?: string;
  itemsCount: number;
};

const LISTS_CACHE_TTL_MS = 15_000;

let listsCache:
  | {
      value: AccountListSummary[];
      expiresAt: number;
    }
  | null = null;
let listsPromise: Promise<AccountListSummary[]> | null = null;

function readFreshCache<T>(cacheEntry: { value: T; expiresAt: number } | null) {
  if (!cacheEntry) return null;
  if (cacheEntry.expiresAt <= Date.now()) return null;
  return cacheEntry.value;
}

export async function fetchAccountLists() {
  const cached = readFreshCache(listsCache);
  if (cached) return cached;

  if (!listsPromise) {
    listsPromise = fetch("/api/account/lists", { cache: "no-store" })
      .then(async (response) => {
        const data = (await response.json()) as {
          ok?: boolean;
          lists?: AccountListSummary[];
          error?: string;
        };

        if (!response.ok || !data.ok) {
          listsCache = {
            value: [],
            expiresAt: Date.now() + LISTS_CACHE_TTL_MS,
          };
          return [];
        }

        const lists = data.lists ?? [];
        listsCache = {
          value: lists,
          expiresAt: Date.now() + LISTS_CACHE_TTL_MS,
        };
        return lists;
      })
      .catch(() => [])
      .finally(() => {
        listsPromise = null;
      });
  }

  return listsPromise;
}

export async function getAccountListsCount() {
  const lists = await fetchAccountLists();
  return lists.length;
}
