import {
  DeleteMessageBatchCommand,
  ReceiveMessageCommand,
  SQSClient,
  type Message,
} from "@aws-sdk/client-sqs";
import {
  getAmazonItemAffiliateUrl,
  fetchAmazonPriceSnapshots,
  type AmazonItem,
} from "@/lib/amazonApiClient";
import {
  dedupeDynamicCatalogCategoryRefs,
  type DynamicCatalogCategoryRef,
} from "@/lib/dynamicCatalogCache";
import { enrichDynamicAttributesForCategory } from "@/lib/dynamicCategoryMetrics";
import { prisma } from "@/lib/prisma";
import { refreshDynamicProductPriceStats } from "@/lib/dynamicPriceStats";
import { getPriceHistoryCanonicalDate } from "@/lib/dynamicPriceHistory";

const sqsClient = new SQSClient({ region: process.env.AWS_REGION || "us-east-2" });
const queueUrl =
  process.env.AWS_PRIORITY_QUEUE_URL || process.env.AWS_QUEUE_URL || "";

const AMAZON_PARTNER_TAG = process.env.AMAZON_PARTNER_TAG;
const AMAZON_LINK_TAG = process.env.AMAZON_LINK_TAG ?? AMAZON_PARTNER_TAG;
const BATCH_SIZE = 10;
const RETRY_MISSING_ASINS_DELAY_MS = 500;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getFirstEnvValue(...keys: string[]) {
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }
  return "";
}

function assertCreatorsModeForPriorityRefresh() {
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
      "Priority refresh sem credenciais da Creators API (AMAZON_CREATORS_CREDENTIAL_ID/SECRET)."
    );
  }
}

type PriceResult = {
  asin: string;
  price: number;
  programAndSavePrice: number | null;
  merchantName: string | null;
  affiliateUrl: string;
  ratingAverage: number | null;
  ratingCount: number | null;
  status: "OK" | "OUT_OF_STOCK" | "EXCLUDED";
};

export type PriorityRefreshRunSummary = {
  processedMessages: number;
  uniqueAsins: number;
  updatedProducts: number;
  skippedProducts: number;
  updatedAsins: string[];
  updatedCategoryRefs: DynamicCatalogCategoryRef[];
  debug?: {
    batchAsins: string[];
    missingAsins: string[];
    resultsCount: number;
  };
  runId?: string;
};

function assertEnv() {
  if (!queueUrl) {
    throw new Error("AWS_PRIORITY_QUEUE_URL ou AWS_QUEUE_URL nao configurada.");
  }
}

async function fetchAmazonPricesBatch(
  asins: string[]
): Promise<Record<string, PriceResult>> {
  if (asins.length === 0) return {};

  const snapshots = await fetchAmazonPriceSnapshots(asins);
  const results: Record<string, PriceResult> = {};

  for (const snapshot of Object.values(snapshots)) {
    const asin = snapshot.asin;
    let price = snapshot.price;
    let status: PriceResult["status"] = price > 0 ? "OK" : "OUT_OF_STOCK";

    if (snapshot.merchantName === "Loja Suplemento") {
      status = "EXCLUDED";
      price = 0;
    }

    results[asin] = {
      asin,
      price,
      programAndSavePrice: snapshot.programAndSavePrice,
      merchantName: snapshot.merchantName,
      affiliateUrl:
        snapshot.affiliateUrl ||
        `https://www.amazon.com.br/dp/${asin}?tag=${AMAZON_LINK_TAG}`,
      ratingAverage: null,
      ratingCount: null,
      status,
    };
  }

  return results;
}

async function refetchMissingAsins(
  missingAsins: string[]
): Promise<Record<string, PriceResult>> {
  const recovered: Record<string, PriceResult> = {};

  for (const asin of missingAsins) {
    try {
      const single = await fetchAmazonPricesBatch([asin]);
      if (single[asin]) {
        recovered[asin] = single[asin];
      }
    } catch (error) {
      console.warn(
        `[priority] falha ao reconsultar ASIN ${asin}: ${
          error instanceof Error ? error.message : "erro desconhecido"
        }`
      );
    }
    await sleep(RETRY_MISSING_ASINS_DELAY_MS);
  }

  return recovered;
}

function extractAsinFromMessage(message: Message) {
  try {
    const body = JSON.parse(message.Body || "{}") as { asin?: string };
    const asin = body.asin?.trim().toUpperCase() || "";
    return /^[A-Z0-9]{10}$/.test(asin) ? asin : null;
  } catch {
    return null;
  }
}

async function persistDynamicUpdate(productId: string, result: PriceResult) {
  const now = new Date();
  const historyDate = getPriceHistoryCanonicalDate(now);
  const current = await prisma.dynamicProduct.findUnique({
    where: { id: productId },
    select: {
      name: true,
      attributes: true,
      category: {
        select: {
          name: true,
          slug: true,
          displayConfig: true,
        },
      },
    },
  });

  if (!current) {
    return false;
  }

  const currentAttributes =
    (current.attributes as Record<string, string | number | boolean | undefined>) || {};
  const nextAttributesBase: Record<string, string | number | boolean | undefined> = {
    ...currentAttributes,
  };
  delete nextAttributesBase.precoProgramaPoupe;
  delete nextAttributesBase.precoAssinatura;
  delete nextAttributesBase.precoSubscribeAndSave;

  nextAttributesBase.vendedor = result.merchantName ?? "Indisponivel";
  if (
    result.status === "OK" &&
    typeof result.programAndSavePrice === "number" &&
    result.programAndSavePrice > 0
  ) {
    nextAttributesBase.precoProgramaPoupe = Number(result.programAndSavePrice.toFixed(2));
  }

  const fallbackTotalPrice =
    typeof currentAttributes.totalPrice === "number"
      ? currentAttributes.totalPrice
      : Number(currentAttributes.totalPrice ?? 0) || 0;
  const priceForDerivedMetrics =
    result.status === "OK"
      ? result.price
      : result.status === "OUT_OF_STOCK" || result.status === "EXCLUDED"
        ? 0
        : fallbackTotalPrice;
  const attributes = current.category
    ? (enrichDynamicAttributesForCategory({
        category: current.category,
        rawDisplayConfig: current.category.displayConfig,
        productName: current.name,
        totalPrice: priceForDerivedMetrics,
        attributes: nextAttributesBase,
      }) as Record<string, string | number | boolean | undefined>)
    : nextAttributesBase;

  await prisma.dynamicProduct.update({
    where: { id: productId },
    data: {
      ...(result.status === "OK"
        ? { totalPrice: result.price }
        : result.status === "OUT_OF_STOCK" || result.status === "EXCLUDED"
          ? { totalPrice: 0 }
          : {}),
      url: result.affiliateUrl,
      attributes,
    },
  });

  if (result.status === "OK") {
    await prisma.$executeRaw`
      UPDATE "DynamicProduct"
      SET
        "lastValidPrice" = ${result.price},
        "lastValidPriceAt" = ${now},
        "availabilityStatus" = 'IN_STOCK',
        "lastAvailabilityCheckedAt" = ${now},
        "updatedAt" = NOW()
      WHERE "id" = ${productId}
    `;
  } else if (result.status === "OUT_OF_STOCK") {
    await prisma.$executeRaw`
      UPDATE "DynamicProduct"
      SET
        "availabilityStatus" = 'OUT_OF_STOCK',
        "lastAvailabilityCheckedAt" = ${now},
        "updatedAt" = NOW()
      WHERE "id" = ${productId}
    `;
  } else {
    await prisma.$executeRaw`
      UPDATE "DynamicProduct"
      SET
        "lastAvailabilityCheckedAt" = ${now},
        "updatedAt" = NOW()
      WHERE "id" = ${productId}
    `;
  }

  if (result.status === "OK") {
    await prisma.dynamicPriceHistory.upsert({
      where: {
        productId_date: {
          productId,
          date: historyDate,
        },
      },
      update: {
        price: result.price,
        updateCount: { increment: 1 },
      },
      create: {
        productId,
        price: result.price,
        date: historyDate,
      },
    });

    await refreshDynamicProductPriceStats(productId);
  }

  return true;
}

export async function processPriorityRefreshQueue(params?: { debug?: boolean }) {
  assertEnv();
  assertCreatorsModeForPriorityRefresh();

  const runId = crypto.randomUUID();

  await prisma.$executeRaw`
    INSERT INTO "PriorityRefreshRun" (
      "id",
      "source",
      "status",
      "startedAt",
      "createdAt",
      "updatedAt",
      "processedMessages",
      "uniqueAsins",
      "updatedProducts",
      "skippedProducts"
    )
    VALUES (
      ${runId},
      'sqs_priority',
      'running',
      NOW(),
      NOW(),
      NOW(),
      0,
      0,
      0,
      0
    )
  `;

  const summary: PriorityRefreshRunSummary = {
    processedMessages: 0,
    uniqueAsins: 0,
    updatedProducts: 0,
    skippedProducts: 0,
    updatedAsins: [],
    updatedCategoryRefs: [],
    runId,
  };
  const updatedCategoryRefs = new Map<string, DynamicCatalogCategoryRef>();

  try {
    while (true) {
      const batch = await sqsClient.send(
        new ReceiveMessageCommand({
          QueueUrl: queueUrl,
          MaxNumberOfMessages: BATCH_SIZE,
          WaitTimeSeconds: 5,
        })
      );

      const messages = batch.Messages || [];
      if (messages.length === 0) {
        break;
      }

      summary.processedMessages += messages.length;

      const messageAsins = messages.map((message) => ({
        message,
        asin: extractAsinFromMessage(message),
      }));
      const invalidMessages = messageAsins.filter((entry) => !entry.asin);
      if (invalidMessages.length > 0) {
        summary.skippedProducts += invalidMessages.length;
      }

      const uniqueAsins = Array.from(
        new Set(messageAsins.map((entry) => entry.asin).filter(Boolean))
      ) as string[];

      summary.uniqueAsins += uniqueAsins.length;

      const products = await prisma.dynamicProduct.findMany({
        where: {
          asin: {
            in: uniqueAsins,
          },
        },
        select: {
          id: true,
          asin: true,
          name: true,
          category: {
            select: {
              group: true,
              slug: true,
            },
          },
        },
      });

      const productMap = new Map(products.map((product) => [product.asin, product]));
      const results = await fetchAmazonPricesBatch(uniqueAsins);
      const successfullyUpdatedAsins = new Set<string>();
      const terminalSkippedAsins = new Set<string>();

      const missingAsins = uniqueAsins.filter((asin) => !results[asin]);
      if (missingAsins.length > 0) {
        const recovered = await refetchMissingAsins(missingAsins);
        for (const [asin, value] of Object.entries(recovered)) {
          results[asin] = value;
        }
      }
      if (params?.debug) {
        summary.debug = {
          batchAsins: uniqueAsins,
          missingAsins: uniqueAsins.filter((asin) => !results[asin]),
          resultsCount: Object.keys(results).length,
        };
      }

      for (const asin of uniqueAsins) {
        const product = productMap.get(asin);
        const result = results[asin];

        if (!product) {
          const reason = "produto nao encontrado no banco";
          console.warn(`[priority] ASIN ${asin} pulado: ${reason}`);
          summary.skippedProducts += 1;
          terminalSkippedAsins.add(asin);
          continue;
        }

        if (!result) {
          const reason = "API nao retornou item/preco (mantido na fila para retry)";
          console.warn(`[priority] ASIN ${asin} adiado: ${reason}`);
          continue;
        }
        const updated = await persistDynamicUpdate(product.id, result);
        if (updated) {
          summary.updatedProducts += 1;
          summary.updatedAsins.push(asin);
          successfullyUpdatedAsins.add(asin);
          if (product.category?.group && product.category?.slug) {
            updatedCategoryRefs.set(`${product.category.group}:${product.category.slug}`, {
              group: product.category.group,
              slug: product.category.slug,
            });
          }
        } else {
          summary.skippedProducts += 1;
        }
      }

      const deletableMessages = messages.filter((message) => {
        if (!message.ReceiptHandle) return false;
        const asin = extractAsinFromMessage(message);
        if (!asin) return true;
        return (
          successfullyUpdatedAsins.has(asin) ||
          terminalSkippedAsins.has(asin)
        );
      });
      if (deletableMessages.length > 0) {
        await sqsClient.send(
          new DeleteMessageBatchCommand({
            QueueUrl: queueUrl,
            Entries: deletableMessages.map((message, index) => ({
              Id: `msg-${index}`,
              ReceiptHandle: message.ReceiptHandle!,
            })),
          })
        );
      }
    }

      summary.updatedCategoryRefs = dedupeDynamicCatalogCategoryRefs([
        ...updatedCategoryRefs.values(),
      ]);
      summary.updatedAsins = Array.from(new Set(summary.updatedAsins));
      summary.updatedProducts = summary.updatedAsins.length;

      await prisma.$executeRaw`
      UPDATE "PriorityRefreshRun"
      SET
        "status" = 'success',
        "finishedAt" = NOW(),
        "processedMessages" = ${summary.processedMessages},
        "uniqueAsins" = ${summary.uniqueAsins},
        "updatedProducts" = ${summary.updatedProducts},
        "skippedProducts" = ${summary.skippedProducts},
        "updatedAsins" = ${JSON.stringify(summary.updatedAsins)}::jsonb,
        "updatedAt" = NOW()
      WHERE "id" = ${runId}
    `;

    return summary;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Erro desconhecido no processamento";

    await prisma.$executeRaw`
      UPDATE "PriorityRefreshRun"
      SET
        "status" = 'error',
        "finishedAt" = NOW(),
        "processedMessages" = ${summary.processedMessages},
        "uniqueAsins" = ${summary.uniqueAsins},
        "updatedProducts" = ${summary.updatedProducts},
        "skippedProducts" = ${summary.skippedProducts},
        "updatedAsins" = ${JSON.stringify(summary.updatedAsins)}::jsonb,
        "errorMessage" = ${errorMessage},
        "updatedAt" = NOW()
      WHERE "id" = ${runId}
    `;

    throw error;
  }
}
