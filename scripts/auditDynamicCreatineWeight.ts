import { prisma } from "../src/lib/prisma";

type DynamicAttributes = Record<string, string | number | boolean | null | undefined>;

function getFlagValue(flag: string) {
  const arg = process.argv.find((entry) => entry.startsWith(`${flag}=`));
  return arg ? arg.slice(flag.length + 1) : "";
}

function getNumericValue(value: unknown) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function roundMetric(value: number) {
  return Number(value.toFixed(2));
}

async function main() {
  const limit = Number(getFlagValue("--limit")) || 50;
  const tolerance = Number(getFlagValue("--tolerance")) || 1;

  const products = await prisma.dynamicProduct.findMany({
    where: {
      category: {
        group: "suplementos",
        slug: "creatina",
      },
    },
    select: {
      asin: true,
      name: true,
      attributes: true,
    },
    orderBy: {
      name: "asc",
    },
  });

  let okCount = 0;
  let missingBaseCount = 0;
  const mismatches: Array<{
    asin: string;
    name: string;
    weightGrams: number;
    unitsPerDose: number;
    numberOfDoses: number;
    expectedWeightGrams: number;
    diff: number;
  }> = [];
  const missingBase: Array<{
    asin: string;
    name: string;
    weightGrams: number;
    unitsPerDose: number;
    numberOfDoses: number;
  }> = [];

  for (const product of products) {
    const attrs = (product.attributes || {}) as DynamicAttributes;
    const weightGrams = getNumericValue(attrs.weightGrams);
    const unitsPerDose = getNumericValue(attrs.unitsPerDose) || getNumericValue(attrs.doseInGrams);
    const numberOfDoses = getNumericValue(attrs.numberOfDoses) || getNumericValue(attrs.doses);

    if (weightGrams <= 0 || unitsPerDose <= 0 || numberOfDoses <= 0) {
      missingBaseCount += 1;
      missingBase.push({
        asin: product.asin,
        name: product.name,
        weightGrams: roundMetric(weightGrams),
        unitsPerDose: roundMetric(unitsPerDose),
        numberOfDoses: roundMetric(numberOfDoses),
      });
      continue;
    }

    const expectedWeightGrams = roundMetric(unitsPerDose * numberOfDoses);
    const diff = roundMetric(Math.abs(weightGrams - expectedWeightGrams));

    if (diff > tolerance) {
      mismatches.push({
        asin: product.asin,
        name: product.name,
        weightGrams: roundMetric(weightGrams),
        unitsPerDose: roundMetric(unitsPerDose),
        numberOfDoses: roundMetric(numberOfDoses),
        expectedWeightGrams,
        diff,
      });
      continue;
    }

    okCount += 1;
  }

  console.log("");
  console.log("Auditoria de peso da creatina");
  console.log(`Total de produtos: ${products.length}`);
  console.log(`OK: ${okCount}`);
  console.log(`Sem base suficiente: ${missingBaseCount}`);
  console.log(`Inconsistencias reais: ${mismatches.length}`);

  if (mismatches.length > 0) {
    console.log("");
    console.log(`Top ${Math.min(limit, mismatches.length)} inconsistencias:`);
    for (const item of mismatches.slice(0, limit)) {
      console.log(
        `- ${item.asin} | ${item.weightGrams}g salvo vs ${item.expectedWeightGrams}g esperado (dose ${item.unitsPerDose}g x ${item.numberOfDoses} doses, diff ${item.diff}g) | ${item.name}`
      );
    }
  }

  if (missingBase.length > 0) {
    console.log("");
    console.log(`Top ${Math.min(limit, missingBase.length)} sem base suficiente:`);
    for (const item of missingBase.slice(0, limit)) {
      console.log(
        `- ${item.asin} | peso=${item.weightGrams || 0}g, dose=${item.unitsPerDose || 0}g, doses=${item.numberOfDoses || 0} | ${item.name}`
      );
    }
  }
}

main()
  .catch((error) => {
    console.error("Falha na auditoria de peso da creatina:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
