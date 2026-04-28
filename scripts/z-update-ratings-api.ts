import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { getAmazonItems, type AmazonItem } from "../src/lib/amazonApiClient";

const prisma = new PrismaClient({
  log: ["error"],
});

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_BATCH_SIZE = Math.min(
  10,
  Math.max(1, Number(process.env.AMAZON_RATINGS_BATCH_SIZE ?? 5))
);
const REQUEST_DELAY_MIN_MS = Math.max(
  500,
  Number(process.env.AMAZON_RATINGS_DELAY_MIN_MS ?? 1500)
);
const REQUEST_DELAY_MAX_MS = Math.max(
  REQUEST_DELAY_MIN_MS,
  Number(process.env.AMAZON_RATINGS_DELAY_MAX_MS ?? 3000)
);
const RETRY_DELAY_MIN_MS = Math.max(
  2000,
  Number(process.env.AMAZON_RATINGS_RETRY_DELAY_MIN_MS ?? 5000)
);
const RETRY_DELAY_MAX_MS = Math.max(
  RETRY_DELAY_MIN_MS,
  Number(process.env.AMAZON_RATINGS_RETRY_DELAY_MAX_MS ?? 12000)
);
const MAX_FETCH_RETRIES = Math.max(
  1,
  Number(process.env.AMAZON_RATINGS_FETCH_RETRIES ?? 3)
);
const MAX_CONSECUTIVE_BATCH_FAILURES = Math.max(
  1,
  Number(process.env.AMAZON_RATINGS_MAX_CONSECUTIVE_FAILURES ?? 3)
);

type ProductRow = {
  id: string;
  asin: string;
  name: string;
  source: "dynamic" | "tracked";
};

type BatchOutcome = {
  returnedItems: Map<string, AmazonItem>;
  missingAsins: string[];
  hadFailure: boolean;
};

type RunCounters = {
  queued: number;
  updated: number;
  noRating: number;
  missing: number;
  failed: number;
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function randomBetween(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function sleepWithJitter(min: number, max: number) {
  await sleep(randomBetween(min, max));
}

function parseFlagValue(flag: string) {
  const normalizedFlag = flag.toUpperCase();
  const withEquals = process.argv.find((arg) =>
    arg.trim().toUpperCase().startsWith(`${normalizedFlag}=`)
  );
  if (withEquals) {
    return withEquals.split("=").slice(1).join("=").trim();
  }

  const index = process.argv.findIndex(
    (arg) => arg.trim().toUpperCase() === normalizedFlag
  );
  if (index >= 0 && process.argv[index + 1]) {
    return process.argv[index + 1].trim();
  }

  return "";
}

function parsePositiveNumberFlag(flag: string, fallback: number) {
  const raw = parseFlagValue(flag);
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function getFirstEnvValue(...keys: string[]) {
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }
  return "";
}

function assertAmazonApiConfig() {
  const provider = (process.env.AMAZON_API_PROVIDER ?? "paapi").trim().toLowerCase();

  if (provider === "creators") {
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
        "Credenciais da Creators API nao configuradas (AMAZON_CREATORS_CREDENTIAL_ID/SECRET)."
      );
    }

    return;
  }

  const accessKey = process.env.AMAZON_ACCESS_KEY?.trim();
  const secretKey = process.env.AMAZON_SECRET_KEY?.trim();
  const partnerTag = process.env.AMAZON_PARTNER_TAG?.trim();

  if (!accessKey || !secretKey || !partnerTag) {
    throw new Error(
      "Credenciais da Amazon API nao configuradas (AMAZON_ACCESS_KEY / AMAZON_SECRET_KEY / AMAZON_PARTNER_TAG)."
    );
  }
}

function normalizeAsin(value: string) {
  return value.trim().toUpperCase();
}

function extractRating(item: AmazonItem) {
  const rating =
    typeof item.CustomerReviews?.StarRating?.Value === "number"
      ? Number(item.CustomerReviews.StarRating.Value.toFixed(2))
      : null;
  const count =
    typeof item.CustomerReviews?.Count === "number"
      ? item.CustomerReviews.Count
      : null;

  return { rating, count };
}

async function fetchRatingsBatch(asins: string[], attempt = 1): Promise<BatchOutcome> {
  try {
    const items = await getAmazonItems({
      itemIds: asins,
      resources: [
        "ItemInfo.Title",
        "CustomerReviews.Count",
        "CustomerReviews.StarRating",
      ],
    });

    const returnedItems = new Map<string, AmazonItem>();

    for (const item of items) {
      const asin = item.ASIN ? normalizeAsin(item.ASIN) : "";
      if (asin) {
        returnedItems.set(asin, item);
      }
    }

    const missingAsins = asins.filter((asin) => !returnedItems.has(asin));

    return {
      returnedItems,
      missingAsins,
      hadFailure: false,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (attempt >= MAX_FETCH_RETRIES) {
      console.error(
        `[ratings-api] lote falhou apos ${attempt} tentativa(s): ${message}`
      );
      return {
        returnedItems: new Map<string, AmazonItem>(),
        missingAsins: [...asins],
        hadFailure: true,
      };
    }

    const delayMin = RETRY_DELAY_MIN_MS * attempt;
    const delayMax = RETRY_DELAY_MAX_MS * attempt;

    console.warn(
      `[ratings-api] erro no lote (${message}). Nova tentativa ${attempt + 1}/${MAX_FETCH_RETRIES} em ${Math.round(
        delayMax / 1000
      )}s.`
    );
    await sleepWithJitter(delayMin, delayMax);

    return fetchRatingsBatch(asins, attempt + 1);
  }
}

async function persistReturnedProducts(
  products: ProductRow[],
  returnedItems: Map<string, AmazonItem>,
  counters: RunCounters
) {
  const now = new Date();

  await Promise.all(
    products.map(async (product) => {
      const item = returnedItems.get(product.asin);
      if (!item) return;

      const { rating, count } = extractRating(item);
      const hasReviewData =
        typeof rating === "number" || (typeof count === "number" && count > 0);

      if (product.source === "dynamic") {
        await prisma.dynamicProduct.update({
          where: { id: product.id },
          data: {
            ratingAverage: hasReviewData ? rating : null,
            ratingCount: hasReviewData ? count : null,
            ratingsUpdatedAt: now,
          },
        });
      } else {
        await prisma.siteTrackedAmazonProduct.update({
          where: { id: product.id },
          data: {
            ratingAverage: hasReviewData ? rating : null,
            ratingCount: hasReviewData ? count : null,
            ratingsUpdatedAt: now,
          },
        });
      }

      if (hasReviewData) {
        counters.updated += 1;
        console.log(
          `[ok] [${product.source}] ${product.asin} | ${product.name.slice(0, 45)} | ${rating ?? "-"} estrela(s) | ${count ?? 0} reviews`
        );
      } else {
        counters.noRating += 1;
        console.log(
          `[ok] [${product.source}] ${product.asin} | ${product.name.slice(0, 45)} | sem reviews no retorno da API`
        );
      }
    })
  );
}

async function resolveProductsToProcess(singleAsin: string | null, staleDays: number, limit: number) {
  if (singleAsin) {
    const [dynamicProduct, trackedProduct] = await Promise.all([
      prisma.dynamicProduct.findUnique({
        where: { asin: singleAsin },
        select: { id: true, asin: true, name: true },
      }),
      prisma.siteTrackedAmazonProduct.findUnique({
        where: { asin: singleAsin },
        select: { id: true, asin: true, name: true },
      }),
    ]);

    return [
      ...(dynamicProduct ? [{ ...dynamicProduct, source: "dynamic" as const }] : []),
      ...(trackedProduct ? [{ ...trackedProduct, source: "tracked" as const }] : []),
    ];
  }

  const cutoff = new Date(Date.now() - staleDays * DAY_MS);

  const perSourceLimit = Math.max(1, limit);
  const [dynamicProducts, trackedProducts] = await Promise.all([
    prisma.dynamicProduct.findMany({
      where: {
        OR: [
          { ratingsUpdatedAt: null },
          {
            AND: [
              { ratingsUpdatedAt: { lt: cutoff } },
              {
                NOT: {
                  AND: [{ ratingAverage: null }, { ratingCount: null }],
                },
              },
            ],
          },
        ],
      },
      select: { id: true, asin: true, name: true, ratingsUpdatedAt: true, createdAt: true },
      orderBy: [{ ratingsUpdatedAt: "asc" }, { createdAt: "asc" }],
      take: perSourceLimit,
    }),
    prisma.siteTrackedAmazonProduct.findMany({
      where: {
        OR: [
          { ratingsUpdatedAt: null },
          {
            AND: [
              { ratingsUpdatedAt: { lt: cutoff } },
              {
                NOT: {
                  AND: [{ ratingAverage: null }, { ratingCount: null }],
                },
              },
            ],
          },
        ],
      },
      select: { id: true, asin: true, name: true, ratingsUpdatedAt: true, createdAt: true },
      orderBy: [{ ratingsUpdatedAt: "asc" }, { createdAt: "asc" }],
      take: perSourceLimit,
    }),
  ]);

  return [
    ...dynamicProducts.map((product) => ({
      id: product.id,
      asin: product.asin,
      name: product.name,
      source: "dynamic" as const,
      sortDate: product.ratingsUpdatedAt ?? product.createdAt,
    })),
    ...trackedProducts.map((product) => ({
      id: product.id,
      asin: product.asin,
      name: product.name,
      source: "tracked" as const,
      sortDate: product.ratingsUpdatedAt ?? product.createdAt,
    })),
  ]
    .sort((a, b) => a.sortDate.getTime() - b.sortDate.getTime())
    .slice(0, limit)
    .map(({ sortDate: _sortDate, ...product }) => product);
}

async function main() {
  assertAmazonApiConfig();

  const singleAsinFlag = parseFlagValue("--ASIN");
  const singleAsin = singleAsinFlag ? normalizeAsin(singleAsinFlag) : null;
  const staleDays = parsePositiveNumberFlag("--DAYS", 60);
  const limit = parsePositiveNumberFlag("--LIMIT", 500);
  const batchSize = Math.min(10, parsePositiveNumberFlag("--BATCH-SIZE", DEFAULT_BATCH_SIZE));

  const products = await resolveProductsToProcess(singleAsin, staleDays, limit);

  if (singleAsin && products.length === 0) {
    console.log(`[error] ASIN ${singleAsin} nao encontrado em DynamicProduct.`);
    return;
  }

  if (products.length === 0) {
    console.log("[ok] Nenhum produto pendente para atualizacao de ratings.");
    return;
  }

  const counters: RunCounters = {
    queued: products.length,
    updated: 0,
    noRating: 0,
    missing: 0,
    failed: 0,
  };

  console.log(
    `[start] Atualizacao de ratings via Amazon API para ${products.length} produto(s) em lotes de ${batchSize}.`
  );

  let consecutiveBatchFailures = 0;
  const retryQueue: ProductRow[] = [];

  for (let i = 0; i < products.length; i += batchSize) {
    const chunk = products.slice(i, i + batchSize);
    const asins = chunk.map((product) => product.asin);
    const batch = await fetchRatingsBatch(asins);

    if (batch.hadFailure) {
      consecutiveBatchFailures += 1;
      retryQueue.push(...chunk);
      counters.failed += chunk.length;
    } else {
      consecutiveBatchFailures = 0;
      await persistReturnedProducts(chunk, batch.returnedItems, counters);

      if (batch.missingAsins.length > 0) {
        const missingProducts = chunk.filter((product) =>
          batch.missingAsins.includes(product.asin)
        );
        retryQueue.push(...missingProducts);
        counters.missing += missingProducts.length;
        for (const product of missingProducts) {
          console.warn(
            `[warn] ${product.asin} | ${product.name.slice(0, 45)} | ASIN nao retornou no lote, vai para retry`
          );
        }
      }
    }

    if (consecutiveBatchFailures >= MAX_CONSECUTIVE_BATCH_FAILURES) {
      console.warn(
        `[stop] ${consecutiveBatchFailures} falhas consecutivas de lote. Encerrando a rodada para proteger a integracao.`
      );
      break;
    }

    if (i + batchSize < products.length) {
      await sleepWithJitter(REQUEST_DELAY_MIN_MS, REQUEST_DELAY_MAX_MS);
    }
  }

  if (retryQueue.length > 0) {
    console.log(`[retry] Reprocessando ${retryQueue.length} produto(s) em lotes unitarios.`);
    await sleepWithJitter(RETRY_DELAY_MIN_MS, RETRY_DELAY_MAX_MS);

    let retryFailures = 0;

    for (const product of retryQueue) {
      const batch = await fetchRatingsBatch([product.asin]);

      if (batch.hadFailure || !batch.returnedItems.has(product.asin)) {
        retryFailures += 1;
        console.warn(
          `[warn] ${product.asin} | ${product.name.slice(0, 45)} | sem retorno no retry`
        );
      } else {
        retryFailures = 0;
        await persistReturnedProducts([product], batch.returnedItems, counters);
      }

      if (retryFailures >= MAX_CONSECUTIVE_BATCH_FAILURES) {
        console.warn(
          `[stop] ${retryFailures} falhas consecutivas no retry. Encerrando para proteger a integracao.`
        );
        break;
      }

      await sleepWithJitter(REQUEST_DELAY_MIN_MS, REQUEST_DELAY_MAX_MS);
    }
  }

  console.log(
    `[done] Fila=${counters.queued} | atualizados=${counters.updated} | sem_review=${counters.noRating} | missing=${counters.missing} | falhas=${counters.failed}`
  );
}

main()
  .catch((error) => {
    console.error("[fatal] Erro fatal no sync de ratings via API:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
