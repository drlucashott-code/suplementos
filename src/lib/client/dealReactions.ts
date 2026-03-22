"use client";

export const DEAL_REACTIONS_EVENT = "amazonpicks-deal-reactions-changed";

const VOTES_STORAGE_KEY = "amazonpicks-deal-reactions";
const VISITOR_STORAGE_KEY = "amazonpicks-anonymous-visitor-id";

export type DealReaction = "like" | "dislike" | null;

type VoteMap = Record<string, "like" | "dislike">;

function normalizeAsin(asin: string) {
  return asin.trim().toUpperCase();
}

function readVotes(): VoteMap {
  if (typeof window === "undefined") return {};

  try {
    const raw = window.localStorage.getItem(VOTES_STORAGE_KEY);
    if (!raw) return {};

    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};

    return Object.entries(parsed as Record<string, unknown>).reduce<VoteMap>(
      (acc, [key, value]) => {
        if (value === "like" || value === "dislike") {
          acc[key] = value;
        }
        return acc;
      },
      {}
    );
  } catch {
    return {};
  }
}

function writeVotes(next: VoteMap) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(VOTES_STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event(DEAL_REACTIONS_EVENT));
}

export function getAnonymousVisitorId() {
  if (typeof window === "undefined") return "";

  const existing = window.localStorage.getItem(VISITOR_STORAGE_KEY);
  if (existing) return existing;

  const nextId = window.crypto.randomUUID();
  window.localStorage.setItem(VISITOR_STORAGE_KEY, nextId);
  return nextId;
}

export function getStoredReaction(asin: string): DealReaction {
  return readVotes()[normalizeAsin(asin)] ?? null;
}

export function setStoredReaction(asin: string, reaction: DealReaction) {
  const normalizedAsin = normalizeAsin(asin);
  const current = readVotes();

  if (reaction === null) {
    delete current[normalizedAsin];
  } else {
    current[normalizedAsin] = reaction;
  }

  writeVotes(current);
}
