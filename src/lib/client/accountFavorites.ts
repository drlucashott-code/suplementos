"use client";

export const ACCOUNT_FAVORITES_EVENT = "amazonpicks-account-favorites-changed";
const LAST_USED_LIST_STORAGE_KEY_PREFIX = "amazonpicks:last-used-list";

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
    lowestPrice30d: number | null;
    highestPrice30d: number | null;
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

export function getAccountLastUsedListStorageKey(userId: string) {
  return `${LAST_USED_LIST_STORAGE_KEY_PREFIX}:${userId}`;
}

export function readAccountLastUsedListId(userId: string) {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(getAccountLastUsedListStorageKey(userId));
}

export function rememberAccountLastUsedList(userId: string, listId: string | null) {
  if (typeof window === "undefined") return;
  const storageKey = getAccountLastUsedListStorageKey(userId);
  if (listId) {
    window.localStorage.setItem(storageKey, listId);
  } else {
    window.localStorage.removeItem(storageKey);
  }
}

type SessionState = {
  authenticated?: boolean;
  user?: { id: string; email: string; displayName: string; isEmailVerified?: boolean } | null;
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
  if (!session.authenticated || session.user?.isEmailVerified === false) {
    favoritesCache = {
      value: [],
      expiresAt: Date.now() + FAVORITES_CACHE_TTL_MS,
    };
    return [];
  }

  const cached = readFreshCache(favoritesCache);
  if (cached) return cached;

  if (!favoritesPromise) {
    const preferredListId = session.user ? readAccountLastUsedListId(session.user.id) : null;
    const endpoint = preferredListId
      ? `/api/account/favorites?listId=${encodeURIComponent(preferredListId)}`
      : "/api/account/favorites";

    favoritesPromise = fetch(endpoint, { cache: "no-store" })
      .then(async (response) => {
        const data = (await response.json()) as {
          ok?: boolean;
          favorites?: AccountFavoriteCardItem[];
          error?: string;
          list?: { id: string; slug: string; title: string; isDefault: boolean } | null;
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
        if (session.user && data.list?.id) {
          rememberAccountLastUsedList(session.user.id, data.list.id);
        }
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

export async function toggleAccountFavorite(
  productId: string,
  nextSaved: boolean,
  listId?: string | null
) {
  const session = await getCurrentSessionState();
  if (!session.authenticated) {
    return { ok: false as const, unauthorized: true as const };
  }
  if (session.user?.isEmailVerified === false) {
    return { ok: false as const, unauthorized: false as const, unverified: true as const };
  }

  const preferredListId = listId ?? (session.user ? readAccountLastUsedListId(session.user.id) : null);

  const response = await fetch("/api/account/favorites", {
    method: nextSaved ? "POST" : "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ productId, listId: preferredListId }),
  });

  const data = (await response.json()) as {
    ok?: boolean;
    error?: string;
    errorDetail?: string;
    list?: { id: string; slug: string; title: string; isDefault: boolean };
  };
  if (!response.ok || !data.ok) {
    if (response.status === 401 || data.error === "unauthorized") {
      clearFavoritesCaches();
      return { ok: false as const, unauthorized: true as const };
    }
    if (response.status === 403 || data.error === "email_verification_required") {
      return { ok: false as const, unauthorized: false as const, unverified: true as const };
    }
    return {
      ok: false as const,
      unauthorized: false as const,
      unverified: false as const,
      error: data.error ?? null,
      errorDetail: data.errorDetail ?? null,
    };
  }

  if (session.user && data.list?.id) {
    rememberAccountLastUsedList(session.user.id, data.list.id);
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
  return {
    ok: true as const,
    unauthorized: false as const,
    unverified: false as const,
    list: data.list ?? null,
  };
}
