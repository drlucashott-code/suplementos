import { Prisma } from "@prisma/client";
import { prisma } from "../src/lib/prisma";

type DynamicAttributes = Record<string, string | number | boolean | null | undefined>;

const PRICE_METRIC_KEYS = [
  "precoPorBarra",
  "precoPorUnidade",
  "precoPorDose",
  "precoPorGramaProteina",
  "precoPor100MgCafeina",
  "precoPorGramaCreatina",
] as const;

type PriceMetricKey = (typeof PRICE_METRIC_KEYS)[number];

function stripPriceMetrics(attributes: DynamicAttributes) {
  const next: DynamicAttributes = { ...attributes };
  const removedKeys: PriceMetricKey[] = [];

  for (const key of PRICE_METRIC_KEYS) {
    if (key in next) {
      delete next[key];
      removedKeys.push(key);
    }
  }

  return {
    cleanedAttributes: next,
    removedKeys,
  };
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
    orderBy: [{ categoryId: "asc" }, { name: "asc" }],
  });

  let updatedCount = 0;
  const touchedByCategory: Record<string, number> = {};

  console.log("Iniciando limpeza dos campos dinamicos de preco...");

  for (const product of products) {
    const attributes = product.attributes as DynamicAttributes;
    const { cleanedAttributes, removedKeys } = stripPriceMetrics(attributes);

    if (removedKeys.length === 0) {
      continue;
    }

    await prisma.dynamicProduct.update({
      where: { id: product.id },
      data: {
        attributes: cleanedAttributes as Prisma.InputJsonValue,
      },
    });

    updatedCount += 1;
    touchedByCategory[product.category.slug] =
      (touchedByCategory[product.category.slug] || 0) + 1;

    console.log(
      `Atualizado: ${product.name} (${product.asin}) -> removidos: ${removedKeys.join(", ")}`
    );
  }

  console.log("");
  console.log("Limpeza concluida.");
  console.log(`Produtos atualizados: ${updatedCount}`);
  console.log(`Por categoria: ${JSON.stringify(touchedByCategory, null, 2)}`);

  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error("Erro na limpeza dos campos dinamicos de preco:", error);
  await prisma.$disconnect();
  process.exit(1);
});
