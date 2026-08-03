import "dotenv/config";
import { prisma } from "../src/lib/prisma";

type HistoryRow = {
  productId: string;
  price: number;
  updateCount: number;
  date: Date;
  updatedAt: Date;
  category: string;
  attributes: unknown;
};

type ClickRow = { productId: string; createdAt: Date };

type Observation = {
  productId: string;
  date: Date;
  changed: 0 | 1;
  category: string;
  brand: string;
  logPrice: number;
  recentChangeRate: number;
  daysSinceChange: number;
  clicks7d: number;
  clicks30d: number;
  weekday: string;
  month: string;
  previousRefreshHour: string;
  clicksAvailable: boolean;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const MIN_GROUP_SIZE = 250;
const HOUR_FORMATTER = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Sao_Paulo",
  hour: "2-digit",
  hourCycle: "h23",
});
const WEEKDAY_FORMATTER = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Sao_Paulo",
  weekday: "short",
});
const MONTH_FORMATTER = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Sao_Paulo",
  month: "short",
});

function dateKey(value: Date) {
  return value.toISOString().slice(0, 10);
}

function businessHour(value: Date) {
  return Number(
    HOUR_FORMATTER
      .format(value)
      .replace(/\D/g, "")
  );
}

function businessWeekday(value: Date) {
  return WEEKDAY_FORMATTER.format(value);
}

function businessMonth(value: Date) {
  return MONTH_FORMATTER.format(value);
}

function toBrand(attributes: unknown) {
  if (!attributes || typeof attributes !== "object" || Array.isArray(attributes)) {
    return "Desconhecida";
  }
  const value = (attributes as Record<string, unknown>).brand;
  if (typeof value !== "string" || value.trim().length === 0) return "Desconhecida";
  return value.trim().slice(0, 80);
}

function logit(value: number) {
  const safe = Math.min(1 - 1e-6, Math.max(1e-6, value));
  return Math.log(safe / (1 - safe));
}

function sigmoid(value: number) {
  if (value >= 0) return 1 / (1 + Math.exp(-value));
  const positive = Math.exp(value);
  return positive / (1 + positive);
}

function gammaLn(value: number): number {
  const coefficients = [
    676.5203681218851,
    -1259.1392167224028,
    771.3234287776531,
    -176.6150291621406,
    12.507343278686905,
    -0.13857109526572012,
    9.9843695780195716e-6,
    1.5056327351493116e-7,
  ];
  if (value < 0.5) return Math.log(Math.PI) - Math.log(Math.sin(Math.PI * value)) - gammaLn(1 - value);
  const shifted = value - 1;
  let accumulator = 0.9999999999998099;
  for (let index = 0; index < coefficients.length; index += 1) {
    accumulator += coefficients[index] / (shifted + index + 1);
  }
  const t = shifted + coefficients.length - 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (shifted + 0.5) * Math.log(t) - t + Math.log(accumulator);
}

// Survival function of a chi-square distribution, via the regularized upper gamma.
function chiSquarePValue(chiSquare: number, degreesOfFreedom: number) {
  if (chiSquare <= 0 || degreesOfFreedom <= 0) return 1;
  const a = degreesOfFreedom / 2;
  const x = chiSquare / 2;
  const epsilon = 1e-14;
  const maxIterations = 200;
  if (x < a + 1) {
    let term = 1 / a;
    let sum = term;
    for (let n = 1; n <= maxIterations; n += 1) {
      term *= x / (a + n);
      sum += term;
      if (Math.abs(term) < Math.abs(sum) * epsilon) break;
    }
    return Math.max(0, Math.min(1, 1 - sum * Math.exp(-x + a * Math.log(x) - gammaLn(a))));
  }
  let b = x + 1 - a;
  let c = 1 / 1e-300;
  let d = 1 / b;
  let h = d;
  for (let i = 1; i <= maxIterations; i += 1) {
    const an = -i * (i - a);
    b += 2;
    d = an * d + b;
    if (Math.abs(d) < 1e-300) d = 1e-300;
    c = b + an / c;
    if (Math.abs(c) < 1e-300) c = 1e-300;
    d = 1 / d;
    const delta = d * c;
    h *= delta;
    if (Math.abs(delta - 1) < epsilon) break;
  }
  return Math.max(0, Math.min(1, Math.exp(-x + a * Math.log(x) - gammaLn(a)) * h));
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

function formatPValue(value: number) {
  if (value < 1e-12) return "<1e-12";
  return value.toExponential(2);
}

function bucketHour(hour: number) {
  if (hour < 6) return "00-05";
  if (hour < 12) return "06-11";
  if (hour < 18) return "12-17";
  return "18-23";
}

function groupSmallCategories(
  observations: Observation[],
  getValue: (observation: Observation) => string,
  minSize = MIN_GROUP_SIZE
) {
  const counts = new Map<string, number>();
  for (const observation of observations) {
    const value = getValue(observation);
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return (observation: Observation) => {
    const value = getValue(observation);
    return (counts.get(value) ?? 0) >= minSize ? value : "Outros";
  };
}

function categoricalTest(
  name: string,
  observations: Observation[],
  getGroup: (observation: Observation) => string
) {
  const groups = new Map<string, { total: number; changed: number }>();
  for (const observation of observations) {
    const group = getGroup(observation);
    const aggregate = groups.get(group) ?? { total: 0, changed: 0 };
    aggregate.total += 1;
    aggregate.changed += observation.changed;
    groups.set(group, aggregate);
  }
  const total = observations.length;
  const changed = observations.reduce((sum, observation) => sum + observation.changed, 0);
  const unchanged = total - changed;
  let chiSquare = 0;
  for (const aggregate of groups.values()) {
    const expectedChanged = (aggregate.total * changed) / total;
    const expectedUnchanged = (aggregate.total * unchanged) / total;
    if (expectedChanged > 0) chiSquare += (aggregate.changed - expectedChanged) ** 2 / expectedChanged;
    const observedUnchanged = aggregate.total - aggregate.changed;
    if (expectedUnchanged > 0) chiSquare += (observedUnchanged - expectedUnchanged) ** 2 / expectedUnchanged;
  }
  const degreesOfFreedom = Math.max(0, groups.size - 1);
  const pValue = chiSquarePValue(chiSquare, degreesOfFreedom);
  const ranges = [...groups.entries()]
    .map(([group, aggregate]) => ({ group, ...aggregate, rate: aggregate.changed / aggregate.total }))
    .sort((a, b) => a.rate - b.rate);
  return {
    name,
    groups: groups.size,
    n: total,
    chiSquare,
    degreesOfFreedom,
    pValue,
    cramersV: Math.sqrt(chiSquare / total),
    minRate: ranges[0]?.rate ?? 0,
    maxRate: ranges.at(-1)?.rate ?? 0,
    ranges,
  };
}

function makeQuantileBinner(values: number[], buckets: number) {
  const boundaries = Array.from({ length: buckets - 1 }, (_, index) => quantile(values, (index + 1) / buckets));
  return (value: number) => {
    const index = boundaries.findIndex((boundary) => value <= boundary);
    return `Q${index === -1 ? buckets : index + 1}`;
  };
}

function mean(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);
}

function deterministicSample<T>(items: T[], maxSize: number, key: (item: T) => string) {
  if (items.length <= maxSize) return items;
  return items
    .map((item) => {
      const text = key(item);
      let hash = 2166136261;
      for (let index = 0; index < text.length; index += 1) hash = Math.imul(hash ^ text.charCodeAt(index), 16777619);
      return { item, hash: hash >>> 0 };
    })
    .sort((a, b) => a.hash - b.hash)
    .slice(0, maxSize)
    .map(({ item }) => item);
}

type FeatureSpec = {
  name: string;
  group: string;
  value: (observation: Observation) => number;
};

function buildFeatureSpecs(train: Observation[]) {
  const specs: FeatureSpec[] = [{ name: "intercept", group: "intercept", value: () => 1 }];
  const numeric: Array<[string, (observation: Observation) => number]> = [
    ["log_price", (observation) => observation.logPrice],
    ["change_rate_30d", (observation) => observation.recentChangeRate],
    ["log_days_since_change", (observation) => Math.log1p(observation.daysSinceChange)],
    ["log_clicks_7d", (observation) => Math.log1p(observation.clicks7d)],
    ["log_clicks_30d", (observation) => Math.log1p(observation.clicks30d)],
  ];
  for (const [name, getter] of numeric) {
    const values = train.map(getter);
    const average = mean(values);
    const deviation = Math.sqrt(mean(values.map((value) => (value - average) ** 2))) || 1;
    specs.push({ name, group: name, value: (observation) => (getter(observation) - average) / deviation });
  }

  const categorical: Array<[string, (observation: Observation) => string, number]> = [
    ["category", (observation) => observation.category, 16],
    ["brand", (observation) => observation.brand, 20],
    ["weekday", (observation) => observation.weekday, 7],
    ["previous_refresh_hour", (observation) => observation.previousRefreshHour, 4],
    ["month", (observation) => observation.month, 12],
  ];
  for (const [group, getter, limit] of categorical) {
    const counts = new Map<string, number>();
    for (const row of train) counts.set(getter(row), (counts.get(getter(row)) ?? 0) + 1);
    const values = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([value]) => value);
    const baseline = values.at(-1);
    for (const value of values) {
      if (value === baseline) continue;
      specs.push({ name: `${group}:${value}`, group, value: (observation) => (getter(observation) === value ? 1 : 0) });
    }
  }
  return specs;
}

function fitLogistic(train: Observation[], specs: FeatureSpec[]) {
  // The association tests above use the complete history. A deterministic sample
  // keeps the explanatory model fast enough to be rerun routinely without
  // spending unnecessary compute on the database or local machine.
  const rows = deterministicSample(train, 15000, (row) => `${row.productId}:${dateKey(row.date)}`);
  const weights = new Float64Array(specs.length);
  const firstMoment = new Float64Array(specs.length);
  const secondMoment = new Float64Array(specs.length);
  const learningRate = 0.025;
  const beta1 = 0.9;
  const beta2 = 0.999;
  const regularization = 0.001;
  const batchSize = 512;
  let step = 0;
  for (let epoch = 0; epoch < 14; epoch += 1) {
    for (let offset = 0; offset < rows.length; offset += batchSize) {
      const end = Math.min(rows.length, offset + batchSize);
      const gradient = new Float64Array(specs.length);
      for (let rowIndex = offset; rowIndex < end; rowIndex += 1) {
        const row = rows[rowIndex];
        let linear = 0;
        for (let feature = 0; feature < specs.length; feature += 1) linear += weights[feature] * specs[feature].value(row);
        const error = sigmoid(linear) - row.changed;
        for (let feature = 0; feature < specs.length; feature += 1) gradient[feature] += error * specs[feature].value(row);
      }
      step += 1;
      for (let feature = 0; feature < specs.length; feature += 1) {
        const penalizedGradient = gradient[feature] / (end - offset) + (feature === 0 ? 0 : regularization * weights[feature]);
        firstMoment[feature] = beta1 * firstMoment[feature] + (1 - beta1) * penalizedGradient;
        secondMoment[feature] = beta2 * secondMoment[feature] + (1 - beta2) * penalizedGradient ** 2;
        const correctedFirst = firstMoment[feature] / (1 - beta1 ** step);
        const correctedSecond = secondMoment[feature] / (1 - beta2 ** step);
        weights[feature] -= (learningRate * correctedFirst) / (Math.sqrt(correctedSecond) + 1e-8);
      }
    }
  }
  return { weights, sampleSize: rows.length };
}

function predict(row: Observation, specs: FeatureSpec[], weights: Float64Array, excludedGroup?: string) {
  let linear = 0;
  for (let feature = 0; feature < specs.length; feature += 1) {
    if (specs[feature].group === excludedGroup) continue;
    linear += weights[feature] * specs[feature].value(row);
  }
  return sigmoid(linear);
}

function auc(labels: number[], scores: number[]) {
  const ordered = labels.map((label, index) => ({ label, score: scores[index] })).sort((a, b) => a.score - b.score);
  let positives = 0;
  let negativeRankSum = 0;
  let rank = 1;
  for (let index = 0; index < ordered.length; ) {
    let end = index + 1;
    while (end < ordered.length && ordered[end].score === ordered[index].score) end += 1;
    const averageRank = (rank + rank + (end - index) - 1) / 2;
    for (let current = index; current < end; current += 1) {
      if (ordered[current].label === 1) {
        positives += 1;
        negativeRankSum += averageRank;
      }
    }
    rank += end - index;
    index = end;
  }
  const negatives = labels.length - positives;
  if (positives === 0 || negatives === 0) return 0.5;
  return (negativeRankSum - (positives * (positives + 1)) / 2) / (positives * negatives);
}

function evaluate(test: Observation[], specs: FeatureSpec[], weights: Float64Array, excludedGroup?: string) {
  const predictions = test.map((row) => predict(row, specs, weights, excludedGroup));
  const labels = test.map((row) => row.changed);
  const baseRate = mean(labels);
  const logLoss = mean(predictions.map((probability, index) => -(labels[index] * Math.log(probability) + (1 - labels[index]) * Math.log(1 - probability))));
  const brier = mean(predictions.map((probability, index) => (probability - labels[index]) ** 2));
  const ranked = labels.map((label, index) => ({ label, probability: predictions[index] })).sort((a, b) => b.probability - a.probability);
  const take = (share: number) => Math.max(1, Math.floor(ranked.length * share));
  const top10 = mean(ranked.slice(0, take(0.1)).map((row) => row.label));
  const top20 = mean(ranked.slice(0, take(0.2)).map((row) => row.label));
  return {
    auc: auc(labels, predictions),
    logLoss,
    brier,
    baseRate,
    top10,
    top20,
    top10Capture: (top10 * take(0.1)) / Math.max(1, labels.reduce<number>((sum, label) => sum + label, 0)),
    top20Capture: (top20 * take(0.2)) / Math.max(1, labels.reduce<number>((sum, label) => sum + label, 0)),
  };
}

async function main() {
  const [history, clicks] = await Promise.all([
    prisma.$queryRaw<HistoryRow[]>`
      SELECT h."productId", h."price", h."updateCount", h."date", h."updatedAt",
             c.name AS category, p.attributes
      FROM "DynamicPriceHistory" h
      JOIN "DynamicProduct" p ON p.id = h."productId"
      JOIN "DynamicCategory" c ON c.id = p."categoryId"
      WHERE h."date" < (SELECT max("date") FROM "DynamicPriceHistory")
      ORDER BY h."productId", h."date"
    `,
    prisma.$queryRaw<ClickRow[]>`
      SELECT "productId", "createdAt"
      FROM "DynamicProductClickEvent"
      ORDER BY "productId", "createdAt"
    `,
  ]);

  const clicksByProduct = new Map<string, Date[]>();
  for (const click of clicks) {
    const productClicks = clicksByProduct.get(click.productId) ?? [];
    productClicks.push(click.createdAt);
    clicksByProduct.set(click.productId, productClicks);
  }
  const firstClickAt = clicks[0]?.createdAt ?? new Date();
  const rowsByProduct = new Map<string, HistoryRow[]>();
  for (const row of history) {
    const rows = rowsByProduct.get(row.productId) ?? [];
    rows.push(row);
    rowsByProduct.set(row.productId, rows);
  }

  const observations: Observation[] = [];
  for (const [productId, rows] of rowsByProduct) {
    const productClicks = clicksByProduct.get(productId) ?? [];
    let clickStart7 = 0;
    let clickStart30 = 0;
    let clickEnd = 0;
    const previousChanges: Array<{ date: Date; changed: number }> = [];
    let lastChangeAt: Date | null = null;
    for (let index = 1; index < rows.length; index += 1) {
      const previous = rows[index - 1];
      const current = rows[index];
      const gapDays = (current.date.getTime() - previous.date.getTime()) / DAY_MS;
      if (gapDays > 2 || previous.price <= 0 || current.price <= 0) continue;
      while (clickEnd < productClicks.length && productClicks[clickEnd].getTime() < current.date.getTime()) clickEnd += 1;
      const sevenDaysAgo = current.date.getTime() - 7 * DAY_MS;
      const thirtyDaysAgo = current.date.getTime() - 30 * DAY_MS;
      while (clickStart7 < clickEnd && productClicks[clickStart7].getTime() < sevenDaysAgo) clickStart7 += 1;
      while (clickStart30 < clickEnd && productClicks[clickStart30].getTime() < thirtyDaysAgo) clickStart30 += 1;
      while (previousChanges.length > 0 && previousChanges[0].date.getTime() < thirtyDaysAgo) previousChanges.shift();
      const previousChangeCount = previousChanges.reduce((sum, event) => sum + event.changed, 0);
      const changed = previous.price !== current.price || current.updateCount > 1 ? 1 : 0;
      observations.push({
        productId,
        date: current.date,
        changed,
        category: current.category,
        brand: toBrand(current.attributes),
        logPrice: Math.log(previous.price),
        recentChangeRate: previousChanges.length === 0 ? 0 : previousChangeCount / previousChanges.length,
        daysSinceChange: lastChangeAt ? Math.min(90, Math.max(0, (current.date.getTime() - lastChangeAt.getTime()) / DAY_MS)) : 90,
        clicks7d: clickEnd - clickStart7,
        clicks30d: clickEnd - clickStart30,
        weekday: businessWeekday(current.date),
        month: businessMonth(current.date),
        previousRefreshHour: bucketHour(businessHour(previous.updatedAt)),
        clicksAvailable: current.date.getTime() >= firstClickAt.getTime() + 7 * DAY_MS,
      });
      previousChanges.push({ date: current.date, changed });
      if (changed) lastChangeAt = current.date;
    }
  }

  const dates = [...new Set(observations.map((observation) => dateKey(observation.date)))].sort();
  const cutoff = dates[Math.floor(dates.length * 0.8)];
  // The price-feed process evolved materially over the lifetime of this table.
  // Use a rolling window for decisions, so an old import/backfill regime does
  // not teach the scheduler behaviour that no longer exists.
  const cutoffDate = new Date(`${cutoff}T00:00:00.000Z`);
  const trainingStart = new Date(cutoffDate.getTime() - 90 * DAY_MS);
  const train = observations.filter(
    (observation) => observation.date.getTime() >= trainingStart.getTime() && dateKey(observation.date) < cutoff
  );
  const test = observations.filter((observation) => dateKey(observation.date) >= cutoff);
  const clicksTrain = train.filter((observation) => observation.clicksAvailable);

  const priceBinner = makeQuantileBinner(train.map((observation) => observation.logPrice), 5);
  const frequencyBinner = makeQuantileBinner(train.map((observation) => observation.recentChangeRate), 5);
  const recencyBinner = (observation: Observation) => {
    if (observation.daysSinceChange <= 1) return "0-1d";
    if (observation.daysSinceChange <= 3) return "2-3d";
    if (observation.daysSinceChange <= 7) return "4-7d";
    if (observation.daysSinceChange <= 14) return "8-14d";
    if (observation.daysSinceChange <= 30) return "15-30d";
    return "31+d";
  };
  const clickBinner = (days: 7 | 30) => (observation: Observation) => {
    const count = days === 7 ? observation.clicks7d : observation.clicks30d;
    return count === 0 ? "0" : count === 1 ? "1" : count <= 3 ? "2-3" : "4+";
  };
  const categoryGroup = groupSmallCategories(train, (observation) => observation.category);
  const brandGroup = groupSmallCategories(train, (observation) => observation.brand, 500);
  const analyses = [
    categoricalTest("Marca", train, brandGroup),
    categoricalTest("Categoria", train, categoryGroup),
    categoricalTest("Preco atual (quintis)", train, (observation) => priceBinner(observation.logPrice)),
    categoricalTest("Frequencia de mudanca nos 30d (quintis)", train, (observation) => frequencyBinner(observation.recentChangeRate)),
    categoricalTest("Intervalo desde ultima mudanca", train, recencyBinner),
    categoricalTest("Dia da semana", train, (observation) => observation.weekday),
    categoricalTest("Horario da coleta anterior", train, (observation) => observation.previousRefreshHour),
    categoricalTest("Sazonalidade (mes)", train, (observation) => observation.month),
    categoricalTest("Cliques nos 7d", clicksTrain, clickBinner(7)),
    categoricalTest("Cliques nos 30d", clicksTrain, clickBinner(30)),
  ];

  const modelTrain = train.filter((observation) => observation.clicksAvailable);
  const modelTest = test.filter((observation) => observation.clicksAvailable);
  const specs = buildFeatureSpecs(modelTrain);
  const fitted = fitLogistic(modelTrain, specs);
  const full = evaluate(modelTest, specs, fitted.weights);
  const factorGroups = ["log_price", "change_rate_30d", "log_days_since_change", "log_clicks_7d", "log_clicks_30d", "category", "brand", "weekday", "previous_refresh_hour", "month"];
  const ablations = factorGroups.map((group) => {
    const without = evaluate(modelTest, specs, fitted.weights, group);
    return { group, aucDrop: full.auc - without.auc, logLossIncrease: without.logLoss - full.logLoss };
  }).sort((a, b) => b.logLossIncrease - a.logLossIncrease);

  console.log(`\nRelatorio de preditores de mudanca de preco — ${new Date().toISOString()}`);
  console.log(`Historico analisado: ${history.length.toLocaleString("pt-BR")} snapshots; ${observations.length.toLocaleString("pt-BR")} comparacoes diarias validas.`);
  console.log(`Corte temporal: treino movel de ${dateKey(trainingStart)} ate ${cutoff} (${train.length.toLocaleString("pt-BR")}) | teste posterior (${test.length.toLocaleString("pt-BR")}).`);
  console.log(`Taxa-base de mudanca: treino ${formatPercent(mean(train.map((row) => row.changed)))} | teste ${formatPercent(mean(test.map((row) => row.changed)))}.`);
  console.log("\nTestes de associacao (qui-quadrado; alfa Bonferroni = 0,005):");
  for (const result of analyses) {
    console.log(`- ${result.name}: n=${result.n.toLocaleString("pt-BR")}, grupos=${result.groups}, χ²=${result.chiSquare.toFixed(1)}, p=${formatPValue(result.pValue)}, V=${result.cramersV.toFixed(3)}, faixa=${formatPercent(result.minRate)}–${formatPercent(result.maxRate)}`);
  }
  console.log(`\nModelo temporal (somente periodo com rastreamento de cliques; treino ${fitted.sampleSize.toLocaleString("pt-BR")} amostrado):`);
  console.log(`- AUC=${full.auc.toFixed(3)} | log-loss=${full.logLoss.toFixed(4)} | Brier=${full.brier.toFixed(4)}`);
  console.log(`- Nos 10% com maior risco, ${formatPercent(full.top10)} das consultas encontrariam mudanca, versus ${formatPercent(full.baseRate)} aleatoriamente: lift ${(full.top10 / full.baseRate).toFixed(2)}x; isso cobre ${formatPercent(full.top10Capture)} das mudancas do periodo.`);
  console.log(`- Nos 20% com maior risco, ${formatPercent(full.top20)} das consultas encontrariam mudanca: lift ${(full.top20 / full.baseRate).toFixed(2)}x; isso cobre ${formatPercent(full.top20Capture)} das mudancas do periodo.`);
  console.log("- Perda fora da amostra ao remover cada fator do score (maior = mais util):");
  for (const result of ablations) console.log(`  ${result.group}: Δlog-loss=${result.logLossIncrease.toFixed(5)}, ΔAUC=${result.aucDrop.toFixed(4)}`);
  console.log("\nObservacoes metodologicas:");
  console.log("- O historico registra um snapshot diario e alteracoes detectadas dentro do dia; ele nao registra todas as consultas sem mudanca. Portanto, o alvo e mudanca detectada no proximo snapshot diario, nao a hora exata da mudanca na Amazon.");
  console.log("- Nao ha eventos de visualizacao no banco Neon. Cliques foram testados; visualizacoes exigem instrumentacao antes de entrarem no algoritmo.");
  console.log("- Mes e horario devem ser tratados como sinais de baixa confianca ate haver pelo menos um ciclo anual e telemetria de tentativas por horario.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
