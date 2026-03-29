import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { reconcileDynamicFallbackState } from "../src/lib/dynamicFallback";
import { refreshDynamicProductPriceStatsBulk } from "../src/lib/dynamicPriceStats";
import {
  getAmazonItemMerchantName,
  getAmazonItemPrice,
  getAmazonItems,
} from "../src/lib/amazonApiClient";

const prisma = new PrismaClient();

const REQUEST_DELAY_MS = Number(process.env.AMAZON_GLOBAL_REQUEST_DELAY_MS ?? 1200);
const RECHECK_DELAY_MS = 5000;
const BATCH_SIZE = Math.min(
  Number(process.env.AMAZON_GLOBAL_BATCH_SIZE ?? 10),
  10
);
const VARIATION_THRESHOLD = 0.2;

type ApiStatus = "OK" | "OUT_OF_STOCK" | "EXCLUDED" | "ERROR";

type PriceResult = {
  price: number;
  merchantName: string;
  status: ApiStatus;
};

type PersistOutcome = "UPDATED" | "FAILED" | "OUT_OF_STOCK" | "EXCLUDED";

type RunCounters = {
  totalOffers: number;
  updatedOffers: number;
  failedOffers: number;
  maxConsecutiveFailedOffers: number;
  outOfStockOffers: number;
  excludedOffers: number;
};

type DynamicProductLite = {
  id: string;
  asin: string | null;
  totalPrice: number;
  name: string;
  attributes: unknown;
};

async function fetchAmazonPricesBatch(
  asins: string[]
): Promise<Record<string, PriceResult>> {
  if (asins.length === 0) return {};

  const items = await getAmazonItems({
    itemIds: asins,
    resources: [
      "Offers.Listings.Price",
      "OffersV2.Listings.Price",
      "Offers.Listings.MerchantInfo",
      "OffersV2.Listings.MerchantInfo",
    ],
  });

  const results: Record<string, PriceResult> = {};

  for (const item of items) {
    const asin = item.ASIN;
    if (!asin) continue;

    let price = getAmazonItemPrice(item);
    const merchantName = getAmazonItemMerchantName(item) || "Desconhecido";
    let status: ApiStatus = price > 0 ? "OK" : "OUT_OF_STOCK";

    if (merchantName === "Loja Suplemento") {
      status = "EXCLUDED";
      price = 0;
    }

    results[asin] = { price, merchantName, status };
  }

  return results;
}

async function persistDynamicUpdate(
  product: DynamicProductLite,
  result?: PriceResult
) {
  const currentAttrs = (product.attributes as Record<string, unknown>) || {};
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (result && result.status === "OK") {
    await prisma.dynamicProduct.update({
      where: { id: product.id },
      data: {
        totalPrice: result.price,
        attributes: {
          ...currentAttrs,
          vendedor: result.merchantName,
        },
      },
    });

    await prisma.dynamicPriceHistory.upsert({
      where: {
        productId_date: { productId: product.id, date: today },
      },
      update: {
        price: result.price,
        updateCount: { increment: 1 },
      },
      create: {
        productId: product.id,
        date: today,
        price: result.price,
      },
    });

    return {
      logStatus: `OK R$ ${result.price.toFixed(2)}`,
      outcome: "UPDATED" as PersistOutcome,
      shouldRefreshPriceStats: true,
    };
  }

  let logStatus = "Sem dados da API";
  let outcome: PersistOutcome = "FAILED";

  if (result?.status === "EXCLUDED") {
    logStatus = `Excluida: ${result.merchantName}`;
    outcome = "EXCLUDED";
  } else if (result?.status === "OUT_OF_STOCK") {
    logStatus = "Sem estoque na API";
    outcome = "OUT_OF_STOCK";
  }

  await prisma.dynamicProduct.update({
    where: { id: product.id },
    data: {
      totalPrice: 0,
      attributes: {
        ...currentAttrs,
        vendedor: result?.merchantName || "Indisponivel",
      },
    },
  });

  return { logStatus, outcome, shouldRefreshPriceStats: false };
}

function incrementCounters(counters: RunCounters, outcome: PersistOutcome) {
  if (outcome === "UPDATED") counters.updatedOffers += 1;
  if (outcome === "FAILED") counters.failedOffers += 1;
  if (outcome === "OUT_OF_STOCK") counters.outOfStockOffers += 1;
  if (outcome === "EXCLUDED") counters.excludedOffers += 1;
}

async function finalizeGlobalRun(params: {
  runId: string;
  status: "success" | "error";
  counters: RunCounters;
  errorMessage?: string | null;
}) {
  await prisma.$executeRaw`
    UPDATE "GlobalPriceRefreshRun"
    SET
      "status" = ${params.status},
      "finishedAt" = NOW(),
      "totalOffers" = ${params.counters.totalOffers},
      "updatedOffers" = ${params.counters.updatedOffers},
      "failedOffers" = ${params.counters.failedOffers},
      "maxConsecutiveFailedOffers" = ${params.counters.maxConsecutiveFailedOffers},
      "outOfStockOffers" = ${params.counters.outOfStockOffers},
      "excludedOffers" = ${params.counters.excludedOffers},
      "errorMessage" = ${params.errorMessage ?? null},
      "updatedAt" = NOW()
    WHERE "id" = ${params.runId}
  `;
}

async function updateAmazonPrices() {
  console.log("Iniciando update global do sistema dinamico");

  const runId = crypto.randomUUID();
  const counters: RunCounters = {
    totalOffers: 0,
    updatedOffers: 0,
    failedOffers: 0,
    maxConsecutiveFailedOffers: 0,
    outOfStockOffers: 0,
    excludedOffers: 0,
  };
  let currentFailedStreak = 0;
  const statsRefreshProductIds = new Set<string>();

  await prisma.$executeRaw`
    INSERT INTO "GlobalPriceRefreshRun" (
      "id",
      "status",
      "startedAt",
      "totalOffers",
      "updatedOffers",
      "failedOffers",
      "maxConsecutiveFailedOffers",
      "outOfStockOffers",
      "excludedOffers",
      "createdAt",
      "updatedAt"
    )
    VALUES (
      ${runId},
      'running',
      NOW(),
      0,
      0,
      0,
      0,
      0,
      0,
      NOW(),
      NOW()
    )
  `;

  try {
    const dynamicProducts = await prisma.dynamicProduct.findMany({
      select: {
        id: true,
        asin: true,
        totalPrice: true,
        name: true,
        attributes: true,
      },
      orderBy: { name: "asc" },
    });

    counters.totalOffers = dynamicProducts.length;

    await prisma.$executeRaw`
      UPDATE "GlobalPriceRefreshRun"
      SET
        "totalOffers" = ${counters.totalOffers},
        "updatedAt" = NOW()
      WHERE "id" = ${runId}
    `;

    console.log(
      `Processando ${dynamicProducts.length} produtos em lotes de ${BATCH_SIZE}`
    );

    const recheckQueue: DynamicProductLite[] = [];

    for (let i = 0; i < dynamicProducts.length; i += BATCH_SIZE) {
      const chunk = dynamicProducts.slice(i, i + BATCH_SIZE);
      const asins = chunk
        .map((product) => product.asin)
        .filter((id): id is string => !!id);

      let apiResults: Record<string, PriceResult> = {};

      try {
        if (asins.length > 0) {
          apiResults = await fetchAmazonPricesBatch(asins);
        }
      } catch (error) {
        console.error("Erro ao buscar lote na API:", error);
        counters.failedOffers += chunk.length;
        currentFailedStreak += chunk.length;
        counters.maxConsecutiveFailedOffers = Math.max(
          counters.maxConsecutiveFailedOffers,
          currentFailedStreak
        );
        continue;
      }

      for (const product of chunk) {
        const asin = product.asin || "---";
        const result = apiResults[asin];

        if (result && result.status === "OK" && product.totalPrice > 0) {
          const variation =
            Math.abs(result.price - product.totalPrice) / product.totalPrice;

          if (variation > VARIATION_THRESHOLD) {
            console.log(
              `Suspeito ${(variation * 100).toFixed(1)}% | ${asin} | R$ ${product.totalPrice} -> R$ ${result.price} | enviado para rechecagem`
            );
            recheckQueue.push(product);
            continue;
          }
        }

        const { logStatus, outcome, shouldRefreshPriceStats } =
          await persistDynamicUpdate(product, result);
        incrementCounters(counters, outcome);
        if (shouldRefreshPriceStats) {
          statsRefreshProductIds.add(product.id);
        }
        if (outcome === "FAILED") {
          currentFailedStreak += 1;
          counters.maxConsecutiveFailedOffers = Math.max(
            counters.maxConsecutiveFailedOffers,
            currentFailedStreak
          );
        } else {
          currentFailedStreak = 0;
        }

        const logName = product.name.substring(0, 25).padEnd(25);
        const logStore = (result?.merchantName || "---")
          .substring(0, 15)
          .padEnd(15);

        console.log(
          `${logName} | ${asin.padEnd(10)} | loja ${logStore} | ${logStatus}`
        );
      }

      if (i + BATCH_SIZE < dynamicProducts.length) {
        await new Promise((resolve) => setTimeout(resolve, REQUEST_DELAY_MS));
      }
    }

    if (recheckQueue.length > 0) {
      console.log(`Rechecando ${recheckQueue.length} produtos suspeitos`);
      await new Promise((resolve) => setTimeout(resolve, RECHECK_DELAY_MS));

      for (let i = 0; i < recheckQueue.length; i += BATCH_SIZE) {
        const chunk = recheckQueue.slice(i, i + BATCH_SIZE);
        const asins = chunk
          .map((product) => product.asin)
          .filter((id): id is string => !!id);

        let apiResults: Record<string, PriceResult> = {};

        try {
          if (asins.length > 0) {
            apiResults = await fetchAmazonPricesBatch(asins);
          }
        } catch (error) {
          console.error("Erro no lote de rechecagem:", error);
          counters.failedOffers += chunk.length;
          currentFailedStreak += chunk.length;
          counters.maxConsecutiveFailedOffers = Math.max(
            counters.maxConsecutiveFailedOffers,
            currentFailedStreak
          );
          continue;
        }

        for (const product of chunk) {
          const asin = product.asin || "---";
          const result = apiResults[asin];

          const { logStatus, outcome, shouldRefreshPriceStats } =
            await persistDynamicUpdate(product, result);
          incrementCounters(counters, outcome);
          if (shouldRefreshPriceStats) {
            statsRefreshProductIds.add(product.id);
          }
          if (outcome === "FAILED") {
            currentFailedStreak += 1;
            counters.maxConsecutiveFailedOffers = Math.max(
              counters.maxConsecutiveFailedOffers,
              currentFailedStreak
            );
          } else {
            currentFailedStreak = 0;
          }

          const logName = product.name.substring(0, 25).padEnd(25);
          const logStore = (result?.merchantName || "---")
            .substring(0, 15)
            .padEnd(15);

          console.log(
            `[RECHECK] ${logName} | ${asin.padEnd(10)} | loja ${logStore} | ${logStatus}`
          );
        }

        if (i + BATCH_SIZE < recheckQueue.length) {
          await new Promise((resolve) => setTimeout(resolve, REQUEST_DELAY_MS));
        }
      }
    }

    if (statsRefreshProductIds.size > 0) {
      console.log(
        `Atualizando estatisticas de preco para ${statsRefreshProductIds.size} produtos`
      );
      await refreshDynamicProductPriceStatsBulk([...statsRefreshProductIds]);
    }

    await finalizeGlobalRun({
      runId,
      status: "success",
      counters,
    });

    await reconcileDynamicFallbackState();
    console.log("Atualizacao finalizada com sucesso");
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Erro desconhecido no update global";

    await finalizeGlobalRun({
      runId,
      status: "error",
      counters,
      errorMessage,
    });

    await reconcileDynamicFallbackState();
    throw error;
  }
}

updateAmazonPrices()
  .catch((error) => {
    console.error("Falha critica no script:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
