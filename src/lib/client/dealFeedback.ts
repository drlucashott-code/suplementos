"use client";

export const DEAL_FEEDBACK_EVENT = "amazonpicks-deal-feedback-changed";
const DEAL_FEEDBACK_STORAGE_KEY = "amazonpicks-deal-feedback";

export type DealFeedbackVote = "like" | "dislike" | null;

type DealFeedbackMap = Record<string, "like" | "dislike">;

function readFeedbackMap(): DealFeedbackMap {
  if (typeof window === "undefined") return {};

  try {
    const raw = window.localStorage.getItem(DEAL_FEEDBACK_STORAGE_KEY);
    if (!raw) return {};

    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};

    return Object.entries(parsed as Record<string, unknown>).reduce<DealFeedbackMap>(
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

function writeFeedbackMap(next: DealFeedbackMap) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(DEAL_FEEDBACK_STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event(DEAL_FEEDBACK_EVENT));
}

export function getDealFeedback(asin: string): DealFeedbackVote {
  const normalizedAsin = asin.trim().toUpperCase();
  return readFeedbackMap()[normalizedAsin] ?? null;
}

export function setDealFeedback(asin: string, vote: "like" | "dislike") {
  const normalizedAsin = asin.trim().toUpperCase();
  const current = readFeedbackMap();
  const nextVote = current[normalizedAsin] === vote ? null : vote;

  if (nextVote === null) {
    delete current[normalizedAsin];
  } else {
    current[normalizedAsin] = nextVote;
  }

  writeFeedbackMap(current);
  return nextVote;
}
