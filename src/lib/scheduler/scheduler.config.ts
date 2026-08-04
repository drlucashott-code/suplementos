const MINUTES_PER_HOUR = 60;
const HOURS_PER_DAY = 24;

function daysToMinutes(days: number) {
  return days * HOURS_PER_DAY * MINUTES_PER_HOUR;
}

function booleanFromEnv(name: string, fallback: boolean) {
  const value = process.env[name];
  if (value == null) return fallback;
  return value.trim().toLowerCase() === "true";
}

function numberFromEnv(name: string, fallback: number) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) ? value : fallback;
}

export const schedulerConfig = Object.freeze({
  policyVersion: "v2",
  flags: {
    enabled: booleanFromEnv("SCHEDULER_V2_ENABLED", false),
    shadowMode: booleanFromEnv("SCHEDULER_V2_SHADOW_MODE", false),
    observationLedgerEnabled: booleanFromEnv("SCHEDULER_V2_OBSERVATION_LEDGER_ENABLED", false),
    urgentQueueEnabled: booleanFromEnv("SCHEDULER_V2_URGENT_QUEUE_ENABLED", false),
  },
  base: {
    historyWindowDays: numberFromEnv("SCHEDULER_V2_HISTORY_WINDOW_DAYS", 30),
    intervals: {
      dailyMinutes: numberFromEnv("SCHEDULER_V2_INTERVAL_DAILY_MINUTES", daysToMinutes(1)),
      everyTwoDaysMinutes: numberFromEnv(
        "SCHEDULER_V2_INTERVAL_EVERY_TWO_DAYS_MINUTES",
        daysToMinutes(2)
      ),
      everyThreeDaysMinutes: numberFromEnv(
        "SCHEDULER_V2_INTERVAL_EVERY_THREE_DAYS_MINUTES",
        daysToMinutes(3)
      ),
    },
    bootstrap: {
      stableAfterValidObservations: numberFromEnv(
        "SCHEDULER_V2_BOOTSTRAP_STABLE_OBSERVATIONS",
        7
      ),
      requiredValidObservations: numberFromEnv(
        "SCHEDULER_V2_BOOTSTRAP_REQUIRED_OBSERVATIONS",
        14
      ),
      minimumHistoryAgeMinutes: numberFromEnv(
        "SCHEDULER_V2_BOOTSTRAP_MIN_HISTORY_AGE_MINUTES",
        daysToMinutes(30)
      ),
    },
    changeRate: {
      dailyThreshold: numberFromEnv("SCHEDULER_V2_CHANGE_RATE_DAILY_THRESHOLD", 0.15),
      everyTwoDaysThreshold: numberFromEnv(
        "SCHEDULER_V2_CHANGE_RATE_EVERY_TWO_DAYS_THRESHOLD",
        0.05
      ),
    },
  },
});

export type SchedulerConfig = typeof schedulerConfig;

export function validateSchedulerConfig(config: SchedulerConfig = schedulerConfig) {
  const { bootstrap, changeRate, intervals } = config.base;

  if (
    !Number.isInteger(bootstrap.stableAfterValidObservations) ||
    !Number.isInteger(bootstrap.requiredValidObservations) ||
    bootstrap.stableAfterValidObservations <= 0 ||
    bootstrap.requiredValidObservations < bootstrap.stableAfterValidObservations
  ) {
    throw new Error("scheduler_config_invalid_bootstrap_observations");
  }

  if (
    intervals.dailyMinutes <= 0 ||
    intervals.everyTwoDaysMinutes < intervals.dailyMinutes ||
    intervals.everyThreeDaysMinutes < intervals.everyTwoDaysMinutes
  ) {
    throw new Error("scheduler_config_invalid_intervals");
  }

  if (
    changeRate.dailyThreshold < changeRate.everyTwoDaysThreshold ||
    changeRate.everyTwoDaysThreshold < 0 ||
    changeRate.dailyThreshold > 1
  ) {
    throw new Error("scheduler_config_invalid_change_rate_thresholds");
  }

  if (bootstrap.minimumHistoryAgeMinutes <= 0 || config.base.historyWindowDays <= 0) {
    throw new Error("scheduler_config_invalid_history_window");
  }
}

validateSchedulerConfig();
