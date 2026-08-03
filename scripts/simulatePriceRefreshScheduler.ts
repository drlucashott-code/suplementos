import "dotenv/config";
import { prisma } from "../src/lib/prisma";

type HistoryRow = {
  productId: string;
  price: number;
  date: Date;
};

type ClickRow = { productId: string; createdAt: Date };

type PriceRow = HistoryRow & {
  day: number;
  changedFromPrevious: boolean;
};

type SchedulerState = {
  lastPrice: number | null;
  lastCheckedDay: number | null;
  lastChangeDay: number | null;
  observations: Array<{ day: number; changed: boolean }>;
  pendingChangeDay: number | null;
};

type SimulationMetrics = {
  name: string;
  queries: number;
  detections: number;
  underlyingChanges: number;
  meanDelayDays: number | null;
  detectionRate: number;
  changesPerQuery: number;
  relativeEfficiency: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const HISTORY_DAYS = 135;
const TRAIN_DAYS = 90;
const MAX_ADAPTIVE_AGE_DAYS = 3;

function dayKey(value: Date) {
  return value.toISOString().slice(0, 10);
}

function dayNumber(value: Date) {
  return Math.floor(value.getTime() / DAY_MS);
}

function hash(text: string) {
  let value = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    value = Math.imul(value ^ text.charCodeAt(index), 16777619);
  }
  return value >>> 0;
}

function mean(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);
}

function quantile(values: number[], percentile: number) {
  const sorted = [...values].sort((a, b) => a - b);
  if (sorted.length === 0) return 0;
  const position = (sorted.length - 1) * percentile;
  const low = Math.floor(position);
  const high = Math.ceil(position);
  return sorted[low] + (sorted[high] - sorted[low]) * (position - low);
}

function formatPercent(value: number) {
  return `${(value * 100).toFixed(2)}%`;
}

function cloneState(state: SchedulerState): SchedulerState {
  return {
    lastPrice: state.lastPrice,
    lastCheckedDay: state.lastCheckedDay,
    lastChangeDay: state.lastChangeDay,
    observations: [...state.observations],
    pendingChangeDay: null,
  };
}

function rateAndRecency(state: SchedulerState, currentDay: number, windowDays = 30) {
  const since = currentDay - windowDays;
  let changes = 0;
  let observations = 0;
  for (let index = state.observations.length - 1; index >= 0; index -= 1) {
    const item = state.observations[index];
    if (item.day < since) break;
    observations += 1;
    if (item.changed) changes += 1;
  }
  return {
    rate: observations === 0 ? 0 : changes / observations,
    recency: state.lastChangeDay === null ? 90 : Math.min(90, currentDay - state.lastChangeDay),
  };
}

function rateBucket(rate: number) {
  if (rate === 0) return "0";
  if (rate <= 0.05) return "0-5";
  if (rate <= 0.15) return "5-15";
  if (rate <= 0.35) return "15-35";
  return "35+";
}

function recencyBucket(days: number) {
  if (days <= 1) return "0-1";
  if (days <= 3) return "2-3";
  if (days <= 7) return "4-7";
  if (days <= 14) return "8-14";
  if (days <= 30) return "15-30";
  return "31+";
}

function auc(labels: number[], scores: number[]) {
  const rows = labels.map((label, index) => ({ label, score: scores[index] })).sort((a, b) => a.score - b.score);
  let positives = 0;
  let rankSum = 0;
  let rank = 1;
  for (let index = 0; index < rows.length; ) {
    let end = index + 1;
    while (end < rows.length && rows[end].score === rows[index].score) end += 1;
    const averageRank = (rank + rank + (end - index) - 1) / 2;
    for (let cursor = index; cursor < end; cursor += 1) {
      if (rows[cursor].label === 1) {
        positives += 1;
        rankSum += averageRank;
      }
    }
    rank += end - index;
    index = end;
  }
  const negatives = labels.length - positives;
  return positives === 0 || negatives === 0
    ? 0.5
    : (rankSum - (positives * (positives + 1)) / 2) / (positives * negatives);
}

function makeRiskTable(rowsByProduct: Map<string, PriceRow[]>, testStartDay: number) {
  const counts = new Map<string, { changed: number; total: number }>();
  let baseChanged = 0;
  let baseTotal = 0;
  for (const rows of rowsByProduct.values()) {
    const state: SchedulerState = {
      lastPrice: null,
      lastCheckedDay: null,
      lastChangeDay: null,
      observations: [],
      pendingChangeDay: null,
    };
    for (const row of rows) {
      if (row.day >= testStartDay) break;
      if (state.lastPrice !== null && row.changedFromPrevious) {
        const { rate, recency } = rateAndRecency(state, row.day);
        const key = `${rateBucket(rate)}:${recencyBucket(recency)}`;
        const aggregate = counts.get(key) ?? { changed: 0, total: 0 };
        aggregate.total += 1;
        aggregate.changed += 1;
        counts.set(key, aggregate);
        baseTotal += 1;
        baseChanged += 1;
      } else if (state.lastPrice !== null) {
        const { rate, recency } = rateAndRecency(state, row.day);
        const key = `${rateBucket(rate)}:${recencyBucket(recency)}`;
        const aggregate = counts.get(key) ?? { changed: 0, total: 0 };
        aggregate.total += 1;
        counts.set(key, aggregate);
        baseTotal += 1;
      }
      if (state.lastPrice !== null) {
        state.observations.push({ day: row.day, changed: row.changedFromPrevious });
        if (row.changedFromPrevious) state.lastChangeDay = row.day;
      }
      state.lastPrice = row.price;
      state.lastCheckedDay = row.day;
    }
  }
  const baseRate = baseChanged / Math.max(1, baseTotal);
  return {
    score(rate: number, recency: number) {
      const item = counts.get(`${rateBucket(rate)}:${recencyBucket(recency)}`);
      // Empirical-Bayes smoothing prevents a rare rate/recency cell from winning by chance.
      return item ? (item.changed + 12 * baseRate) / (item.total + 12) : baseRate;
    },
  };
}

function initialStates(rowsByProduct: Map<string, PriceRow[]>, testStartDay: number) {
  const result = new Map<string, SchedulerState>();
  for (const [productId, rows] of rowsByProduct) {
    const state: SchedulerState = {
      lastPrice: null,
      lastCheckedDay: null,
      lastChangeDay: null,
      observations: [],
      pendingChangeDay: null,
    };
    for (const row of rows) {
      if (row.day >= testStartDay) break;
      if (state.lastPrice !== null) {
        state.observations.push({ day: row.day, changed: row.changedFromPrevious });
        if (row.changedFromPrevious) state.lastChangeDay = row.day;
      }
      state.lastPrice = row.price;
      state.lastCheckedDay = row.day;
    }
    result.set(productId, state);
  }
  return result;
}

type Policy =
  | { kind: "fixed"; intervalDays: number; name: string }
  | { kind: "recency" | "frequency" | "risk" | "riskUrgent"; budgetShare: number; name: string };

function simulatePolicy(params: {
  policy: Policy;
  rowsByDay: Map<number, PriceRow[]>;
  warmStates: Map<string, SchedulerState>;
  risk: ReturnType<typeof makeRiskTable>;
  clicksByDay: Map<number, Set<string>>;
  totalUnderlyingChanges: number;
}) {
  const states = new Map<string, SchedulerState>();
  for (const [productId, state] of params.warmStates) states.set(productId, cloneState(state));
  let queries = 0;
  let detections = 0;
  let totalDelay = 0;
  const days = [...params.rowsByDay.keys()].sort((a, b) => a - b);

  for (let dayIndex = 0; dayIndex < days.length; dayIndex += 1) {
    const day = days[dayIndex];
    const rows = params.rowsByDay.get(day) ?? [];
    const selected = new Set<string>();
    if (params.policy.kind === "fixed") {
      for (const row of rows) {
        const state = states.get(row.productId);
        if (state?.lastPrice === null || hash(row.productId) % params.policy.intervalDays === dayIndex % params.policy.intervalDays) {
          selected.add(row.productId);
        }
      }
    } else {
      const budget = Math.ceil(rows.length * params.policy.budgetShare);
      const urgent = params.policy.kind === "riskUrgent" ? params.clicksByDay.get(day) ?? new Set<string>() : new Set<string>();
      const candidates = rows.map((row) => {
        const state = states.get(row.productId) ?? {
          lastPrice: null,
          lastCheckedDay: null,
          lastChangeDay: null,
          observations: [],
          pendingChangeDay: null,
        };
        const { rate, recency } = rateAndRecency(state, day);
        const score =
          params.policy.kind === "recency"
            ? -recency
            : params.policy.kind === "frequency"
              ? rate
              : params.risk.score(rate, recency);
        const age = state.lastCheckedDay === null ? Number.POSITIVE_INFINITY : day - state.lastCheckedDay;
        return { row, state, score, age, urgent: urgent.has(row.productId) };
      });
      // Bootstrap, urgent events, and the 72h anti-starvation guard are constraints,
      // not part of the statistical risk score.
      for (const candidate of candidates) {
        if (candidate.state.lastPrice === null || candidate.urgent || candidate.age >= MAX_ADAPTIVE_AGE_DAYS) {
          selected.add(candidate.row.productId);
        }
      }
      const ranked = candidates
        .filter((candidate) => !selected.has(candidate.row.productId))
        .sort((left, right) => right.score - left.score || hash(left.row.productId) - hash(right.row.productId));
      const targetCount = Math.max(budget, selected.size);
      for (const candidate of ranked) {
        if (selected.size >= targetCount) break;
        selected.add(candidate.row.productId);
      }
    }

    for (const row of rows) {
      const state = states.get(row.productId) ?? {
        lastPrice: null,
        lastCheckedDay: null,
        lastChangeDay: null,
        observations: [],
        pendingChangeDay: null,
      };
      if (row.changedFromPrevious && state.pendingChangeDay === null) state.pendingChangeDay = day;
      if (!selected.has(row.productId)) {
        states.set(row.productId, state);
        continue;
      }
      queries += 1;
      // Only count a detection when a daily price transition is actually
      // observable in the source series. A gap in the source history can
      // change price, but it cannot be used as ground truth for this test.
      const detected =
        state.lastPrice !== null &&
        state.lastPrice !== row.price &&
        state.pendingChangeDay !== null;
      if (detected) {
        detections += 1;
        totalDelay += Math.max(0, day - (state.pendingChangeDay ?? day));
      }
      // A query that sees the old price again cannot recover an intervening price.
      state.pendingChangeDay = null;
      state.observations.push({ day, changed: detected });
      if (detected) state.lastChangeDay = day;
      state.lastPrice = row.price;
      state.lastCheckedDay = day;
      states.set(row.productId, state);
    }
  }
  return { queries, detections, meanDelayDays: detections === 0 ? null : totalDelay / detections };
}

function fixedIntervalProductEfficiency(rows: PriceRow[], testStartDay: number, intervalDays: number) {
  const test = rows.filter((row) => row.day >= testStartDay);
  const before = [...rows].reverse().find((row) => row.day < testStartDay);
  if (!before || test.length < 7) return null;
  let best = { yield: -1, detections: 0, queries: 0 };
  for (let phase = 0; phase < intervalDays; phase += 1) {
    let price = before.price;
    let queries = 0;
    let detections = 0;
    for (const row of test) {
      if ((row.day - testStartDay) % intervalDays !== phase) continue;
      queries += 1;
      if (row.price !== price) detections += 1;
      price = row.price;
    }
    const yieldValue = detections / Math.max(1, queries);
    if (yieldValue > best.yield || (yieldValue === best.yield && intervalDays > 1)) {
      best = { yield: yieldValue, detections, queries };
    }
  }
  return best;
}

function aucForFrequencyWindow(rowsByProduct: Map<string, PriceRow[]>, testStartDay: number, windowDays: number) {
  const labels: number[] = [];
  const scores: number[] = [];
  for (const rows of rowsByProduct.values()) {
    const past: Array<{ day: number; changed: boolean }> = [];
    for (const row of rows) {
      while (past.length > 0 && past[0].day < row.day - windowDays) past.shift();
      if (row.day >= testStartDay && row.changedFromPrevious && past.length > 0) {
        labels.push(row.changedFromPrevious ? 1 : 0);
        scores.push(past.filter((item) => item.changed).length / past.length);
      } else if (row.day >= testStartDay && past.length > 0) {
        labels.push(0);
        scores.push(past.filter((item) => item.changed).length / past.length);
      }
      past.push({ day: row.day, changed: row.changedFromPrevious });
    }
  }
  return auc(labels, scores);
}

function productProfile(rows: PriceRow[], startDay: number, endDay: number) {
  const subset = rows.filter((row) => row.day >= startDay && row.day < endDay);
  if (subset.length < 20) return null;
  return subset.filter((row) => row.changedFromPrevious).length / subset.length;
}

function pearson(left: number[], right: number[]) {
  const leftMean = mean(left);
  const rightMean = mean(right);
  const numerator = left.reduce((sum, value, index) => sum + (value - leftMean) * (right[index] - rightMean), 0);
  const denominator = Math.sqrt(
    left.reduce((sum, value) => sum + (value - leftMean) ** 2, 0) *
      right.reduce((sum, value) => sum + (value - rightMean) ** 2, 0)
  );
  return denominator === 0 ? 0 : numerator / denominator;
}

type ClusterFeature = { productId: string; rate: number; averageGap: number; magnitude: number };

function distance(left: number[], right: number[]) {
  return Math.sqrt(left.reduce((sum, value, index) => sum + (value - right[index]) ** 2, 0));
}

function kMeans(features: number[][], clusters: number) {
  const centroids = Array.from({ length: clusters }, (_, index) => [...features[Math.floor((index * features.length) / clusters)]]);
  const labels = new Int16Array(features.length);
  for (let iteration = 0; iteration < 40; iteration += 1) {
    let changed = false;
    for (let row = 0; row < features.length; row += 1) {
      let best = 0;
      let bestDistance = Number.POSITIVE_INFINITY;
      for (let cluster = 0; cluster < clusters; cluster += 1) {
        const currentDistance = distance(features[row], centroids[cluster]);
        if (currentDistance < bestDistance) {
          best = cluster;
          bestDistance = currentDistance;
        }
      }
      if (labels[row] !== best) changed = true;
      labels[row] = best;
    }
    const sums = Array.from({ length: clusters }, () => new Array(features[0].length).fill(0));
    const counts = new Array(clusters).fill(0);
    for (let row = 0; row < features.length; row += 1) {
      counts[labels[row]] += 1;
      for (let column = 0; column < features[row].length; column += 1) sums[labels[row]][column] += features[row][column];
    }
    for (let cluster = 0; cluster < clusters; cluster += 1) {
      if (counts[cluster] === 0) continue;
      centroids[cluster] = sums[cluster].map((value) => value / counts[cluster]);
    }
    if (!changed) break;
  }
  return { labels, centroids };
}

function approximateSilhouette(features: number[][], labels: Int16Array, clusters: number) {
  const sample = features.length <= 500 ? features.map((_, index) => index) : features
    .map((_, index) => index)
    .sort((left, right) => hash(String(left)) - hash(String(right)))
    .slice(0, 500);
  const values: number[] = [];
  for (const index of sample) {
    const own = labels[index];
    const perCluster = Array.from({ length: clusters }, () => ({ sum: 0, count: 0 }));
    for (let other = 0; other < features.length; other += 1) {
      if (other === index) continue;
      const cluster = labels[other];
      perCluster[cluster].sum += distance(features[index], features[other]);
      perCluster[cluster].count += 1;
    }
    const a = perCluster[own].sum / Math.max(1, perCluster[own].count);
    let b = Number.POSITIVE_INFINITY;
    for (let cluster = 0; cluster < clusters; cluster += 1) {
      if (cluster === own || perCluster[cluster].count === 0) continue;
      b = Math.min(b, perCluster[cluster].sum / perCluster[cluster].count);
    }
    values.push(Number.isFinite(b) ? (b - a) / Math.max(a, b, 1e-9) : -1);
  }
  return mean(values);
}

async function main() {
  const history = await prisma.$queryRaw<HistoryRow[]>`
    WITH bounds AS (
      SELECT max("date") AS max_date FROM "DynamicPriceHistory"
    )
    SELECT h."productId", h."price", h."date"
    FROM "DynamicPriceHistory" h, bounds
    WHERE h."date" >= bounds.max_date - ${HISTORY_DAYS} * INTERVAL '1 day'
      AND h."date" < bounds.max_date
    ORDER BY h."productId", h."date"
  `;
  const clicks = await prisma.$queryRaw<ClickRow[]>`
    SELECT "productId", "createdAt" FROM "DynamicProductClickEvent"
    WHERE "createdAt" >= NOW() - ${HISTORY_DAYS} * INTERVAL '1 day'
  `;
  const maxDay = history.reduce((latest, row) => Math.max(latest, dayNumber(row.date)), Number.NEGATIVE_INFINITY);
  const testStartDay = maxDay - 44;
  const trainingStartDay = testStartDay - TRAIN_DAYS;
  const rowsByProduct = new Map<string, PriceRow[]>();
  const rowsByDay = new Map<number, PriceRow[]>();
  for (const row of history) {
    const day = dayNumber(row.date);
    const productRows = rowsByProduct.get(row.productId) ?? [];
    const previous = productRows.at(-1);
    const changedFromPrevious = Boolean(previous && day - previous.day <= 2 && previous.price !== row.price);
    const item = { ...row, day, changedFromPrevious };
    productRows.push(item);
    rowsByProduct.set(row.productId, productRows);
    if (day >= testStartDay) {
      const dailyRows = rowsByDay.get(day) ?? [];
      dailyRows.push(item);
      rowsByDay.set(day, dailyRows);
    }
  }
  const clicksByDay = new Map<number, Set<string>>();
  for (const click of clicks) {
    const day = dayNumber(click.createdAt);
    if (day < testStartDay) continue;
    const set = clicksByDay.get(day) ?? new Set<string>();
    set.add(click.productId);
    clicksByDay.set(day, set);
  }
  const totalUnderlyingChanges = [...rowsByDay.values()].flat().filter((row) => row.changedFromPrevious).length;
  const risk = makeRiskTable(rowsByProduct, testStartDay);
  const warmStates = initialStates(rowsByProduct, testStartDay);
  const policies: Policy[] = [
    { kind: "fixed", intervalDays: 1, name: "A) Fixo 24h" },
    { kind: "fixed", intervalDays: 2, name: "B) Fixo 48h" },
    { kind: "recency", budgetShare: 0.5, name: "C) Apenas dias desde mudanca" },
    { kind: "frequency", budgetShare: 0.5, name: "D) Apenas frequencia 30d" },
    { kind: "risk", budgetShare: 0.5, name: "E) Risco (frequencia + recencia)" },
    { kind: "riskUrgent", budgetShare: 0.5, name: "F) Risco + fila urgente de cliques" },
  ];
  const metrics = policies.map((policy) => {
    const result = simulatePolicy({ policy, rowsByDay, warmStates, risk, clicksByDay, totalUnderlyingChanges });
    return {
      name: policy.name,
      ...result,
      underlyingChanges: totalUnderlyingChanges,
      detectionRate: result.detections / Math.max(1, totalUnderlyingChanges),
      changesPerQuery: result.detections / Math.max(1, result.queries),
      relativeEfficiency: 0,
    };
  });
  const baselineEfficiency = metrics[0].changesPerQuery;
  for (const metric of metrics) metric.relativeEfficiency = metric.changesPerQuery / Math.max(1e-9, baselineEfficiency);

  const intervals = [1, 2, 3];
  const intervalDistribution = new Map<number, number>();
  for (const rows of rowsByProduct.values()) {
    const choices = intervals
      .map((intervalDays) => ({ intervalDays, result: fixedIntervalProductEfficiency(rows, testStartDay, intervalDays) }))
      .filter((item): item is { intervalDays: number; result: NonNullable<typeof item.result> } => item.result !== null);
    if (choices.length === 0) continue;
    choices.sort((left, right) => right.result.yield - left.result.yield || right.intervalDays - left.intervalDays);
    intervalDistribution.set(choices[0].intervalDays, (intervalDistribution.get(choices[0].intervalDays) ?? 0) + 1);
  }

  const windows = [7, 14, 21, 30, 45, 60, 90].map((windowDays) => ({ windowDays, auc: aucForFrequencyWindow(rowsByProduct, testStartDay, windowDays) }));

  const midpoint = testStartDay - 45;
  const early: number[] = [];
  const late: number[] = [];
  for (const rows of rowsByProduct.values()) {
    const firstRate = productProfile(rows, trainingStartDay, midpoint);
    const secondRate = productProfile(rows, midpoint, testStartDay);
    if (firstRate !== null && secondRate !== null) {
      early.push(firstRate);
      late.push(secondRate);
    }
  }
  const lower = quantile([...early, ...late], 1 / 3);
  const upper = quantile([...early, ...late], 2 / 3);
  const profileTransitions = new Map<string, number>();
  const classify = (value: number) => (value <= lower ? "estavel" : value >= upper ? "volatil" : "intermediario");
  for (let index = 0; index < early.length; index += 1) {
    const key = `${classify(early[index])}->${classify(late[index])}`;
    profileTransitions.set(key, (profileTransitions.get(key) ?? 0) + 1);
  }

  const clusterRows: ClusterFeature[] = [];
  for (const [productId, rows] of rowsByProduct) {
    const train = rows.filter((row) => row.day >= trainingStartDay && row.day < testStartDay);
    if (train.length < 25) continue;
    const changed = train.filter((row) => row.changedFromPrevious);
    const changeDays = changed.map((row) => row.day);
    const gaps = changeDays.slice(1).map((day, index) => day - changeDays[index]);
    const magnitudes = changed
      .map((row) => {
        const rowIndex = rows.findIndex((candidate) => candidate.day === row.day);
        const previous = rowIndex > 0 ? rows[rowIndex - 1] : null;
        return previous && previous.price > 0 && row.price > 0
          ? Math.abs(Math.log(row.price / previous.price))
          : null;
      })
      .filter((value): value is number => value !== null && Number.isFinite(value));
    const magnitude = magnitudes.length === 0 ? 0 : mean(magnitudes);
    clusterRows.push({
      productId,
      rate: changed.length / train.length,
      averageGap: gaps.length === 0 ? 90 : mean(gaps),
      magnitude,
    });
  }
  const rawMatrix = clusterRows.map((row) => [row.rate, Math.log1p(row.averageGap), row.magnitude]);
  const columnMeans = rawMatrix[0].map((_, column) => mean(rawMatrix.map((row) => row[column])));
  const columnDeviations = rawMatrix[0].map((_, column) => Math.sqrt(mean(rawMatrix.map((row) => (row[column] - columnMeans[column]) ** 2))) || 1);
  const normalized = rawMatrix.map((row) => row.map((value, column) => (value - columnMeans[column]) / columnDeviations[column]));
  const clusterCandidates = [2, 3, 4, 5].map((count) => {
    const model = kMeans(normalized, count);
    const nonEmptyClusters = new Set(model.labels).size;
    return {
      count,
      ...model,
      silhouette: nonEmptyClusters === count ? approximateSilhouette(normalized, model.labels, count) : -1,
    };
  });
  const selectedClusters = [...clusterCandidates].sort((left, right) => right.silhouette - left.silhouette)[0];
  const clusterSummary = Array.from({ length: selectedClusters.count }, (_, cluster) => {
    const members = clusterRows.filter((_, index) => selectedClusters.labels[index] === cluster);
    return {
      members: members.length,
      rate: mean(members.map((row) => row.rate)),
      averageGap: mean(members.map((row) => row.averageGap)),
      magnitude: mean(members.map((row) => row.magnitude)),
    };
  }).sort((left, right) => right.rate - left.rate);

  const saturation = [0.1, 0.2, 0.4, 0.6, 0.8, 1].map((budgetShare) => {
    const result = simulatePolicy({
      policy: { kind: "risk", budgetShare, name: `Risco ${(budgetShare * 100).toFixed(0)}%` },
      rowsByDay,
      warmStates,
      risk,
      clicksByDay,
      totalUnderlyingChanges,
    });
    return { budgetShare, ...result, changesPerQuery: result.detections / Math.max(1, result.queries) };
  });

  console.log(`\nSimulacao adicional do scheduler — ${new Date().toISOString()}`);
  console.log(`Serie minima nova: ${history.length.toLocaleString("pt-BR")} snapshots (preco/data apenas), ${clicks.length.toLocaleString("pt-BR")} cliques. Periodo de teste: ${dayKey(new Date(testStartDay * DAY_MS))} a ${dayKey(new Date(maxDay * DAY_MS))}.`);
  console.log(`Mudancas diarias observaveis no teste: ${totalUnderlyingChanges.toLocaleString("pt-BR")}.`);
  console.log("\nPoliticas no mesmo horizonte; C-F usam metade da capacidade diaria e teto de 72h:");
  for (const metric of metrics) {
    console.log(`- ${metric.name}: consultas=${metric.queries.toLocaleString("pt-BR")}, deteccoes=${metric.detections.toLocaleString("pt-BR")} (${formatPercent(metric.detectionRate)}), atraso medio=${metric.meanDelayDays === null ? "-" : `${metric.meanDelayDays.toFixed(2)}d`}, consultas/deteccao=${(metric.queries / Math.max(1, metric.detections)).toFixed(2)}, eficiencia=${metric.relativeEfficiency.toFixed(2)}x`);
  }
  console.log("\nIntervalo individual que maximiza somente deteccoes por consulta (nao inclui custo de atraso):");
  for (const interval of intervals) console.log(`- ${interval * 24}h: ${(intervalDistribution.get(interval) ?? 0).toLocaleString("pt-BR")} produtos`);
  console.log("\nJanela de frequencia — AUC no periodo futuro:");
  for (const item of windows) console.log(`- ${item.windowDays}d: ${item.auc.toFixed(3)}`);
  console.log(`\nMudanca de perfil em duas janelas consecutivas de 45d: correlacao de taxa=${pearson(early, late).toFixed(3)}; limites empiricos estavel<=${formatPercent(lower)}, volatil>=${formatPercent(upper)}.`);
  for (const [transition, count] of [...profileTransitions.entries()].sort()) console.log(`- ${transition}: ${count.toLocaleString("pt-BR")}`);
  console.log(`\nClusterizacao sem marca/categoria: k=${selectedClusters.count} (silhouette aproximado ${selectedClusters.silhouette.toFixed(3)}).`);
  for (const [index, cluster] of clusterSummary.entries()) console.log(`- Grupo ${index + 1}: ${cluster.members.toLocaleString("pt-BR")} produtos, taxa=${formatPercent(cluster.rate)}, intervalo medio=${cluster.averageGap.toFixed(1)}d, magnitude media=${formatPercent(cluster.magnitude)}`);
  console.log("\nCurva de saturacao do risco (teto de 72h preservado):");
  for (const item of saturation) console.log(`- ${(item.budgetShare * 100).toFixed(0)}%: ${item.queries.toLocaleString("pt-BR")} consultas, ${item.detections.toLocaleString("pt-BR")} deteccoes, ${formatPercent(item.detections / Math.max(1, totalUnderlyingChanges))}, ${item.changesPerQuery.toFixed(4)} deteccoes/consulta`);
  console.log("\nLimite dos dados: snapshots diarios nao identificam a hora real de mudanca nem o resultado de segunda consulta no mesmo dia. Logo, 1–12h e orcamentos acima de uma consulta/produto/dia nao podem ser estimados sem telemetria de tentativas com timestamp.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
