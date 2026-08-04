import assert from "node:assert/strict";
import test from "node:test";

import {
  computeFailureRetryAt,
  computeNextBaseRefreshAt,
  isSchedulerV2RolloutEligible,
} from "../../src/lib/scheduler/schedulerRuntime";

const now = new Date("2026-08-04T12:00:00.000Z");
const anchor = new Date("2026-01-01T00:00:00.000Z");

test("coorte de rollout é determinística e respeita extremos", () => {
  assert.equal(isSchedulerV2RolloutEligible("product-a", 0), false);
  assert.equal(isSchedulerV2RolloutEligible("product-a", 100), true);
  assert.equal(
    isSchedulerV2RolloutEligible("product-a", 37),
    isSchedulerV2RolloutEligible("product-a", 37)
  );
});

test("primeiro agendamento usa fase determinística e futura", () => {
  const first = computeNextBaseRefreshAt({
    productId: "product-a",
    completedAt: now,
    previousScheduledAt: null,
    intervalMinutes: 24 * 60,
    phaseAnchorAt: anchor,
  });
  const sameProduct = computeNextBaseRefreshAt({
    productId: "product-a",
    completedAt: now,
    previousScheduledAt: null,
    intervalMinutes: 24 * 60,
    phaseAnchorAt: anchor,
  });

  assert.equal(first.toISOString(), sameProduct.toISOString());
  assert.ok(first.getTime() > now.getTime());
});

test("agenda seguinte preserva a fase mesmo após atraso", () => {
  const previousScheduledAt = new Date("2026-07-30T03:17:00.000Z");
  const next = computeNextBaseRefreshAt({
    productId: "product-a",
    completedAt: now,
    previousScheduledAt,
    intervalMinutes: 72 * 60,
    phaseAnchorAt: anchor,
  });

  assert.equal(next.getUTCHours(), previousScheduledAt.getUTCHours());
  assert.equal(next.getUTCMinutes(), previousScheduledAt.getUTCMinutes());
  assert.ok(next.getTime() > now.getTime());
});

test("backoff dobra até o teto configurado", () => {
  const first = computeFailureRetryAt({
    completedAt: now,
    failureCount: 1,
    firstRetryMinutes: 60,
    maximumRetryMinutes: 7 * 24 * 60,
  });
  const capped = computeFailureRetryAt({
    completedAt: now,
    failureCount: 99,
    firstRetryMinutes: 60,
    maximumRetryMinutes: 7 * 24 * 60,
  });

  assert.equal(first.getTime() - now.getTime(), 60 * 60 * 1000);
  assert.equal(capped.getTime() - now.getTime(), 7 * 24 * 60 * 60 * 1000);
});
