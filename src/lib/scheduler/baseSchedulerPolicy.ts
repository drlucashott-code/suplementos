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
  | "change_rate_low"
  | "business_priority_supplements";

export type BaseSchedulerState = {
  firstBaseObservationAt: Date | null;
  validBaseObservationCount: number;
  sawPriceChangeDuringBootstrap: boolean;
  changeRate30d: number | null;
  categoryGroup?: string | null;
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

  let decision: BaseRefreshScheduleDecision;
  if (!bootstrapComplete) {
    if (state.sawPriceChangeDuringBootstrap) {
      decision = createDecision({
        intervalMinutes: intervals.dailyMinutes,
        reason: "bootstrap_price_changed",
        state,
        bootstrapComplete,
      });
    } else if (state.validBaseObservationCount >= bootstrap.requiredValidObservations) {
      decision = createDecision({
        intervalMinutes: intervals.everyThreeDaysMinutes,
        reason: "bootstrap_stable_after_second_threshold",
        state,
        bootstrapComplete,
      });
    } else if (state.validBaseObservationCount >= bootstrap.stableAfterValidObservations) {
      decision = createDecision({
        intervalMinutes: intervals.everyTwoDaysMinutes,
        reason: "bootstrap_stable_after_first_threshold",
        state,
        bootstrapComplete,
      });
    } else {
      decision = createDecision({
        intervalMinutes: intervals.dailyMinutes,
        reason: "bootstrap_collecting_observations",
        state,
        bootstrapComplete,
      });
    }
  } else {
    const rate = Math.max(0, Math.min(1, state.changeRate30d ?? 0));
    if (rate >= changeRate.dailyThreshold) {
      decision = createDecision({
        intervalMinutes: intervals.dailyMinutes,
        reason: "change_rate_high",
        state,
        bootstrapComplete,
      });
    } else if (rate >= changeRate.everyTwoDaysThreshold) {
      decision = createDecision({
        intervalMinutes: intervals.everyTwoDaysMinutes,
        reason: "change_rate_medium",
        state,
        bootstrapComplete,
      });
    } else {
      decision = createDecision({
        intervalMinutes: intervals.everyThreeDaysMinutes,
        reason: "change_rate_low",
        state,
        bootstrapComplete,
      });
    }
  }

  if (
    state.categoryGroup?.trim().toLowerCase() === "suplementos" &&
    decision.intervalMinutes > intervals.dailyMinutes
  ) {
    return {
      ...decision,
      intervalMinutes: intervals.dailyMinutes,
      reason: "business_priority_supplements",
    };
  }
  return decision;
}
