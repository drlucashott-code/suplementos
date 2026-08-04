import assert from "node:assert/strict";
import test from "node:test";

import {
  resolveBaseRefreshSchedule,
  type BaseSchedulerState,
} from "../../src/lib/scheduler/baseSchedulerPolicy";
import { schedulerConfig } from "../../src/lib/scheduler/scheduler.config";

const now = new Date("2026-08-04T12:00:00.000Z");

function state(overrides: Partial<BaseSchedulerState> = {}): BaseSchedulerState {
  return {
    firstBaseObservationAt: new Date("2026-07-01T12:00:00.000Z"),
    validBaseObservationCount: schedulerConfig.base.bootstrap.requiredValidObservations,
    sawPriceChangeDuringBootstrap: false,
    changeRate30d: 0,
    ...overrides,
  };
}

test("mantem produto novo em 24h enquanto coleta observacoes", () => {
  const result = resolveBaseRefreshSchedule(
    state({ firstBaseObservationAt: null, validBaseObservationCount: 0 }),
    now
  );

  assert.equal(result.intervalMinutes, schedulerConfig.base.intervals.dailyMinutes);
  assert.equal(result.reason, "bootstrap_collecting_observations");
});

test("move bootstrap estavel para 48h apos o primeiro limite", () => {
  const result = resolveBaseRefreshSchedule(
    state({
      firstBaseObservationAt: new Date("2026-07-31T12:00:00.000Z"),
      validBaseObservationCount: schedulerConfig.base.bootstrap.stableAfterValidObservations,
      sawPriceChangeDuringBootstrap: false,
    }),
    now
  );

  assert.equal(result.intervalMinutes, schedulerConfig.base.intervals.everyTwoDaysMinutes);
  assert.equal(result.reason, "bootstrap_stable_after_first_threshold");
});

test("move bootstrap estavel para 72h apos o segundo limite", () => {
  const result = resolveBaseRefreshSchedule(
    state({
      firstBaseObservationAt: new Date("2026-07-21T12:00:00.000Z"),
      validBaseObservationCount: schedulerConfig.base.bootstrap.requiredValidObservations,
      sawPriceChangeDuringBootstrap: false,
    }),
    now
  );

  assert.equal(result.intervalMinutes, schedulerConfig.base.intervals.everyThreeDaysMinutes);
  assert.equal(result.reason, "bootstrap_stable_after_second_threshold");
});

test("mantem 24h durante bootstrap quando ja houve mudanca", () => {
  const result = resolveBaseRefreshSchedule(
    state({
      firstBaseObservationAt: new Date("2026-07-21T12:00:00.000Z"),
      validBaseObservationCount: schedulerConfig.base.bootstrap.requiredValidObservations,
      sawPriceChangeDuringBootstrap: true,
    }),
    now
  );

  assert.equal(result.intervalMinutes, schedulerConfig.base.intervals.dailyMinutes);
  assert.equal(result.reason, "bootstrap_price_changed");
});

test("usa 24h para taxa de mudanca alta apos bootstrap completo", () => {
  const result = resolveBaseRefreshSchedule(
    state({ changeRate30d: schedulerConfig.base.changeRate.dailyThreshold }),
    now
  );

  assert.equal(result.intervalMinutes, schedulerConfig.base.intervals.dailyMinutes);
  assert.equal(result.reason, "change_rate_high");
});

test("usa 48h para taxa de mudanca intermediaria apos bootstrap completo", () => {
  const result = resolveBaseRefreshSchedule(
    state({ changeRate30d: schedulerConfig.base.changeRate.everyTwoDaysThreshold }),
    now
  );

  assert.equal(result.intervalMinutes, schedulerConfig.base.intervals.everyTwoDaysMinutes);
  assert.equal(result.reason, "change_rate_medium");
});

test("usa 72h para taxa de mudanca baixa apos bootstrap completo", () => {
  const result = resolveBaseRefreshSchedule(state({ changeRate30d: 0.01 }), now);

  assert.equal(result.intervalMinutes, schedulerConfig.base.intervals.everyThreeDaysMinutes);
  assert.equal(result.reason, "change_rate_low");
});

test("a decisao expõe justificativa auditavel", () => {
  const result = resolveBaseRefreshSchedule(state({ changeRate30d: 0.06 }), now);

  assert.deepEqual(result.evidence, {
    validBaseObservationCount: schedulerConfig.base.bootstrap.requiredValidObservations,
    sawPriceChangeDuringBootstrap: false,
    changeRate30d: 0.06,
    bootstrapComplete: true,
  });
});
