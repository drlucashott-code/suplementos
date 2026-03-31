import { prisma } from "../src/lib/prisma";

type DynamicAttributes = Record<string, string | number | boolean | undefined>;

type AuditIssue = {
  category: string;
  name: string;
  asin: string;
  metric: string;
  status: "missing" | "zero" | "divergent" | "insufficient_base";
  savedValue: number | null;
  expectedValue: number | null;
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
  }
) {
  const { category, name, asin, attrs, metric, expectedValue, baseDescription } = input;
  const rawPresent = hasRawAttribute(attrs, metric);
  const savedValue = rawPresent ? getNumericAttribute(attrs, metric) : null;

  if (expectedValue === null) {
    issues.push({
      category,
      name,
      asin,
      metric,
      status: "insufficient_base",
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

  if (savedValue !== null && Math.abs(savedValue - roundedExpected) > 0.0002) {
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

      compareMetric(issues, {
        category,
        name: product.name,
        asin: product.asin,
        attrs,
        metric: "precoPorBarra",
        expectedValue:
          totalPrice > 0 && unitsPerBox > 0 ? totalPrice / unitsPerBox : null,
        baseDescription: `totalPrice=${totalPrice}, unitsPerBox=${unitsPerBox}`,
      });

      compareMetric(issues, {
        category,
        name: product.name,
        asin: product.asin,
        attrs,
        metric: "precoPorGramaProteina",
        expectedValue:
          totalPrice > 0 && totalProteinInGrams > 0
            ? totalPrice / totalProteinInGrams
            : null,
        baseDescription: `totalPrice=${totalPrice}, totalProteinInGrams=${totalProteinInGrams}`,
      });
    }

    if (category === "bebidaproteica") {
      const unitsPerPack = getNumericAttribute(attrs, "unitsPerPack");
      const totalProteinInGrams = getNumericAttribute(attrs, "totalProteinInGrams");

      compareMetric(issues, {
        category,
        name: product.name,
        asin: product.asin,
        attrs,
        metric: "precoPorUnidade",
        expectedValue:
          totalPrice > 0 && unitsPerPack > 0 ? totalPrice / unitsPerPack : null,
        baseDescription: `totalPrice=${totalPrice}, unitsPerPack=${unitsPerPack}`,
      });

      compareMetric(issues, {
        category,
        name: product.name,
        asin: product.asin,
        attrs,
        metric: "precoPorGramaProteina",
        expectedValue:
          totalPrice > 0 && totalProteinInGrams > 0
            ? totalPrice / totalProteinInGrams
            : null,
        baseDescription: `totalPrice=${totalPrice}, totalProteinInGrams=${totalProteinInGrams}`,
      });
    }

    if (category === "whey") {
      const numberOfDoses = getNumericAttribute(attrs, "numberOfDoses");
      const totalProteinInGrams = getNumericAttribute(attrs, "totalProteinInGrams");
      const proteinPerDoseInGrams = getNumericAttribute(attrs, "proteinPerDoseInGrams");
      const doseInGrams = getNumericAttribute(attrs, "doseInGrams");

      compareMetric(issues, {
        category,
        name: product.name,
        asin: product.asin,
        attrs,
        metric: "precoPorDose",
        expectedValue:
          totalPrice > 0 && numberOfDoses > 0 ? totalPrice / numberOfDoses : null,
        baseDescription: `totalPrice=${totalPrice}, numberOfDoses=${numberOfDoses}`,
      });

      compareMetric(issues, {
        category,
        name: product.name,
        asin: product.asin,
        attrs,
        metric: "precoPorGramaProteina",
        expectedValue:
          totalPrice > 0 && totalProteinInGrams > 0
            ? totalPrice / totalProteinInGrams
            : null,
        baseDescription: `totalPrice=${totalPrice}, totalProteinInGrams=${totalProteinInGrams}`,
      });

      compareMetric(issues, {
        category,
        name: product.name,
        asin: product.asin,
        attrs,
        metric: "proteinPercentage",
        expectedValue:
          proteinPerDoseInGrams > 0 && doseInGrams > 0
            ? (proteinPerDoseInGrams / doseInGrams) * 100
            : null,
        baseDescription: `proteinPerDoseInGrams=${proteinPerDoseInGrams}, doseInGrams=${doseInGrams}`,
      });
    }

    if (category === "cafe-funcional") {
      const doses =
        getNumericAttribute(attrs, "doses") || getNumericAttribute(attrs, "numberOfDoses");
      const cafeinaTotalMg = getNumericAttribute(attrs, "cafeinaTotalMg");

      compareMetric(issues, {
        category,
        name: product.name,
        asin: product.asin,
        attrs,
        metric: "precoPorDose",
        expectedValue:
          totalPrice > 0 && doses > 0 ? totalPrice / doses : null,
        baseDescription: `totalPrice=${totalPrice}, doses=${doses}`,
      });

      compareMetric(issues, {
        category,
        name: product.name,
        asin: product.asin,
        attrs,
        metric: "precoPor100MgCafeina",
        expectedValue:
          totalPrice > 0 && cafeinaTotalMg > 0
            ? (totalPrice / cafeinaTotalMg) * 100
            : null,
        baseDescription: `totalPrice=${totalPrice}, cafeinaTotalMg=${cafeinaTotalMg}`,
      });
    }

    if (category === "pre-treino") {
      const numberOfDoses = getNumericAttribute(attrs, "numberOfDoses");

      compareMetric(issues, {
        category,
        name: product.name,
        asin: product.asin,
        attrs,
        metric: "precoPorDose",
        expectedValue:
          totalPrice > 0 && numberOfDoses > 0 ? totalPrice / numberOfDoses : null,
        baseDescription: `totalPrice=${totalPrice}, numberOfDoses=${numberOfDoses}`,
      });
    }

    if (category === "creatina") {
      const numberOfDoses = getNumericAttribute(attrs, "numberOfDoses");
      const creatinaPorDose = getNumericAttribute(attrs, "creatinaPorDose");
      const expectedPricePerDose =
        totalPrice > 0 && numberOfDoses > 0 ? totalPrice / numberOfDoses : null;

      compareMetric(issues, {
        category,
        name: product.name,
        asin: product.asin,
        attrs,
        metric: "precoPorDose",
        expectedValue: expectedPricePerDose,
        baseDescription: `totalPrice=${totalPrice}, numberOfDoses=${numberOfDoses}`,
      });

      compareMetric(issues, {
        category,
        name: product.name,
        asin: product.asin,
        attrs,
        metric: "precoPorGramaCreatina",
        expectedValue:
          expectedPricePerDose !== null && creatinaPorDose > 0
            ? expectedPricePerDose / creatinaPorDose
            : null,
        baseDescription: `totalPrice=${totalPrice}, numberOfDoses=${numberOfDoses}, creatinaPorDose=${creatinaPorDose}`,
      });
    }
  }

  const byStatus = issues.reduce<Record<string, number>>((acc, issue) => {
    acc[issue.status] = (acc[issue.status] || 0) + 1;
    return acc;
  }, {});

  const byCategory = issues.reduce<Record<string, number>>((acc, issue) => {
    acc[issue.category] = (acc[issue.category] || 0) + 1;
    return acc;
  }, {});

  console.log("");
  console.log("Resumo da auditoria:");
  console.log(`Produtos auditados: ${products.length}`);
  console.log(`Inconsistencias encontradas: ${issues.length}`);
  console.log(`Por status: ${JSON.stringify(byStatus, null, 2)}`);
  console.log(`Por categoria: ${JSON.stringify(byCategory, null, 2)}`);

  console.log("");
  console.log("Lista completa de inconsistencias:");
  for (const issue of issues) {
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

  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error("Erro na auditoria dos suplementos dinamicos:", error);
  await prisma.$disconnect();
  process.exit(1);
});

