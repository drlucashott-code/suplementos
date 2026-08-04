import {
  schedulerConfig,
  type SchedulerConfig,
} from "./scheduler.config";

export type BaseSchedulerDecisionReason =
  | "bootstrap_collecting_observations"
  | "bootstrap_stable_after_first_threshold"
  | "bootstrap_stable_after_second_threshold"
  | "bootstrap_price_changed"
  | "change_rate_high"
  | "change_rate_medium"
  | "change_rate_low";

export type BaseSchedulerState = {
  firstBaseObservationAt: Date | null;
  validBaseObservationCount: number;
  sawPriceChangeDuringBootstrap: boolean;
  changeRate30d: number | null;
};

export type BaseRefreshScheduleDecision = {
  intervalMinutes: number;
  reason: BaseSchedulerDecisionReason;
  evidence: {
    validBaseObservationCount: number;
    sawPriceChangeDuringBootstrap: boolean;
    changeRate30d: number | null;
    bootstrapComplete: boolean;
  };
};

function isBootstrapComplete(
  state: BaseSchedulerState,
  now: Date,
  config: SchedulerConfig
) {
  if (!state.firstBaseObservationAt) return false;
  if (state.validBaseObservationCount < config.base.bootstrap.requiredValidObservations) {
    return false;
  }

  return (
    now.getTime() - state.firstBaseObservationAt.getTime() >=
    config.base.bootstrap.minimumHistoryAgeMinutes * 60 * 1000
  );
}

function createDecision(params: {
  intervalMinutes: number;
  reason: BaseSchedulerDecisionReason;
  state: BaseSchedulerState;
  bootstrapComplete: boolean;
}): BaseRefreshScheduleDecision {
  return {
    intervalMinutes: params.intervalMinutes,
    reason: params.reason,
    evidence: {
      validBaseObservationCount: params.state.validBaseObservationCount,
      sawPriceChangeDuringBootstrap: params.state.sawPriceChangeDuringBootstrap,
      changeRate30d: params.state.changeRate30d,
      bootstrapComplete: params.bootstrapComplete,
    },
  };
}

/**
 * Pure V2 base policy. It only decides the normal catalog cadence; urgent
 * refreshes, retries and experiments must not alter this decision.
 */
export function resolveBaseRefreshSchedule(
  state: BaseSchedulerState,
  now = new Date(),
  config: SchedulerConfig = schedulerConfig
): BaseRefreshScheduleDecision {
  const bootstrapComplete = isBootstrapComplete(state, now, config);
  const { bootstrap, changeRate, intervals } = config.base;

  if (!bootstrapComplete) {
    if (state.sawPriceChangeDuringBootstrap) {
      return createDecision({
        intervalMinutes: intervals.dailyMinutes,
        reason: "bootstrap_price_changed",
        state,
        bootstrapComplete,
      });
    }

    if (state.validBaseObservationCount >= bootstrap.requiredValidObservations) {
      return createDecision({
        intervalMinutes: intervals.everyThreeDaysMinutes,
        reason: "bootstrap_stable_after_second_threshold",
        state,
        bootstrapComplete,
      });
    }

    if (state.validBaseObservationCount >= bootstrap.stableAfterValidObservations) {
      return createDecision({
        intervalMinutes: intervals.everyTwoDaysMinutes,
        reason: "bootstrap_stable_after_first_threshold",
        state,
        bootstrapComplete,
      });
    }

    return createDecision({
      intervalMinutes: intervals.dailyMinutes,
      reason: "bootstrap_collecting_observations",
      state,
      bootstrapComplete,
    });
  }

  const rate = Math.max(0, Math.min(1, state.changeRate30d ?? 0));
  if (rate >= changeRate.dailyThreshold) {
    return createDecision({
      intervalMinutes: intervals.dailyMinutes,
      reason: "change_rate_high",
      state,
      bootstrapComplete,
    });
  }

  if (rate >= changeRate.everyTwoDaysThreshold) {
    return createDecision({
      intervalMinutes: intervals.everyTwoDaysMinutes,
      reason: "change_rate_medium",
      state,
      bootstrapComplete,
    });
  }

  return createDecision({
    intervalMinutes: intervals.everyThreeDaysMinutes,
    reason: "change_rate_low",
    state,
    bootstrapComplete,
  });
}
