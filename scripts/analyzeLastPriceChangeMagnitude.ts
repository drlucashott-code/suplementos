import "dotenv/config";
import { prisma } from "../src/lib/prisma";

type HistoryRow = {
  productId: string;
  price: number;
  updateCount: number;
  date: Date;
};

type Comparison = {
  date: Date;
  changed: boolean;
};

type Event = {
  productId: string;
  date: Date;
  magnitude: number;
  direction: "up" | "down";
  changeRate30d: number;
  daysSincePreviousChange: number;
  outcomes: Record<number, 0 | 1>;
};

type Feature = {
  name: string;
  value: (event: Event) => number;
};

type FittedModel = {
  features: Feature[];
  means: number[];
  deviations: number[];
  weights: Float64Array;
};

type Prediction = {
  productId: string;
  outcome: 0 | 1;
  score: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const HORIZONS = [1, 2, 3, 7, 14] as const;
const EVALUATION_HORIZONS = [1, 2, 3] as const;
const FOLD_START_SHARES = [0.7, 0.8, 0.9] as const;
const MAX_TRAIN_ROWS = 100_000;
const BOOTSTRAP_REPLICATES = 500;

function dayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function dayNumber(date: Date) {
  return Math.floor(date.getTime() / DAY_MS);
}

function mean(values: number[]) {
  return values.reduce((total, value) => total + value, 0) / Math.max(1, values.length);
}

function quantile(values: number[], probability: number) {
  const sorted = [...values].sort((left, right) => left - right);
  if (sorted.length === 0) return 0;
  const position = (sorted.length - 1) * probability;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (position - lower);
}

function formatPercent(value: number) {
  return `${(value * 100).toFixed(2)}%`;
}

function sigmoid(value: number) {
  if (value >= 0) return 1 / (1 + Math.exp(-value));
  const exp = Math.exp(value);
  return exp / (1 + exp);
}

function stableHash(value: string) {
  let hash = 2_166_136_261;
  for (let index = 0; index < value.length; index += 1) {
    hash = Math.imul(hash ^ value.charCodeAt(index), 16_777_619);
  }
  return hash >>> 0;
}

function sampleForTraining(events: Event[]) {
  if (events.length <= MAX_TRAIN_ROWS) return events;
  return events
    .map((event) => ({ event, hash: stableHash(`${event.productId}:${dayKey(event.date)}`) }))
    .sort((left, right) => left.hash - right.hash)
    .slice(0, MAX_TRAIN_ROWS)
    .map((entry) => entry.event);
}

function buildFeatures(variant: "current" | "magnitude" | "direction" | "both"): Feature[] {
  const current: Feature[] = [
    { name: "intercept", value: () => 1 },
    { name: "change_rate_30d", value: (event) => event.changeRate30d },
    {
      name: "log_days_since_previous_change",
      value: (event) => Math.log1p(event.daysSincePreviousChange),
    },
  ];
  if (variant === "magnitude" || variant === "both") {
    current.push({
      name: "log_last_change_magnitude",
      value: (event) => Math.log1p(event.magnitude * 100),
    });
  }
  if (variant === "direction" || variant === "both") {
    current.push({ name: "last_change_was_up", value: (event) => (event.direction === "up" ? 1 : 0) });
  }
  return current;
}

function fitLogistic(train: Event[], horizon: number, features: Feature[]): FittedModel {
  const rows = sampleForTraining(train);
  const means = features.map((feature, index) =>
    index === 0 ? 0 : mean(rows.map((event) => feature.value(event)))
  );
  const deviations = features.map((feature, index) => {
    if (index === 0) return 1;
    const average = means[index];
    return Math.sqrt(mean(rows.map((event) => (feature.value(event) - average) ** 2))) || 1;
  });
  const weights = new Float64Array(features.length);
  const learningRate = 0.04;
  const regularization = 0.0005;

  for (let epoch = 0; epoch < 45; epoch += 1) {
    const gradient = new Float64Array(features.length);
    for (const event of rows) {
      let linear = 0;
      for (let index = 0; index < features.length; index += 1) {
        const value = index === 0 ? 1 : (features[index].value(event) - means[index]) / deviations[index];
        linear += weights[index] * value;
      }
      const error = sigmoid(linear) - event.outcomes[horizon];
      for (let index = 0; index < features.length; index += 1) {
        const value = index === 0 ? 1 : (features[index].value(event) - means[index]) / deviations[index];
        gradient[index] += error * value;
      }
    }
    for (let index = 0; index < features.length; index += 1) {
      weights[index] -= learningRate * (gradient[index] / rows.length + regularization * weights[index]);
    }
  }
  return { features, means, deviations, weights };
}

function predict(model: FittedModel, event: Event) {
  let linear = 0;
  for (let index = 0; index < model.features.length; index += 1) {
    const value =
      index === 0
        ? 1
        : (model.features[index].value(event) - model.means[index]) / model.deviations[index];
    linear += model.weights[index] * value;
  }
  return sigmoid(linear);
}

function auc(predictions: Prediction[]) {
  const ordered = [...predictions].sort((left, right) => left.score - right.score);
  let positiveCount = 0;
  let positiveRankSum = 0;
  let rank = 1;
  for (let index = 0; index < ordered.length; ) {
    let end = index + 1;
    while (end < ordered.length && ordered[end].score === ordered[index].score) end += 1;
    const averageRank = (rank + rank + (end - index) - 1) / 2;
    for (let current = index; current < end; current += 1) {
      if (ordered[current].outcome === 1) {
        positiveCount += 1;
        positiveRankSum += averageRank;
      }
    }
    rank += end - index;
    index = end;
  }
  const negativeCount = ordered.length - positiveCount;
  return positiveCount === 0 || negativeCount === 0
    ? 0.5
    : (positiveRankSum - (positiveCount * (positiveCount + 1)) / 2) /
        (positiveCount * negativeCount);
}

function metrics(predictions: Prediction[]) {
  const outcomes = predictions.map((prediction) => prediction.outcome);
  const baseRate = mean(outcomes);
  const logLoss = mean(
    predictions.map((prediction) => {
      const score = Math.min(1 - 1e-9, Math.max(1e-9, prediction.score));
      return -(prediction.outcome * Math.log(score) + (1 - prediction.outcome) * Math.log(1 - score));
    })
  );
  const brier = mean(predictions.map((prediction) => (prediction.score - prediction.outcome) ** 2));
  const ordered = [...predictions].sort((left, right) => right.score - left.score);
  const take = Math.max(1, Math.floor(ordered.length * 0.5));
  const captured = ordered.slice(0, take).reduce((sum, prediction) => sum + prediction.outcome, 0);
  return {
    n: predictions.length,
    events: outcomes.reduce<number>((sum, outcome) => sum + outcome, 0),
    baseRate,
    auc: auc(predictions),
    logLoss,
    brier,
    captureAt50:
      captured /
      Math.max(1, outcomes.reduce<number>((sum, outcome) => sum + outcome, 0)),
  };
}

function lcg(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = Math.imul(1_664_525, state) + 1_013_904_223;
    return (state >>> 0) / 2 ** 32;
  };
}

function bootstrapLogLossDifference(base: Prediction[], candidate: Prediction[]) {
  const byProduct = new Map<string, Array<{ base: Prediction; candidate: Prediction }>>();
  for (let index = 0; index < base.length; index += 1) {
    const rows = byProduct.get(base[index].productId) ?? [];
    rows.push({ base: base[index], candidate: candidate[index] });
    byProduct.set(base[index].productId, rows);
  }
  const groups = [...byProduct.values()];
  const random = lcg(42);
  const differences: number[] = [];
  for (let replicate = 0; replicate < BOOTSTRAP_REPLICATES; replicate += 1) {
    let total = 0;
    let count = 0;
    for (let draw = 0; draw < groups.length; draw += 1) {
      const group = groups[Math.floor(random() * groups.length)];
      for (const row of group) {
        const baseScore = Math.min(1 - 1e-9, Math.max(1e-9, row.base.score));
        const candidateScore = Math.min(1 - 1e-9, Math.max(1e-9, row.candidate.score));
        const baseLoss = -(row.base.outcome * Math.log(baseScore) + (1 - row.base.outcome) * Math.log(1 - baseScore));
        const candidateLoss = -(row.candidate.outcome * Math.log(candidateScore) + (1 - row.candidate.outcome) * Math.log(1 - candidateScore));
        total += candidateLoss - baseLoss;
        count += 1;
      }
    }
    differences.push(total / Math.max(1, count));
  }
  return { lower: quantile(differences, 0.025), upper: quantile(differences, 0.975) };
}

function buildEvents(history: HistoryRow[]) {
  const rowsByProduct = new Map<string, HistoryRow[]>();
  for (const row of history) {
    const rows = rowsByProduct.get(row.productId) ?? [];
    rows.push(row);
    rowsByProduct.set(row.productId, rows);
  }

  const events: Event[] = [];
  for (const [productId, rows] of rowsByProduct) {
    const comparisons: Comparison[] = [];
    let lastObservedChangeAt: Date | null = null;
    for (let index = 1; index < rows.length; index += 1) {
      const previous = rows[index - 1];
      const current = rows[index];
      const gap = current.date.getTime() - previous.date.getTime();
      if (gap > 2 * DAY_MS || previous.price <= 0 || current.price <= 0) continue;
      const changed = previous.price !== current.price || current.updateCount > 1;
      const windowStart = current.date.getTime() - 30 * DAY_MS;
      const previousWindow = comparisons.filter((comparison) => comparison.date.getTime() >= windowStart);
      const changeRate30d =
        previousWindow.length === 0
          ? 0
          : previousWindow.filter((comparison) => comparison.changed).length / previousWindow.length;

      // Sem preço anterior diferente não há magnitude observável. Não fazemos a
      // suposição incorreta de que uma mudança intradiária terminou em 0%.
      if (previous.price !== current.price) {
        const magnitude = Math.abs(current.price - previous.price) / previous.price;
        const outcomes: Partial<Record<number, 0 | 1>> = {};
        for (const horizon of HORIZONS) {
          let coveredUntil = current.date.getTime();
          let foundChange = false;
          let continuous = true;
          for (let futureIndex = index + 1; futureIndex < rows.length; futureIndex += 1) {
            const futurePrevious = rows[futureIndex - 1];
            const future = rows[futureIndex];
            const futureGap = future.date.getTime() - futurePrevious.date.getTime();
            if (futureGap > 2 * DAY_MS || future.price <= 0 || futurePrevious.price <= 0) {
              continuous = false;
              break;
            }
            const elapsed = future.date.getTime() - current.date.getTime();
            if (elapsed > horizon * DAY_MS) break;
            coveredUntil = future.date.getTime();
            if (future.price !== futurePrevious.price || future.updateCount > 1) foundChange = true;
          }
          if (continuous && coveredUntil >= current.date.getTime() + horizon * DAY_MS) {
            outcomes[horizon] = foundChange ? 1 : 0;
          }
        }
        if (EVALUATION_HORIZONS.some((horizon) => outcomes[horizon] !== undefined)) {
          events.push({
            productId,
            date: current.date,
            magnitude,
            direction: current.price > previous.price ? "up" : "down",
            changeRate30d,
            daysSincePreviousChange: lastObservedChangeAt
              ? Math.min(90, Math.max(0, (current.date.getTime() - lastObservedChangeAt.getTime()) / DAY_MS))
              : 90,
            outcomes: outcomes as Record<number, 0 | 1>,
          });
        }
      }
      comparisons.push({ date: current.date, changed });
      if (changed) lastObservedChangeAt = current.date;
    }
  }
  return events;
}

function printEffectPersistence(events: Event[]) {
  const magnitudes = events.map((event) => event.magnitude);
  const q25 = quantile(magnitudes, 0.25);
  const q75 = quantile(magnitudes, 0.75);
  const groups: Array<{ name: string; filter: (event: Event) => boolean }> = [
    { name: `pequenas (<=${(q25 * 100).toFixed(1)}%)`, filter: (event) => event.magnitude <= q25 },
    { name: `grandes (>=${(q75 * 100).toFixed(1)}%)`, filter: (event) => event.magnitude >= q75 },
    { name: "grandes quedas", filter: (event) => event.direction === "down" && event.magnitude >= q75 },
    { name: "grandes altas", filter: (event) => event.direction === "up" && event.magnitude >= q75 },
  ];
  console.log("\nProbabilidade observada de nova mudança após a última alteração (amostra completa):");
  for (const group of groups) {
    const subset = events.filter(group.filter);
    const cells = HORIZONS.map((horizon) => {
      const covered = subset.filter((event) => event.outcomes[horizon] !== undefined);
      const rate = mean(covered.map((event) => event.outcomes[horizon]));
      return `${horizon}d=${formatPercent(rate)} (n=${covered.length.toLocaleString("pt-BR")})`;
    });
    console.log(`- ${group.name}: ${cells.join(" | ")}`);
  }
}

function crossValidate(events: Event[], horizon: number, variant: "current" | "magnitude" | "direction" | "both") {
  const dates = [...new Set(events.map((event) => dayKey(event.date)))].sort();
  const predictions: Prediction[] = [];
  for (const startShare of FOLD_START_SHARES) {
    const startIndex = Math.floor(dates.length * startShare);
    const endIndex = Math.min(dates.length, startIndex + Math.max(1, Math.floor(dates.length * 0.1)));
    const trainEnd = dates[startIndex];
    const testEnd = dates[endIndex] ?? "9999-12-31";
    const train = events.filter((event) => dayKey(event.date) < trainEnd && event.outcomes[horizon] !== undefined);
    const test = events.filter(
      (event) =>
        dayKey(event.date) >= trainEnd &&
        dayKey(event.date) < testEnd &&
        event.outcomes[horizon] !== undefined
    );
    if (train.length < 100 || test.length < 30) continue;
    const model = fitLogistic(train, horizon, buildFeatures(variant));
    for (const event of test) {
      predictions.push({ productId: event.productId, outcome: event.outcomes[horizon], score: predict(model, event) });
    }
  }
  return predictions;
}

async function main() {
  const history = await prisma.$queryRaw<HistoryRow[]>`
    SELECT "productId", "price", "updateCount", "date"
    FROM "DynamicPriceHistory"
    ORDER BY "productId", "date"
  `;
  const events = buildEvents(history);
  console.log(`Magnitude da última alteração — ${new Date().toISOString()}`);
  console.log(`Histórico: ${history.length.toLocaleString("pt-BR")} snapshots; ${events.length.toLocaleString("pt-BR")} alterações com magnitude observável.`);
  printEffectPersistence(events);

  console.log("\nValidação temporal fora da amostra (três blocos posteriores; bootstrap por produto, IC 95%):");
  for (const horizon of EVALUATION_HORIZONS) {
    const base = crossValidate(events, horizon, "current");
    const variants = ["magnitude", "direction", "both"] as const;
    const baseMetrics = metrics(base);
    console.log(`\nHorizonte ${horizon * 24}h — n=${baseMetrics.n.toLocaleString("pt-BR")}, mudanças=${baseMetrics.events.toLocaleString("pt-BR")}, taxa-base=${formatPercent(baseMetrics.baseRate)}`);
    console.log(`- atual: AUC=${baseMetrics.auc.toFixed(4)}, log-loss=${baseMetrics.logLoss.toFixed(5)}, Brier=${baseMetrics.brier.toFixed(5)}, captura@50%=${formatPercent(baseMetrics.captureAt50)}`);
    for (const variant of variants) {
      const candidate = crossValidate(events, horizon, variant);
      if (candidate.length !== base.length) throw new Error(`fold_alignment_failed:${variant}:${horizon}`);
      const candidateMetrics = metrics(candidate);
      const confidence = bootstrapLogLossDifference(base, candidate);
      const deltaLoss = candidateMetrics.logLoss - baseMetrics.logLoss;
      console.log(`- atual + ${variant}: AUC=${candidateMetrics.auc.toFixed(4)} (Δ${(candidateMetrics.auc - baseMetrics.auc).toFixed(4)}), log-loss=${candidateMetrics.logLoss.toFixed(5)} (Δ${deltaLoss.toFixed(5)}, IC95% ${confidence.lower.toFixed(5)}..${confidence.upper.toFixed(5)}), captura@50%=${formatPercent(candidateMetrics.captureAt50)}`);
    }
  }
  console.log("\nCritério de refutação: uma variável só é candidata se reduzir log-loss fora da amostra com IC95% totalmente abaixo de zero e melhorar AUC/captura de forma material; significância isolada não basta.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
