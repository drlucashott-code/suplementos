import { prisma } from "../src/lib/prisma";

type DynamicAttributes = Record<string, string | number | boolean | undefined>;

type AuditStatus =
  | "missing"
  | "zero"
  | "divergent"
  | "price_unavailable"
  | "missing_base";

type AuditIssue = {
  category: string;
  name: string;
  asin: string;
  metric: string;
  status: AuditStatus;
  savedValue: number | null;
  expectedValue: number | null;
  details: string;
};

type MetricExpectation = {
  expectedValue: number | null;
  statusIfMissing: Exclude<AuditStatus, "missing" | "zero" | "divergent"> | null;
  details: string;
};

function getNumericAttribute(attrs: DynamicAttributes, key: string) {
  const value = Number(attrs[key]);
  return Number.isNaN(value) ? 0 : value;
}

function hasRawAttribute(attrs: DynamicAttributes, key: string) {
  return attrs[key] !== undefined && attrs[key] !== null && String(attrs[key]).trim() !== "";
}

function roundMetric(value: number) {
  return Number(value.toFixed(4));
}

function getMetricTolerance(metric: string) {
  if (metric === "proteinPercentage") {
    return 1;
  }

  return 0.0002;
}

function buildMetricExpectation(input: {
  totalPrice: number;
  baseFields: Array<{ key: string; value: number }>;
  compute: () => number;
}): MetricExpectation {
  const details = [`totalPrice=${input.totalPrice}`]
    .concat(input.baseFields.map((field) => `${field.key}=${field.value}`))
    .join(", ");

  if (!(input.totalPrice > 0)) {
    return {
      expectedValue: null,
      statusIfMissing: "price_unavailable",
      details,
    };
  }

  const missingBase = input.baseFields.find((field) => !(field.value > 0));
  if (missingBase) {
    return {
      expectedValue: null,
      statusIfMissing: "missing_base",
      details,
    };
  }

  return {
    expectedValue: input.compute(),
    statusIfMissing: null,
    details,
  };
}

function compareMetric(
  issues: AuditIssue[],
  input: {
    category: string;
    name: string;
    asin: string;
    attrs: DynamicAttributes;
    metric: string;
    expectedValue: number | null;
    baseDescription: string;
    statusIfMissing?: Exclude<AuditStatus, "missing" | "zero" | "divergent"> | null;
    tolerance?: number;
  }
) {
  const {
    category,
    name,
    asin,
    attrs,
    metric,
    expectedValue,
    baseDescription,
    statusIfMissing,
    tolerance,
  } = input;
  const rawPresent = hasRawAttribute(attrs, metric);
  const savedValue = rawPresent ? getNumericAttribute(attrs, metric) : null;

  if (expectedValue === null) {
    issues.push({
      category,
      name,
      asin,
      metric,
      status: statusIfMissing ?? "missing_base",
      savedValue,
      expectedValue: null,
      details: baseDescription,
    });
    return;
  }

  const roundedExpected = roundMetric(expectedValue);

  if (!rawPresent) {
    issues.push({
      category,
      name,
      asin,
      metric,
      status: "missing",
      savedValue: null,
      expectedValue: roundedExpected,
      details: baseDescription,
    });
    return;
  }

  if (savedValue === 0 && roundedExpected > 0) {
    issues.push({
      category,
      name,
      asin,
      metric,
      status: "zero",
      savedValue,
      expectedValue: roundedExpected,
      details: baseDescription,
    });
      return;
  }

  const metricTolerance = tolerance ?? getMetricTolerance(metric);

  if (savedValue !== null && Math.abs(savedValue - roundedExpected) > metricTolerance) {
    issues.push({
      category,
      name,
      asin,
      metric,
      status: "divergent",
      savedValue,
      expectedValue: roundedExpected,
      details: baseDescription,
    });
  }
}

async function main() {
  const products = await prisma.dynamicProduct.findMany({
    where: {
      category: {
        group: "suplementos",
      },
    },
    include: {
      category: true,
    },
    orderBy: [
      { categoryId: "asc" },
      { name: "asc" },
    ],
  });

  const issues: AuditIssue[] = [];

  for (const product of products) {
    const attrs = product.attributes as DynamicAttributes;
    const category = product.category.slug;
    const totalPrice = product.totalPrice;

    if (category === "barra") {
      const unitsPerBox = getNumericAttribute(attrs, "unitsPerBox");
      const totalProteinInGrams = getNumericAttribute(attrs, "totalProteinInGrams");
      const pricePerBar = buildMetricExpectation({
        totalPrice,
        baseFields: [{ key: "unitsPerBox", value: unitsPerBox }],
        compute: () => totalPrice / unitsPerBox,
      });
      const pricePerProteinGram = buildMetricExpectation({
        totalPrice,
        baseFields: [{ key: "totalProteinInGrams", value: totalProteinInGrams }],
        compute: () => totalPrice / totalProteinInGrams,
      });

      compareMetric(issues, {
        category,
        name: product.name,
        asin: product.asin,
        attrs,
        metric: "precoPorBarra",
        expectedValue: pricePerBar.expectedValue,
        statusIfMissing: pricePerBar.statusIfMissing,
        baseDescription: pricePerBar.details,
      });

      compareMetric(issues, {
        category,
        name: product.name,
        asin: product.asin,
        attrs,
        metric: "precoPorGramaProteina",
        expectedValue: pricePerProteinGram.expectedValue,
        statusIfMissing: pricePerProteinGram.statusIfMissing,
        baseDescription: pricePerProteinGram.details,
      });
    }

    if (category === "bebidaproteica") {
      const unitsPerPack = getNumericAttribute(attrs, "unitsPerPack");
      const totalProteinInGrams = getNumericAttribute(attrs, "totalProteinInGrams");
      const pricePerUnit = buildMetricExpectation({
        totalPrice,
        baseFields: [{ key: "unitsPerPack", value: unitsPerPack }],
        compute: () => totalPrice / unitsPerPack,
      });
      const pricePerProteinGram = buildMetricExpectation({
        totalPrice,
        baseFields: [{ key: "totalProteinInGrams", value: totalProteinInGrams }],
        compute: () => totalPrice / totalProteinInGrams,
      });

      compareMetric(issues, {
        category,
        name: product.name,
        asin: product.asin,
        attrs,
        metric: "precoPorUnidade",
        expectedValue: pricePerUnit.expectedValue,
        statusIfMissing: pricePerUnit.statusIfMissing,
        baseDescription: pricePerUnit.details,
      });

      compareMetric(issues, {
        category,
        name: product.name,
        asin: product.asin,
        attrs,
        metric: "precoPorGramaProteina",
        expectedValue: pricePerProteinGram.expectedValue,
        statusIfMissing: pricePerProteinGram.statusIfMissing,
        baseDescription: pricePerProteinGram.details,
      });
    }

    if (category === "whey") {
      const numberOfDoses = getNumericAttribute(attrs, "numberOfDoses");
      const totalProteinInGrams = getNumericAttribute(attrs, "totalProteinInGrams");
      const proteinPerDoseInGrams = getNumericAttribute(attrs, "proteinPerDoseInGrams");
      const doseInGrams = getNumericAttribute(attrs, "doseInGrams");
      const pricePerDose = buildMetricExpectation({
        totalPrice,
        baseFields: [{ key: "numberOfDoses", value: numberOfDoses }],
        compute: () => totalPrice / numberOfDoses,
      });
      const pricePerProteinGram = buildMetricExpectation({
        totalPrice,
        baseFields: [{ key: "totalProteinInGrams", value: totalProteinInGrams }],
        compute: () => totalPrice / totalProteinInGrams,
      });
      const proteinPercentage = buildMetricExpectation({
        totalPrice: 1,
        baseFields: [
          { key: "proteinPerDoseInGrams", value: proteinPerDoseInGrams },
          { key: "doseInGrams", value: doseInGrams },
        ],
        compute: () => (proteinPerDoseInGrams / doseInGrams) * 100,
      });

      compareMetric(issues, {
        category,
        name: product.name,
        asin: product.asin,
        attrs,
        metric: "precoPorDose",
        expectedValue: pricePerDose.expectedValue,
        statusIfMissing: pricePerDose.statusIfMissing,
        baseDescription: pricePerDose.details,
      });

      compareMetric(issues, {
        category,
        name: product.name,
        asin: product.asin,
        attrs,
        metric: "precoPorGramaProteina",
        expectedValue: pricePerProteinGram.expectedValue,
        statusIfMissing: pricePerProteinGram.statusIfMissing,
        baseDescription: pricePerProteinGram.details,
      });

      compareMetric(issues, {
        category,
        name: product.name,
        asin: product.asin,
        attrs,
        metric: "proteinPercentage",
        expectedValue: proteinPercentage.expectedValue,
        statusIfMissing: proteinPercentage.statusIfMissing,
        baseDescription: proteinPercentage.details,
      });
    }

    if (category === "cafe-funcional") {
      const doses =
        getNumericAttribute(attrs, "doses") || getNumericAttribute(attrs, "numberOfDoses");
      const cafeinaTotalMg = getNumericAttribute(attrs, "cafeinaTotalMg");
      const pricePerDose = buildMetricExpectation({
        totalPrice,
        baseFields: [{ key: "doses", value: doses }],
        compute: () => totalPrice / doses,
      });
      const pricePer100MgCafeina = buildMetricExpectation({
        totalPrice,
        baseFields: [{ key: "cafeinaTotalMg", value: cafeinaTotalMg }],
        compute: () => (totalPrice / cafeinaTotalMg) * 100,
      });

      compareMetric(issues, {
        category,
        name: product.name,
        asin: product.asin,
        attrs,
        metric: "precoPorDose",
        expectedValue: pricePerDose.expectedValue,
        statusIfMissing: pricePerDose.statusIfMissing,
        baseDescription: pricePerDose.details,
      });

      compareMetric(issues, {
        category,
        name: product.name,
        asin: product.asin,
        attrs,
        metric: "precoPor100MgCafeina",
        expectedValue: pricePer100MgCafeina.expectedValue,
        statusIfMissing: pricePer100MgCafeina.statusIfMissing,
        baseDescription: pricePer100MgCafeina.details,
      });
    }

    if (category === "pre-treino") {
      const numberOfDoses = getNumericAttribute(attrs, "numberOfDoses");
      const pricePerDose = buildMetricExpectation({
        totalPrice,
        baseFields: [{ key: "numberOfDoses", value: numberOfDoses }],
        compute: () => totalPrice / numberOfDoses,
      });

      compareMetric(issues, {
        category,
        name: product.name,
        asin: product.asin,
        attrs,
        metric: "precoPorDose",
        expectedValue: pricePerDose.expectedValue,
        statusIfMissing: pricePerDose.statusIfMissing,
        baseDescription: pricePerDose.details,
      });
    }

    if (category === "creatina") {
      const numberOfDoses = getNumericAttribute(attrs, "numberOfDoses");
      const creatinaPorDose = getNumericAttribute(attrs, "creatinaPorDose");
      const pricePerDose = buildMetricExpectation({
        totalPrice,
        baseFields: [{ key: "numberOfDoses", value: numberOfDoses }],
        compute: () => totalPrice / numberOfDoses,
      });
      const pricePerGramCreatine = buildMetricExpectation({
        totalPrice,
        baseFields: [
          { key: "numberOfDoses", value: numberOfDoses },
          { key: "creatinaPorDose", value: creatinaPorDose },
        ],
        compute: () => (totalPrice / numberOfDoses) / creatinaPorDose,
      });

      compareMetric(issues, {
        category,
        name: product.name,
        asin: product.asin,
        attrs,
        metric: "precoPorDose",
        expectedValue: pricePerDose.expectedValue,
        statusIfMissing: pricePerDose.statusIfMissing,
        baseDescription: pricePerDose.details,
      });

      compareMetric(issues, {
        category,
        name: product.name,
        asin: product.asin,
        attrs,
        metric: "precoPorGramaCreatina",
        expectedValue: pricePerGramCreatine.expectedValue,
        statusIfMissing: pricePerGramCreatine.statusIfMissing,
        baseDescription: pricePerGramCreatine.details,
      });
    }
  }

  const actionableStatuses = new Set<AuditStatus>(["missing", "zero", "divergent"]);
  const informationalStatuses = new Set<AuditStatus>(["price_unavailable", "missing_base"]);
  const actionableIssues = issues.filter((issue) => actionableStatuses.has(issue.status));
  const informationalIssues = issues.filter((issue) =>
    informationalStatuses.has(issue.status)
  );

  const buildSummary = (collection: AuditIssue[], key: "status" | "category") =>
    collection.reduce<Record<string, number>>((acc, issue) => {
      acc[issue[key]] = (acc[issue[key]] || 0) + 1;
      return acc;
    }, {});

  const actionableByStatus = buildSummary(actionableIssues, "status");
  const informationalByStatus = buildSummary(informationalIssues, "status");
  const actionableByCategory = buildSummary(actionableIssues, "category");
  const informationalByCategory = buildSummary(informationalIssues, "category");

  console.log("");
  console.log("Resumo da auditoria:");
  console.log(`Produtos auditados: ${products.length}`);
  console.log(`Inconsistencias reais: ${actionableIssues.length}`);
  console.log(`Sinais informativos: ${informationalIssues.length}`);
  console.log(`Por status (reais): ${JSON.stringify(actionableByStatus, null, 2)}`);
  console.log(`Por status (informativos): ${JSON.stringify(informationalByStatus, null, 2)}`);
  console.log(`Por categoria (reais): ${JSON.stringify(actionableByCategory, null, 2)}`);
  console.log(
    `Por categoria (informativos): ${JSON.stringify(informationalByCategory, null, 2)}`
  );

  console.log("");
  console.log("Lista de inconsistencias reais:");
  if (actionableIssues.length === 0) {
    console.log("Nenhuma inconsistencia real encontrada.");
  }
  for (const issue of actionableIssues) {
    console.log(
      JSON.stringify({
        category: issue.category,
        name: issue.name,
        asin: issue.asin,
        metric: issue.metric,
        status: issue.status,
        savedValue: issue.savedValue,
        expectedValue: issue.expectedValue,
        details: issue.details,
      })
    );
  }

  console.log("");
  console.log("Resumo dos sinais informativos:");
  if (informationalIssues.length === 0) {
    console.log("Nenhum sinal informativo encontrado.");
  }
  for (const issue of informationalIssues.slice(0, 25)) {
    console.log(
      JSON.stringify({
        category: issue.category,
        name: issue.name,
        asin: issue.asin,
        metric: issue.metric,
        status: issue.status,
        savedValue: issue.savedValue,
        expectedValue: issue.expectedValue,
        details: issue.details,
      })
    );
  }

  if (informationalIssues.length > 25) {
    console.log(
      `... ${informationalIssues.length - 25} sinais informativos adicionais omitidos para reduzir ruido.`
    );
  }

  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error("Erro na auditoria dos suplementos dinamicos:", error);
  await prisma.$disconnect();
  process.exit(1);
});

