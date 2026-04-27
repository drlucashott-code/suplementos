import "dotenv/config";
import { PrismaClient, Prisma } from "@prisma/client";
import { reconcileDynamicFallbackState } from "../src/lib/dynamicFallback";
import {
  enrichDynamicAttributesForCategory,
  type DynamicAttributesMap,
} from "../src/lib/dynamicCategoryMetrics";
import { refreshDynamicProductPriceStatsBulk } from "../src/lib/dynamicPriceStats";
import { getPriceHistoryCanonicalDate } from "../src/lib/dynamicPriceHistory";
import { refreshTrackedAmazonProductPriceStatsBulk } from "../src/lib/siteTrackedAmazonPriceStats";
import {
  fetchAmazonPriceSnapshots,
} from "../src/lib/amazonApiClient";
import {
  applyDynamicRefreshOutcome,
  applyTrackedRefreshOutcome,
  markDynamicRefreshAttemptById,
  markTrackedRefreshAttemptById,
} from "../src/lib/priceRefreshSignals";
import { reservePriceRefreshBudget } from "../src/lib/priceRefreshBudget";

const prisma = new PrismaClient();

const REQUEST_DELAY_MS = Number(process.env.AMAZON_GLOBAL_REQUEST_DELAY_MS ?? 1200);
const RECHECK_DELAY_MS = 5000;
const BATCH_SIZE = Math.min(
  Number(process.env.AMAZON_GLOBAL_BATCH_SIZE ?? 10),
  10
);
const VARIATION_THRESHOLD = 0.2;
const DB_RETRY_LIMIT = Math.max(
  1,
  Number(process.env.AMAZON_GLOBAL_DB_RETRY_LIMIT ?? 4)
);
const DB_RETRY_DELAY_MS = Math.max(
  250,
  Number(process.env.AMAZON_GLOBAL_DB_RETRY_DELAY_MS ?? 3000)
);
const MAX_DYNAMIC_PRODUCTS_PER_RUN = Math.max(
  1,
  Number(process.env.AMAZON_GLOBAL_MAX_PRODUCTS_PER_RUN ?? 300)
);
const MAX_TRACKED_PRODUCTS_PER_RUN = Math.max(
  1,
  Number(process.env.AMAZON_GLOBAL_MAX_TRACKED_PRODUCTS_PER_RUN ?? 150)
);
const GLOBAL_HOURLY_REQUEST_LIMIT = Math.max(
  10,
  Number(process.env.AMAZON_GLOBAL_HOURLY_REQUEST_LIMIT ?? 800)
);
const GLOBAL_DAILY_REQUEST_LIMIT = Math.max(
  50,
  Number(process.env.AMAZON_GLOBAL_DAILY_REQUEST_LIMIT ?? 12000)
);
const GLOBAL_OUT_OF_STOCK_SHARE = 0.15;

function getFirstEnvValue(...keys: string[]) {
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }
  return "";
}

function assertCreatorsModeForGlobalUpdate() {
  process.env.AMAZON_API_PROVIDER = "creators";
  process.env.AMAZON_DISABLE_PAAPI_FALLBACK = "1";

  const credentialId = getFirstEnvValue(
    "AMAZON_CREATORS_CREDENTIAL_ID",
    "CREATORS_API_CREDENTIAL_ID",
    "AMAZON_CREATORS_CLIENT_ID"
  );
  const credentialSecret = getFirstEnvValue(
    "AMAZON_CREATORS_CREDENTIAL_SECRET",
    "CREATORS_API_CREDENTIAL_SECRET",
    "AMAZON_CREATORS_CLIENT_SECRET"
  );

  if (!credentialId || !credentialSecret) {
    throw new Error(
      "Credenciais da Creators API nao configuradas no ambiente deste job (AMAZON_CREATORS_CREDENTIAL_ID/SECRET ou CREATORS_API_CREDENTIAL_ID/SECRET)."
    );
  }
}

function parseFlagValue(flag: string) {
  const withEquals = process.argv.find((arg) => arg.startsWith(`${flag}=`));
  if (withEquals) return withEquals.split("=").slice(1).join("=");
  const index = process.argv.indexOf(flag);
  if (index >= 0 && process.argv[index + 1]) return process.argv[index + 1];
  return "";
}

type ApiStatus = "OK" | "OUT_OF_STOCK" | "EXCLUDED" | "ERROR";

type PriceResult = {
  price: number;
  merchantName: string;
  programAndSavePrice: number | null;
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
  availabilityStatus: string | null;
  refreshTier: string | null;
  priorityScore: number | null;
  lastPrioritySignalAt: Date | null;
  lastInteractionAt: Date | null;
  lastRefreshAttemptAt: Date | null;
  lastPriceRefreshAt: Date | null;
  lastSuccessfulRefreshAt: Date | null;
  nextPriceRefreshAt: Date | null;
  nextPriorityEnqueueAt: Date | null;
  refreshFailCount: number | null;
  priceChangeFrequency: number | null;
  dataFreshnessScore: number | null;
  refreshLockUntil: Date | null;
  category:
    | {
        group: string;
        name: string;
        slug: string;
        displayConfig: Prisma.JsonValue;
      }
    | null;
};

type PersistDynamicUpdateResult = {
  logStatus: string;
  outcome: PersistOutcome;
  shouldRefreshPriceStats: boolean;
};

type TrackedProductLite = {
  id: string;
  asin: string;
  totalPrice: number;
  availabilityStatus: string | null;
  refreshTier: string | null;
  priorityScore: number | null;
  lastPrioritySignalAt: Date | null;
  lastInteractionAt: Date | null;
  lastRefreshAttemptAt: Date | null;
  lastPriceRefreshAt: Date | null;
  lastSuccessfulRefreshAt: Date | null;
  nextPriceRefreshAt: Date | null;
  nextPriorityEnqueueAt: Date | null;
  refreshFailCount: number | null;
  priceChangeFrequency: number | null;
  dataFreshnessScore: number | null;
  refreshLockUntil: Date | null;
  monitorCount: number | null;
};

type RecheckQueueItem = {
  product: DynamicProductLite;
  claimedState: ClaimedDynamicState;
};

type ClaimedDynamicState = NonNullable<Awaited<ReturnType<typeof markDynamicRefreshAttemptById>>>;
type ClaimedTrackedState = NonNullable<Awaited<ReturnType<typeof markTrackedRefreshAttemptById>>>;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableDatabaseError(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code?: unknown }).code ?? "").toLowerCase()
      : "";

  return (
    message.includes("can't reach database server") ||
    message.includes("connection") ||
    message.includes("timeout") ||
    message.includes("timed out") ||
    message.includes("socket") ||
    message.includes("econnreset") ||
    message.includes("econnrefused") ||
    message.includes("enotfound") ||
    message.includes("pooler") ||
    code === "p1001"
  );
}

async function withDatabaseRetry<T>(label: string, operation: () => Promise<T>): Promise<T> {
  let attempt = 0;
  let lastError: unknown;

  while (attempt < DB_RETRY_LIMIT) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      attempt += 1;

      if (!isRetryableDatabaseError(error) || attempt >= DB_RETRY_LIMIT) {
        throw error;
      }

      const delayMs = DB_RETRY_DELAY_MS * attempt;
      console.warn(
        `[db-retry] ${label} falhou (tentativa ${attempt}/${DB_RETRY_LIMIT}). Nova tentativa em ${Math.round(
          delayMs / 1000
        )}s. Motivo: ${error instanceof Error ? error.message : String(error)}`
      );
      await sleep(delayMs);
    }
  }

  throw lastError;
}

async function fetchAmazonPricesBatch(
  asins: string[]
): Promise<Record<string, PriceResult>> {
  if (asins.length === 0) return {};

  const snapshots = await fetchAmazonPriceSnapshots(asins);
  const results: Record<string, PriceResult> = {};

  for (const snapshot of Object.values(snapshots)) {
    let price = snapshot.price;
    const merchantName = snapshot.merchantName || "Desconhecido";
    let status: ApiStatus = price > 0 ? "OK" : "OUT_OF_STOCK";

    if (merchantName === "Loja Suplemento") {
      status = "EXCLUDED";
      price = 0;
    }

    results[snapshot.asin] = {
      price,
      merchantName,
      programAndSavePrice: snapshot.programAndSavePrice,
      status,
    };
  }

  return results;
}

async function persistDynamicUpdate(
  product: DynamicProductLite,
  result?: PriceResult
): Promise<PersistDynamicUpdateResult> {
  const currentAttrs = (product.attributes as DynamicAttributesMap) || {};
  const nextAttributesBase: DynamicAttributesMap = { ...currentAttrs };
  delete nextAttributesBase.precoProgramaPoupe;
  delete nextAttributesBase.precoAssinatura;
  delete nextAttributesBase.precoSubscribeAndSave;
  nextAttributesBase.vendedor = result?.merchantName || "Indisponivel";
  if (
    result?.status === "OK" &&
    typeof result.programAndSavePrice === "number" &&
    result.programAndSavePrice > 0
  ) {
    nextAttributesBase.precoProgramaPoupe = Number(result.programAndSavePrice.toFixed(2));
  }
  const priceForDerivedMetrics =
    result?.status === "OK"
      ? result.price
      : result?.status === "OUT_OF_STOCK" || result?.status === "EXCLUDED"
        ? 0
        : product.totalPrice;
  const nextAttributes = product.category
    ? enrichDynamicAttributesForCategory({
        category: product.category,
        rawDisplayConfig: product.category.displayConfig,
        productName: product.name,
        totalPrice: priceForDerivedMetrics,
        attributes: nextAttributesBase,
      })
    : nextAttributesBase;
  const today = getPriceHistoryCanonicalDate();

  if (result && result.status === "OK") {
    await withDatabaseRetry(`dynamicProduct.update:${product.id}`, async () =>
      prisma.dynamicProduct.update({
        where: { id: product.id },
        data: {
          totalPrice: result.price,
          availabilityStatus: "IN_STOCK",
          lastValidPrice: result.price,
          lastValidPriceAt: new Date(),
          attributes: nextAttributes as Prisma.InputJsonValue,
        },
      })
    );

    await withDatabaseRetry(`dynamicPriceHistory.upsert:${product.id}`, async () =>
      prisma.dynamicPriceHistory.upsert({
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
      })
    );

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

  await withDatabaseRetry(`dynamicProduct.update:${product.id}`, async () =>
    prisma.dynamicProduct.update({
      where: { id: product.id },
      data: {
        ...(result?.status === "OUT_OF_STOCK"
          ? {
              totalPrice: 0,
              availabilityStatus: "OUT_OF_STOCK",
            }
          : result?.status === "EXCLUDED"
            ? {
                totalPrice: 0,
              }
            : {}),
        attributes: nextAttributes as Prisma.InputJsonValue,
      },
    })
  );

  return {
    logStatus,
    outcome,
    shouldRefreshPriceStats: false,
  };
}

async function refreshMonitoredProducts() {
  const now = new Date();
  const trackedProducts = await withDatabaseRetry("siteTrackedAmazonProduct.query", async () =>
    prisma.$queryRaw<TrackedProductLite[]>(Prisma.sql`
      SELECT
        tp."id",
        tp."asin",
        tp."totalPrice",
        tp."availabilityStatus",
        tp."refreshTier",
        tp."priorityScore",
        tp."lastPrioritySignalAt",
        tp."lastInteractionAt",
        tp."lastRefreshAttemptAt",
        tp."lastPriceRefreshAt",
        tp."lastSuccessfulRefreshAt",
        tp."nextPriceRefreshAt",
        tp."nextPriorityEnqueueAt",
        tp."refreshFailCount",
        tp."priceChangeFrequency",
        tp."dataFreshnessScore",
        tp."refreshLockUntil",
        tp."monitorCount"
      FROM "SiteTrackedAmazonProduct" tp
      WHERE
        (tp."refreshLockUntil" IS NULL OR tp."refreshLockUntil" <= ${now})
        AND (tp."nextPriceRefreshAt" IS NULL OR tp."nextPriceRefreshAt" <= ${now})
      ORDER BY
        tp."dataFreshnessScore" DESC,
        tp."priorityScore" DESC,
        tp."nextPriceRefreshAt" ASC NULLS FIRST,
        tp."updatedAt" ASC
      LIMIT ${MAX_TRACKED_PRODUCTS_PER_RUN}
    `)
  );

  if (trackedProducts.length === 0) {
    return 0;
  }

  console.log(`Atualizando ${trackedProducts.length} produtos Amazon monitorados internamente`);
  const historyDate = getPriceHistoryCanonicalDate();
  const trackedProductIdsWithHistory = new Set<string>();

  for (let i = 0; i < trackedProducts.length; i += BATCH_SIZE) {
    const chunk = trackedProducts.slice(i, i + BATCH_SIZE);
    const asins = [...new Set(chunk.map((product) => product.asin).filter((asin) => !!asin))];
    const budget = await withDatabaseRetry("reservePriceRefreshBudget:tracked", async () =>
      reservePriceRefreshBudget({
        scope: "global_tracked_refresh",
        amount: asins.length,
        hourlyLimit: Math.max(10, Math.floor(GLOBAL_HOURLY_REQUEST_LIMIT * 0.35)),
        dailyLimit: Math.max(50, Math.floor(GLOBAL_DAILY_REQUEST_LIMIT * 0.35)),
      })
    );

    if (budget.granted <= 0) {
      console.warn(
        `Orcamento dos monitorados esgotado (${budget.blockedBy ?? "janela"}). Restante hora=${budget.hourlyRemaining} dia=${budget.dailyRemaining}`
      );
      break;
    }

    const allowedAsins = new Set(asins.slice(0, budget.granted));
    const budgetedChunk = chunk.filter((product) => allowedAsins.has(product.asin));
    const claimedTrackedProducts: Array<{
      product: TrackedProductLite;
      claimedState: ClaimedTrackedState;
    }> = [];

    for (const trackedProduct of budgetedChunk) {
      const claimedState = await withDatabaseRetry(
        `siteTrackedAmazonProduct.claim:${trackedProduct.id}`,
        async () => markTrackedRefreshAttemptById(trackedProduct.id)
      );
      if (claimedState) {
        claimedTrackedProducts.push({ product: trackedProduct, claimedState });
      }
    }

    if (claimedTrackedProducts.length === 0) {
      continue;
    }

    let apiResults: Record<string, PriceResult> = {};

    try {
      apiResults = await fetchAmazonPricesBatch(
        claimedTrackedProducts.map(({ product }) => product.asin)
      );
    } catch (error) {
      console.error("Erro ao atualizar lote de produtos monitorados:", error);
      continue;
    }

    for (const { product: trackedProduct, claimedState } of claimedTrackedProducts) {
      const result = apiResults[trackedProduct.asin];
      const totalPrice = result?.status === "OK" ? result.price : 0;
      const availabilityStatus = result?.status === "OK" ? "IN_STOCK" : "OUT_OF_STOCK";
      const programAndSavePrice =
        result?.status === "OK" && typeof result.programAndSavePrice === "number"
          ? result.programAndSavePrice
          : null;

      await withDatabaseRetry(`siteTrackedAmazonProduct.update:${trackedProduct.id}`, async () =>
        prisma.$executeRaw`
          UPDATE "SiteTrackedAmazonProduct"
          SET
            "totalPrice" = ${totalPrice},
            "availabilityStatus" = ${availabilityStatus},
            "programAndSavePrice" = ${programAndSavePrice},
            "lastSyncedAt" = NOW(),
            "updatedAt" = NOW()
          WHERE "id" = ${trackedProduct.id}
        `
      );

      if (totalPrice > 0) {
        trackedProductIdsWithHistory.add(trackedProduct.id);
        await withDatabaseRetry(`siteTrackedAmazonProductPriceHistory.upsert:${trackedProduct.id}`, async () =>
          prisma.$executeRaw`
            INSERT INTO "SiteTrackedAmazonProductPriceHistory" (
              "id",
              "trackedProductId",
              "price",
              "updateCount",
              "date",
              "createdAt",
              "updatedAt"
            )
            VALUES (
              ${crypto.randomUUID()},
              ${trackedProduct.id},
              ${totalPrice},
              1,
              ${historyDate},
              NOW(),
              NOW()
            )
            ON CONFLICT ("trackedProductId", "date")
            DO UPDATE SET
              "price" = EXCLUDED."price",
              "updateCount" = "SiteTrackedAmazonProductPriceHistory"."updateCount" + 1,
              "updatedAt" = NOW()
          `
        );
      }

      await withDatabaseRetry(`siteUserMonitoredProduct.sync:${trackedProduct.id}`, async () =>
        prisma.$executeRaw`
          UPDATE "SiteUserMonitoredProduct"
          SET
            "asin" = ${trackedProduct.asin},
            "totalPrice" = ${totalPrice},
            "availabilityStatus" = ${availabilityStatus},
            "programAndSavePrice" = ${programAndSavePrice},
            "lastSyncedAt" = NOW(),
            "updatedAt" = NOW()
          WHERE "trackedProductId" = ${trackedProduct.id}
        `
      );

      await withDatabaseRetry(`siteTrackedAmazonProduct.scheduler:${trackedProduct.id}`, async () =>
        applyTrackedRefreshOutcome({
          trackedProductId: trackedProduct.id,
          previousState: claimedState,
          success: Boolean(result && result.status === "OK"),
          priceChanged: totalPrice > 0 && Math.abs(totalPrice - trackedProduct.totalPrice) > 0.009,
          availabilityStatus,
        })
      );
    }

    if (i + BATCH_SIZE < trackedProducts.length) {
      await sleep(REQUEST_DELAY_MS);
    }
  }

  await refreshTrackedAmazonProductPriceStatsBulk([...trackedProductIdsWithHistory]);

  return trackedProducts.length;
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
  await withDatabaseRetry(`finalizeGlobalRun:${params.runId}`, async () =>
    prisma.$executeRaw`
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
    `
  );
}

async function updateAmazonPrices() {
  assertCreatorsModeForGlobalUpdate();
  console.log("Iniciando update global do sistema dinamico");
  const groupFilter = parseFlagValue("--group").trim().toLowerCase();
  const slugFilter = parseFlagValue("--slug").trim().toLowerCase();
  if (groupFilter || slugFilter) {
    console.log(
      `Filtro ativo: ${groupFilter ? `group=${groupFilter}` : ""}${
        groupFilter && slugFilter ? " | " : ""
      }${slugFilter ? `slug=${slugFilter}` : ""}`
    );
  }

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

  await withDatabaseRetry(`GlobalPriceRefreshRun.insert:${runId}`, async () =>
    prisma.$executeRaw`
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
    `
  );

  try {
    await withDatabaseRetry("DynamicProduct.bootstrapLastValidPrice", async () =>
      prisma.$executeRaw`
        UPDATE "DynamicProduct"
        SET
          "lastValidPrice" = "totalPrice",
          "lastValidPriceAt" = COALESCE("lastValidPriceAt", NOW()),
          "availabilityStatus" = COALESCE("availabilityStatus", 'IN_STOCK'),
          "updatedAt" = NOW()
        WHERE
          "totalPrice" > 0
          AND ("lastValidPrice" IS NULL OR "lastValidPrice" <= 0)
      `
    );

    const now = new Date();
    const baseDynamicWhere = {
      ...(groupFilter || slugFilter
        ? {
            category: {
              ...(groupFilter ? { group: groupFilter } : {}),
              ...(slugFilter ? { slug: slugFilter } : {}),
            },
          }
        : {}),
      AND: [
        {
          OR: [{ refreshLockUntil: null }, { refreshLockUntil: { lte: now } }],
        },
        {
          OR: [{ nextPriceRefreshAt: null }, { nextPriceRefreshAt: { lte: now } }],
        },
      ],
    } satisfies Prisma.DynamicProductWhereInput;

    const dynamicSelect = {
      id: true,
      asin: true,
      totalPrice: true,
      name: true,
      attributes: true,
      availabilityStatus: true,
      refreshTier: true,
      priorityScore: true,
      lastPrioritySignalAt: true,
      lastInteractionAt: true,
      lastRefreshAttemptAt: true,
      lastPriceRefreshAt: true,
      lastSuccessfulRefreshAt: true,
      nextPriceRefreshAt: true,
      nextPriorityEnqueueAt: true,
      refreshFailCount: true,
      priceChangeFrequency: true,
      dataFreshnessScore: true,
      refreshLockUntil: true,
      category: {
        select: {
          group: true,
          name: true,
          slug: true,
          displayConfig: true,
        },
      },
    } satisfies Prisma.DynamicProductSelect;

    const dynamicOrderBy = [
      { dataFreshnessScore: "desc" },
      { priorityScore: "desc" },
      { nextPriceRefreshAt: "asc" },
      { updatedAt: "asc" },
    ] satisfies Prisma.DynamicProductOrderByWithRelationInput[];

    const outOfStockLimit = Math.max(
      1,
      Math.floor(MAX_DYNAMIC_PRODUCTS_PER_RUN * GLOBAL_OUT_OF_STOCK_SHARE)
    );
    const inStockLimit = Math.max(1, MAX_DYNAMIC_PRODUCTS_PER_RUN - outOfStockLimit);

    const [preferredDynamicProducts, outOfStockDynamicProducts] = await withDatabaseRetry(
      "dynamicProduct.findMany",
      async () =>
        Promise.all([
          prisma.dynamicProduct.findMany({
            where: {
              ...baseDynamicWhere,
              OR: [
                { availabilityStatus: null },
                { availabilityStatus: { not: "OUT_OF_STOCK" } },
              ],
            },
            select: dynamicSelect,
            orderBy: dynamicOrderBy,
            take: inStockLimit,
          }),
          prisma.dynamicProduct.findMany({
            where: {
              ...baseDynamicWhere,
              availabilityStatus: "OUT_OF_STOCK",
            },
            select: dynamicSelect,
            orderBy: dynamicOrderBy,
            take: outOfStockLimit,
          }),
        ])
    );

    const preferredIds = new Set(preferredDynamicProducts.map((product) => product.id));
    const uniqueOutOfStockDynamicProducts = outOfStockDynamicProducts.filter(
      (product) => !preferredIds.has(product.id)
    );
    let dynamicProducts = [...preferredDynamicProducts, ...uniqueOutOfStockDynamicProducts];

    if (dynamicProducts.length < MAX_DYNAMIC_PRODUCTS_PER_RUN) {
      const remainingLimit = MAX_DYNAMIC_PRODUCTS_PER_RUN - dynamicProducts.length;
      const excludedIds = dynamicProducts.map((product) => product.id);
      const fallbackDynamicProducts = await withDatabaseRetry(
        "dynamicProduct.findMany:fallback",
        async () =>
          prisma.dynamicProduct.findMany({
            where: {
              ...baseDynamicWhere,
              ...(excludedIds.length > 0 ? { id: { notIn: excludedIds } } : {}),
            },
            select: dynamicSelect,
            orderBy: dynamicOrderBy,
            take: remainingLimit,
          })
      );
      dynamicProducts = [...dynamicProducts, ...fallbackDynamicProducts];
    }

    counters.totalOffers = dynamicProducts.length;

    await withDatabaseRetry(`GlobalPriceRefreshRun.totalOffers:${runId}`, async () =>
      prisma.$executeRaw`
        UPDATE "GlobalPriceRefreshRun"
        SET
          "totalOffers" = ${counters.totalOffers},
          "updatedAt" = NOW()
        WHERE "id" = ${runId}
      `
    );

    console.log(
      `Processando ${dynamicProducts.length} produtos em lotes de ${BATCH_SIZE}`
    );

    const recheckQueue: RecheckQueueItem[] = [];
    let globalBudgetStoppedEarly = false;

    for (let i = 0; i < dynamicProducts.length; i += BATCH_SIZE) {
      const chunk = dynamicProducts.slice(i, i + BATCH_SIZE);
      const asins = chunk
        .map((product) => product.asin)
        .filter((id): id is string => !!id);

      const budget = await withDatabaseRetry("reservePriceRefreshBudget:global", async () =>
        reservePriceRefreshBudget({
          scope: "global_dynamic_refresh",
          amount: asins.length,
          hourlyLimit: GLOBAL_HOURLY_REQUEST_LIMIT,
          dailyLimit: GLOBAL_DAILY_REQUEST_LIMIT,
        })
      );

      if (budget.granted <= 0) {
        console.warn(
          `Orcamento do update global esgotado (${budget.blockedBy ?? "janela"}). Restante hora=${budget.hourlyRemaining} dia=${budget.dailyRemaining}`
        );
        globalBudgetStoppedEarly = true;
        break;
      }

      const allowedAsins = new Set(asins.slice(0, budget.granted));
      const budgetedChunk = chunk.filter((product) => product.asin && allowedAsins.has(product.asin));
      const claimedProducts: Array<{
        product: DynamicProductLite;
        claimedState: ClaimedDynamicState;
      }> = [];

      for (const product of budgetedChunk) {
        const claimedState = await withDatabaseRetry(
          `dynamicProduct.claim:${product.id}`,
          async () => markDynamicRefreshAttemptById(product.id)
        );
        if (claimedState) {
          claimedProducts.push({ product, claimedState });
        }
      }

      if (claimedProducts.length === 0) {
        continue;
      }

      let apiResults: Record<string, PriceResult> = {};

      try {
        if (claimedProducts.length > 0) {
          apiResults = await fetchAmazonPricesBatch(
            claimedProducts
              .map(({ product }) => product.asin)
              .filter((asin): asin is string => Boolean(asin))
          );
        }
      } catch (error) {
        console.error("Erro ao buscar lote na API:", error);
        counters.failedOffers += claimedProducts.length;
        currentFailedStreak += claimedProducts.length;
        counters.maxConsecutiveFailedOffers = Math.max(
          counters.maxConsecutiveFailedOffers,
          currentFailedStreak
        );
        continue;
      }

      for (const { product, claimedState } of claimedProducts) {
        const asin = product.asin || "---";
        const result = apiResults[asin];

        if (result && result.status === "OK" && product.totalPrice > 0) {
          const variation =
            Math.abs(result.price - product.totalPrice) / product.totalPrice;

          if (variation > VARIATION_THRESHOLD) {
            console.log(
              `Suspeito ${(variation * 100).toFixed(1)}% | ${asin} | R$ ${product.totalPrice} -> R$ ${result.price} | enviado para rechecagem`
            );
            recheckQueue.push({ product, claimedState });
            continue;
          }
        }

        const { logStatus, outcome, shouldRefreshPriceStats } =
          await persistDynamicUpdate(product, result);
        await withDatabaseRetry(`dynamicProduct.scheduler:${product.id}`, async () =>
          applyDynamicRefreshOutcome({
            productId: product.id,
            previousState: claimedState,
            success: Boolean(result && result.status === "OK"),
            priceChanged:
              Boolean(result && result.status === "OK") &&
              Math.abs((result?.price ?? 0) - product.totalPrice) > 0.009,
            availabilityStatus:
              result?.status === "OK"
                ? "IN_STOCK"
                : result?.status === "OUT_OF_STOCK"
                  ? "OUT_OF_STOCK"
                  : product.availabilityStatus,
          })
        );
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

      if (i + BATCH_SIZE < dynamicProducts.length && !globalBudgetStoppedEarly) {
        await new Promise((resolve) => setTimeout(resolve, REQUEST_DELAY_MS));
      }
    }

    if (recheckQueue.length > 0) {
      console.log(`Rechecando ${recheckQueue.length} produtos suspeitos`);
      await new Promise((resolve) => setTimeout(resolve, RECHECK_DELAY_MS));

      for (let i = 0; i < recheckQueue.length; i += BATCH_SIZE) {
        const chunk = recheckQueue.slice(i, i + BATCH_SIZE);
        const asins = chunk
          .map((entry) => entry.product.asin)
          .filter((id): id is string => !!id);

        const budget = await withDatabaseRetry("reservePriceRefreshBudget:global.recheck", async () =>
          reservePriceRefreshBudget({
            scope: "global_dynamic_refresh",
            amount: asins.length,
            hourlyLimit: GLOBAL_HOURLY_REQUEST_LIMIT,
            dailyLimit: GLOBAL_DAILY_REQUEST_LIMIT,
          })
        );

        if (budget.granted <= 0) {
          console.warn(
            `Orcamento do update global esgotado na rechecagem (${budget.blockedBy ?? "janela"}).`
          );
          break;
        }

        const allowedAsins = new Set(asins.slice(0, budget.granted));
        const budgetedChunk = chunk.filter(
          (entry) => entry.product.asin && allowedAsins.has(entry.product.asin)
        );

        let apiResults: Record<string, PriceResult> = {};

        try {
          if (allowedAsins.size > 0) {
            apiResults = await fetchAmazonPricesBatch([...allowedAsins]);
          }
        } catch (error) {
          console.error("Erro no lote de rechecagem:", error);
          counters.failedOffers += budgetedChunk.length;
          currentFailedStreak += budgetedChunk.length;
          counters.maxConsecutiveFailedOffers = Math.max(
            counters.maxConsecutiveFailedOffers,
            currentFailedStreak
          );
          continue;
        }

        for (const { product, claimedState } of budgetedChunk) {
          const asin = product.asin || "---";
          const result = apiResults[asin];

          const { logStatus, outcome, shouldRefreshPriceStats } =
            await persistDynamicUpdate(product, result);
          await withDatabaseRetry(`dynamicProduct.scheduler.recheck:${product.id}`, async () =>
            applyDynamicRefreshOutcome({
              productId: product.id,
              previousState: claimedState,
              success: Boolean(result && result.status === "OK"),
              priceChanged:
                Boolean(result && result.status === "OK") &&
                Math.abs((result?.price ?? 0) - product.totalPrice) > 0.009,
              availabilityStatus:
                result?.status === "OK"
                  ? "IN_STOCK"
                  : result?.status === "OUT_OF_STOCK"
                    ? "OUT_OF_STOCK"
                    : product.availabilityStatus,
            })
          );
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
      await withDatabaseRetry("refreshDynamicProductPriceStatsBulk", async () =>
        refreshDynamicProductPriceStatsBulk([...statsRefreshProductIds])
      );
    }

    await refreshMonitoredProducts();

    await finalizeGlobalRun({
      runId,
      status: "success",
      counters,
    });

    await withDatabaseRetry("reconcileDynamicFallbackState:success", async () =>
      reconcileDynamicFallbackState()
    );
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

    await withDatabaseRetry("reconcileDynamicFallbackState:error", async () =>
      reconcileDynamicFallbackState()
    );
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
