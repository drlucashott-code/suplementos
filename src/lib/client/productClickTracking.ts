"use client";

import { sendGAEvent } from "@next/third-parties/google";
import {
  normalizeAttributionSource,
} from "@/lib/attributionSource";

type ClickTrackingContext = {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  inferredSource?: string;
  pagePath?: string;
  referrer?: string;
  visitorId?: string;
  sessionId?: string;
  sessionStartedAt?: string;
};

type TrackProductClickInput = {
  asin: string;
  productId?: string;
  productName?: string;
  value?: number;
  category?: string;
};

const ATTRIBUTION_STORAGE_KEY = "amazonpicks-attribution";
const VISITOR_ID_STORAGE_KEY = "amazonpicks-visitor-id";
const SESSION_STORAGE_KEY = "amazonpicks-click-session";
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

type ClientClickSession = {
  sessionId: string;
  startedAt: string;
  lastActivityAt: string;
};

let sessionCloseListenerRegistered = false;

function createRandomId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `v_${Math.random().toString(36).slice(2)}_${Date.now()}`;
}

function getOrCreateVisitorId() {
  if (typeof window === "undefined") return undefined;
  try {
    const existing = window.localStorage.getItem(VISITOR_ID_STORAGE_KEY)?.trim();
    if (existing) return existing;
    const created = createRandomId();
    window.localStorage.setItem(VISITOR_ID_STORAGE_KEY, created);
    return created;
  } catch {
    return undefined;
  }
}

function readSession(): ClientClickSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ClientClickSession;
    if (!parsed?.sessionId || !parsed?.startedAt || !parsed?.lastActivityAt) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeSession(session: ClientClickSession) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  } catch {
    // no-op
  }
}

function closeSessionOnServer(session: ClientClickSession, visitorId: string) {
  if (typeof navigator === "undefined") return;
  try {
    const payload = JSON.stringify({
      visitorId,
      sessionId: session.sessionId,
    });
    const blob = new Blob([payload], { type: "application/json" });
    navigator.sendBeacon("/api/click-session/close", blob);
  } catch {
    // no-op
  }
}

function registerSessionCloseListener() {
  if (typeof window === "undefined" || sessionCloseListenerRegistered) return;

  const handler = () => {
    const visitorId = getOrCreateVisitorId();
    const session = readSession();
    if (!visitorId || !session) return;
    closeSessionOnServer(session, visitorId);
  };

  window.addEventListener("pagehide", handler);
  window.addEventListener("beforeunload", handler);
  sessionCloseListenerRegistered = true;
}

function getOrCreateSessionContext() {
  if (typeof window === "undefined") {
    return {
      visitorId: undefined,
      sessionId: undefined,
      sessionStartedAt: undefined,
    };
  }

  const visitorId = getOrCreateVisitorId();
  const now = new Date();
  const nowIso = now.toISOString();
  const existing = readSession();

  if (!existing) {
    const next: ClientClickSession = {
      sessionId: createRandomId(),
      startedAt: nowIso,
      lastActivityAt: nowIso,
    };
    writeSession(next);
    registerSessionCloseListener();
    return {
      visitorId,
      sessionId: next.sessionId,
      sessionStartedAt: next.startedAt,
    };
  }

  const lastActivity = new Date(existing.lastActivityAt);
  const isStale =
    !Number.isFinite(lastActivity.getTime()) ||
    now.getTime() - lastActivity.getTime() > SESSION_TIMEOUT_MS;

  if (isStale) {
    if (visitorId) {
      closeSessionOnServer(existing, visitorId);
    }
    const next: ClientClickSession = {
      sessionId: createRandomId(),
      startedAt: nowIso,
      lastActivityAt: nowIso,
    };
    writeSession(next);
    registerSessionCloseListener();
    return {
      visitorId,
      sessionId: next.sessionId,
      sessionStartedAt: next.startedAt,
    };
  }

  const nextExisting: ClientClickSession = {
    ...existing,
    lastActivityAt: nowIso,
  };
  writeSession(nextExisting);
  registerSessionCloseListener();
  return {
    visitorId,
    sessionId: nextExisting.sessionId,
    sessionStartedAt: nextExisting.startedAt,
  };
}

export function initClickSessionTracking() {
  getOrCreateSessionContext();
}

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

function getExternalReferrer(): string | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }

  const referrer = document.referrer?.trim();

  if (!referrer) {
    return undefined;
  }

  try {
    const refUrl = new URL(referrer);
    const currentUrl = new URL(window.location.href);

    if (
      refUrl.hostname.replace(/^www\./, "") ===
      currentUrl.hostname.replace(/^www\./, "")
    ) {
      return undefined;
    }

    return referrer;
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
  const externalReferrer = getExternalReferrer();
  const currentReferrer = stored.referrer || externalReferrer || "";

  const currentContext: ClickTrackingContext = {
    utmSource:
      normalizeAttributionSource(searchParams.get("utm_source")) ||
      normalizeAttributionSource(stored.utmSource) ||
      undefined,
    utmMedium: searchParams.get("utm_medium") || stored.utmMedium,
    utmCampaign: searchParams.get("utm_campaign") || stored.utmCampaign,
    referrer: currentReferrer || undefined,
    inferredSource:
      normalizeAttributionSource(searchParams.get("utm_source")) ||
      normalizeAttributionSource(stored.inferredSource) ||
      normalizeAttributionSource(inferSourceFromReferrer(currentReferrer)) ||
      undefined,
    pagePath: `${window.location.pathname}${window.location.search}`,
  };

  writeStored({
    utmSource: currentContext.utmSource || stored.utmSource,
    utmMedium: currentContext.utmMedium,
    utmCampaign: currentContext.utmCampaign,
    inferredSource: stored.inferredSource || currentContext.inferredSource,
    referrer: stored.referrer || currentContext.referrer,
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
  const sessionContext = getOrCreateSessionContext();

  void fetch("/api/priority-refresh", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      asin: normalizedAsin,
      reason: "click",
      ...trackingContext,
      ...sessionContext,
    }),
    keepalive: true,
  }).catch(() => {
      // Mantem o clique fluindo mesmo se a fila falhar temporariamente.
  });
}
