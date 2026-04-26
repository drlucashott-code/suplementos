"use client";

export const ACCOUNT_FAVORITES_EVENT = "amazonpicks-account-favorites-changed";

const SESSION_CACHE_TTL_MS = 15_000;
const FAVORITES_CACHE_TTL_MS = 15_000;

export type AccountFavoriteCardItem = {
  id: string;
  savedAt: string;
  product: {
    id: string;
    asin: string;
    name: string;
    imageUrl: string | null;
    url: string;
    totalPrice: number;
    averagePrice30d: number | null;
    ratingAverage: number | null;
    ratingCount: number | null;
    category: {
      name: string;
      group: string;
      slug: string;
    };
  };
};

function emitFavoritesChange() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(ACCOUNT_FAVORITES_EVENT));
}

type SessionState = {
  authenticated?: boolean;
  user?: { id: string; email: string; displayName: string } | null;
};

let sessionCache:
  | {
      value: SessionState;
      expiresAt: number;
    }
  | null = null;
let sessionPromise: Promise<SessionState> | null = null;

let favoritesCache:
  | {
      value: AccountFavoriteCardItem[];
      expiresAt: number;
    }
  | null = null;
let favoritesPromise: Promise<AccountFavoriteCardItem[]> | null = null;

function clearFavoritesCaches() {
  sessionCache = null;
  sessionPromise = null;
  favoritesCache = null;
  favoritesPromise = null;
}

function readFreshCache<T>(cacheEntry: { value: T; expiresAt: number } | null) {
  if (!cacheEntry) return null;
  if (cacheEntry.expiresAt <= Date.now()) return null;
  return cacheEntry.value;
}

export async function getCurrentSessionState() {
  const cached = readFreshCache(sessionCache);
  if (cached) return cached;

  if (!sessionPromise) {
    sessionPromise = fetch("/api/auth/session", { cache: "no-store" })
      .then(async (response) => {
        const data = (await response.json()) as SessionState;
        const value: SessionState = {
          authenticated: Boolean(data.authenticated),
          user: data.user ?? null,
        };
        sessionCache = {
          value,
          expiresAt: Date.now() + SESSION_CACHE_TTL_MS,
        };
        return value;
      })
      .catch(() => {
        const fallback: SessionState = { authenticated: false, user: null };
        sessionCache = {
          value: fallback,
          expiresAt: Date.now() + 3_000,
        };
        return fallback;
      })
      .finally(() => {
        sessionPromise = null;
      });
  }

  return sessionPromise;
}

export async function fetchAccountFavorites() {
  const session = await getCurrentSessionState();
  if (!session.authenticated) {
    favoritesCache = {
      value: [],
      expiresAt: Date.now() + FAVORITES_CACHE_TTL_MS,
    };
    return [];
  }

  const cached = readFreshCache(favoritesCache);
  if (cached) return cached;

  if (!favoritesPromise) {
    favoritesPromise = fetch("/api/account/favorites", { cache: "no-store" })
      .then(async (response) => {
        const data = (await response.json()) as {
          ok?: boolean;
          favorites?: AccountFavoriteCardItem[];
          error?: string;
        };

        if (response.status === 401 || data.error === "unauthorized") {
          sessionCache = {
            value: { authenticated: false, user: null },
            expiresAt: Date.now() + SESSION_CACHE_TTL_MS,
          };
          favoritesCache = {
            value: [],
            expiresAt: Date.now() + FAVORITES_CACHE_TTL_MS,
          };
          return [];
        }

        if (!response.ok || !data.ok) {
          return [];
        }

        const favorites = data.favorites ?? [];
        favoritesCache = {
          value: favorites,
          expiresAt: Date.now() + FAVORITES_CACHE_TTL_MS,
        };
        return favorites;
      })
      .catch(() => [])
      .finally(() => {
        favoritesPromise = null;
      });
  }

  return favoritesPromise;
}

export async function getAccountFavoritesCount() {
  const favorites = await fetchAccountFavorites();
  return favorites.length;
}

export async function isAccountFavorite(productId: string) {
  const favorites = await fetchAccountFavorites();
  return favorites.some((favorite) => favorite.product.id === productId);
}

export async function toggleAccountFavorite(productId: string, nextSaved: boolean) {
  const session = await getCurrentSessionState();
  if (!session.authenticated) {
    return { ok: false as const, unauthorized: true as const };
  }

  const response = await fetch("/api/account/favorites", {
    method: nextSaved ? "POST" : "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ productId }),
  });

  const data = (await response.json()) as { ok?: boolean; error?: string };
  if (!response.ok || !data.ok) {
    if (response.status === 401 || data.error === "unauthorized") {
      clearFavoritesCaches();
      return { ok: false as const, unauthorized: true as const };
    }
    return { ok: false as const, unauthorized: false as const };
  }

  if (favoritesCache && !nextSaved) {
    const currentFavorites = favoritesCache.value;
    const nextFavorites = currentFavorites.filter(
      (favorite) => favorite.product.id !== productId
    );

    favoritesCache = {
      value: nextFavorites,
      expiresAt: Date.now() + FAVORITES_CACHE_TTL_MS,
    };
  } else {
    favoritesCache = null;
    favoritesPromise = null;
  }

  emitFavoritesChange();
  return { ok: true as const, unauthorized: false as const };
}
