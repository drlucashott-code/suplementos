import {
  ChangeMessageVisibilityBatchCommand,
  DeleteMessageBatchCommand,
  ReceiveMessageCommand,
  SQSClient,
  type Message,
} from "@aws-sdk/client-sqs";
import {
  getAmazonItemsViaCreators,
  getAmazonItemAffiliateUrl,
  getAmazonItemMerchantName,
  getAmazonItemPrice,
  getAmazonItemProgramAndSavePrice,
  summarizeAmazonListings,
  getAmazonListingGroups,
} from "@/lib/amazonApiClient";
import {
  dedupeDynamicCatalogCategoryRefs,
  type DynamicCatalogCategoryRef,
} from "@/lib/dynamicCatalogCache";
import { enrichDynamicAttributesForCategory } from "@/lib/dynamicCategoryMetrics";
import { hasMeaningfulDynamicStateChange } from "@/lib/priceRefreshDiff";
import { prisma } from "@/lib/prisma";
import { refreshDynamicProductPriceStats } from "@/lib/dynamicPriceStats";
import { getPriceHistoryCanonicalDate } from "@/lib/dynamicPriceHistory";
import { writeDynamicDailyPriceHistoryIfChanged } from "@/lib/priceHistoryWrites";
import { applyDynamicRefreshOutcome, markDynamicRefreshAttempt } from "@/lib/priceRefreshSignals";
import { reservePriceRefreshBudget } from "@/lib/priceRefreshBudget";
import { getBlockedMerchantMatcher } from "@/lib/blockedMerchantsConfig";

const sqsClient = new SQSClient({ region: process.env.AWS_REGION || "us-east-2" });
const queueUrl =
  process.env.AWS_PRIORITY_QUEUE_URL || process.env.AWS_QUEUE_URL || "";
const AMAZON_PARTNER_TAG = process.env.AMAZON_PARTNER_TAG;
const AMAZON_LINK_TAG = process.env.AMAZON_LINK_TAG ?? AMAZON_PARTNER_TAG;
const BATCH_SIZE = 10;
const PRIORITY_HOURLY_REQUEST_LIMIT = Math.max(
  20,
  Number(process.env.AMAZON_PRIORITY_HOURLY_REQUEST_LIMIT ?? 240)
);
const PRIORITY_DAILY_REQUEST_LIMIT = Math.max(
  100,
  Number(process.env.AMAZON_PRIORITY_DAILY_REQUEST_LIMIT ?? 4000)
);

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

type ApiStatus = "OK" | "OUT_OF_STOCK" | "EXCLUDED";

type PriceResult = {
  price: number;
  merchantName: string;
  programAndSavePrice: number | null;
  status: ApiStatus;
};

export type PriorityRefreshRunSummaryV2 = {
  processedMessages: number;
  uniqueAsins: number;
  updatedProducts: number;
  skippedProducts: number;
  updatedAsins: string[];
  updatedCategoryRefs: DynamicCatalogCategoryRef[];
  runId?: string;
  reusedRunningRunId?: string;
  debug?: {
    batchAsins: string[];
    missingAsins: string[];
    resultsCount: number;
  };
};

const RUN_STALE_AFTER_MS = 10 * 60 * 1000;

function assertEnv() {
  if (!queueUrl) {
    throw new Error("AWS_PRIORITY_QUEUE_URL ou AWS_QUEUE_URL nao configurada.");
  }
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

function extractNotBeforeAtFromMessage(message: Message) {
  try {
    const body = JSON.parse(message.Body || "{}") as { notBeforeAt?: string | null };
    if (!body.notBeforeAt) return null;
    const date = new Date(body.notBeforeAt);
    return Number.isFinite(date.getTime()) ? date : null;
  } catch {
    return null;
  }
}

async function persistDynamicUpdate(params: {
  product: {
    id: string;
    name: string;
    totalPrice: number;
    attributes: unknown;
    availabilityStatus: string | null;
    category:
      | {
          name: string;
          slug: string;
          displayConfig: unknown;
        }
      | null;
  };
  result: PriceResult;
  affiliateUrl: string;
}) {
  const { product, result, affiliateUrl } = params;
  const currentAttributes =
    (product.attributes as Record<string, string | number | boolean | undefined>) || {};
  const nextAttributesBase: Record<string, string | number | boolean | undefined> = {
    ...currentAttributes,
  };
  delete nextAttributesBase.precoProgramaPoupe;
  delete nextAttributesBase.precoAssinatura;
  delete nextAttributesBase.precoSubscribeAndSave;

  nextAttributesBase.seller = result.merchantName || "Indisponivel";
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
      : Number(currentAttributes.totalPrice ?? 0) || product.totalPrice || 0;
  const priceForDerivedMetrics =
    result.status === "OK"
      ? result.price
      : result.status === "OUT_OF_STOCK" || result.status === "EXCLUDED"
        ? 0
        : fallbackTotalPrice;

  const attributes = product.category
    ? (enrichDynamicAttributesForCategory({
        category: product.category,
        rawDisplayConfig: product.category.displayConfig,
        productName: product.name,
        totalPrice: priceForDerivedMetrics,
        attributes: nextAttributesBase,
      }) as Record<string, string | number | boolean | undefined>)
    : nextAttributesBase;

  const now = new Date();
  const nextAvailabilityStatus =
    result.status === "OK" ? "IN_STOCK" : result.status === "OUT_OF_STOCK" ? "OUT_OF_STOCK" : "IN_STOCK";
  const hasMeaningfulChange = hasMeaningfulDynamicStateChange({
    currentPrice: product.totalPrice,
    nextPrice: result.status === "OK" ? result.price : result.status === "OUT_OF_STOCK" ? 0 : product.totalPrice,
    currentAvailabilityStatus: product.availabilityStatus,
    nextAvailabilityStatus,
    currentAttributes,
    nextAttributes: attributes,
  });

  await prisma.dynamicProduct.update({
    where: { id: product.id },
    data: {
      ...(hasMeaningfulChange
        ? {
            ...(result.status === "OK"
              ? { totalPrice: result.price }
              : result.status === "OUT_OF_STOCK" || result.status === "EXCLUDED"
                ? { totalPrice: 0 }
                : {}),
            url: affiliateUrl,
            attributes,
          }
        : {}),
      ...(result.status === "OK"
        ? {
            lastValidPrice: result.price,
            lastValidPriceAt: now,
            availabilityStatus: "IN_STOCK",
          }
        : result.status === "OUT_OF_STOCK"
          ? {
              availabilityStatus: "OUT_OF_STOCK",
            }
          : {}),
      lastAvailabilityCheckedAt: now,
    },
  });

  if (result.status === "OK") {
    const historyDate = getPriceHistoryCanonicalDate(now);
    const wroteHistory = await writeDynamicDailyPriceHistoryIfChanged({
      productId: product.id,
      date: historyDate,
      price: result.price,
    });

    if (wroteHistory) {
      await refreshDynamicProductPriceStats(product.id);
    }
  }
}

export async function processPriorityRefreshQueueV2(params?: { debug?: boolean }) {
  assertEnv();
  assertCreatorsModeForPriorityRefresh();
  const blockedMerchantMatcher = await getBlockedMerchantMatcher();

  const now = new Date();
  const staleBefore = new Date(now.getTime() - RUN_STALE_AFTER_MS);
  await prisma.priorityRefreshRun.updateMany({
    where: {
      status: "running",
      startedAt: {
        lt: staleBefore,
      },
      finishedAt: null,
    },
    data: {
      status: "error",
      finishedAt: now,
      errorMessage: "priority_run_stale_timeout",
    },
  });

  const existingRunningRun = await prisma.priorityRefreshRun.findFirst({
    where: {
      status: "running",
      finishedAt: null,
      startedAt: {
        gte: staleBefore,
      },
    },
    orderBy: {
      startedAt: "desc",
    },
    select: {
      id: true,
      startedAt: true,
    },
  });

  if (existingRunningRun) {
    return {
      processedMessages: 0,
      uniqueAsins: 0,
      updatedProducts: 0,
      skippedProducts: 0,
      updatedAsins: [],
      updatedCategoryRefs: [],
      runId: existingRunningRun.id,
      reusedRunningRunId: existingRunningRun.id,
    };
  }

  const receiveBatch = async () =>
    sqsClient.send(
      new ReceiveMessageCommand({
        QueueUrl: queueUrl,
        MaxNumberOfMessages: BATCH_SIZE,
        WaitTimeSeconds: 5,
      })
    );

  const initialBatch = await receiveBatch();
  const initialMessages = initialBatch.Messages || [];

  if (initialMessages.length === 0) {
    return {
      processedMessages: 0,
      uniqueAsins: 0,
      updatedProducts: 0,
      skippedProducts: 0,
      updatedAsins: [],
      updatedCategoryRefs: [],
    };
  }

  const runId = crypto.randomUUID();

  await prisma.priorityRefreshRun.create({
    data: {
      id: runId,
      source: "sqs_priority_v2",
      status: "running",
      startedAt: new Date(),
      processedMessages: 0,
      uniqueAsins: 0,
      updatedProducts: 0,
      skippedProducts: 0,
    },
  });

  const summary: PriorityRefreshRunSummaryV2 = {
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
    const processMessages = async (messages: Message[]) => {
      if (messages.length === 0) {
        return false;
      }

      const now = new Date();
      const deferredMessages = messages.filter((message) => {
        const notBeforeAt = extractNotBeforeAtFromMessage(message);
        return Boolean(notBeforeAt && notBeforeAt.getTime() > now.getTime());
      });

      if (deferredMessages.length > 0) {
        await sqsClient.send(
          new ChangeMessageVisibilityBatchCommand({
            QueueUrl: queueUrl,
            Entries: deferredMessages
              .filter((message) => message.ReceiptHandle)
              .map((message, index) => {
                const notBeforeAt = extractNotBeforeAtFromMessage(message)!;
                const visibilityTimeout = Math.max(
                  1,
                  Math.min(900, Math.ceil((notBeforeAt.getTime() - now.getTime()) / 1000))
                );

                return {
                  Id: `defer-${index}`,
                  ReceiptHandle: message.ReceiptHandle!,
                  VisibilityTimeout: visibilityTimeout,
                };
              }),
          })
        );
      }

      const eligibleMessages = messages.filter((message) => !deferredMessages.includes(message));
      if (eligibleMessages.length === 0) {
        return true;
      }

      summary.processedMessages += eligibleMessages.length;

      const messageAsins = eligibleMessages.map((message) => ({
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

      const budget = await reservePriceRefreshBudget({
        scope: "priority_dynamic_refresh",
        amount: uniqueAsins.length,
        hourlyLimit: PRIORITY_HOURLY_REQUEST_LIMIT,
        dailyLimit: PRIORITY_DAILY_REQUEST_LIMIT,
      });

      const budgetedAsins =
        budget.granted >= uniqueAsins.length ? uniqueAsins : uniqueAsins.slice(0, budget.granted);

      if (budget.granted <= 0) {
        console.warn(
          `[priority-budget] lote adiado por falta de orcamento (${budget.blockedBy ?? "budget"})`
        );
        return false;
      }

      summary.uniqueAsins += uniqueAsins.length;

      const products = await prisma.dynamicProduct.findMany({
        where: {
          asin: {
            in: budgetedAsins,
          },
        },
        select: {
          id: true,
          asin: true,
          name: true,
          totalPrice: true,
          attributes: true,
          availabilityStatus: true,
          category: {
            select: {
              name: true,
              slug: true,
              displayConfig: true,
              group: true,
            },
          },
        },
      });

      const productMap = new Map(products.map((product) => [product.asin, product]));
      const items = await getAmazonItemsViaCreators({
        itemIds: budgetedAsins,
        resources: [
          "ItemInfo.Title",
          "Offers.Listings.Type",
          "Offers.Listings.Price",
          "Offers.Listings.MerchantInfo",
          "Offers.Listings.IsBuyBoxWinner",
          "Offers.Listings.Availability",
        ],
      });

      const snapshots: Record<
        string,
        {
          asin: string;
          price: number;
          programAndSavePrice: number | null;
          merchantName: string | null;
          affiliateUrl: string;
          listingSummary: { totalListings: number };
        }
      > = {};

      for (const item of items) {
        const asin = item.ASIN;
        if (!asin) continue;
        const listingSummary = summarizeAmazonListings(getAmazonListingGroups(item));
        snapshots[asin] = {
          asin,
          price: getAmazonItemPrice(item),
          programAndSavePrice: getAmazonItemProgramAndSavePrice(item),
          merchantName: getAmazonItemMerchantName(item),
          affiliateUrl: getAmazonItemAffiliateUrl(item),
          listingSummary: { totalListings: listingSummary.totalListings },
        };
      }

      if (params?.debug) {
        summary.debug = {
          batchAsins: uniqueAsins,
          missingAsins: budgetedAsins.filter((asin) => !snapshots[asin]),
          resultsCount: Object.keys(snapshots).length,
        };
      }

      const successfullyUpdatedAsins = new Set<string>();
      const terminalSkippedAsins = new Set<string>();

      for (const asin of budgetedAsins) {
        const product = productMap.get(asin);
        const snapshot = snapshots[asin];

        if (!product) {
          summary.skippedProducts += 1;
          terminalSkippedAsins.add(asin);
          continue;
        }

        const refreshState = await markDynamicRefreshAttempt(asin);
        if (!refreshState) {
          summary.skippedProducts += 1;
          terminalSkippedAsins.add(asin);
          continue;
        }

        if (!snapshot) {
          // mantém mensagem na fila para retry
          continue;
        }

        const merchantName = snapshot.merchantName || "Desconhecido";
        let price = snapshot.price;
        let status: ApiStatus = price > 0 ? "OK" : "OUT_OF_STOCK";
      if (blockedMerchantMatcher.match(merchantName)) {
        status = "EXCLUDED";
        price = 0;
      }

        await persistDynamicUpdate({
          product,
          affiliateUrl:
            snapshot.affiliateUrl ||
            `https://www.amazon.com.br/dp/${asin}?tag=${AMAZON_LINK_TAG ?? ""}`,
          result: {
            price,
            merchantName,
            programAndSavePrice: snapshot.programAndSavePrice,
            status,
          },
        });
        await applyDynamicRefreshOutcome({
          productId: product.id,
          previousState: refreshState,
          success: status === "OK",
          priceChanged: price > 0 && Math.abs(price - product.totalPrice) > 0.009,
        });

        summary.updatedProducts += 1;
        summary.updatedAsins.push(asin);
        successfullyUpdatedAsins.add(asin);
        if (product.category?.group && product.category?.slug) {
          updatedCategoryRefs.set(`${product.category.group}:${product.category.slug}`, {
            group: product.category.group,
            slug: product.category.slug,
          });
        }
      }

      const deletableMessages = eligibleMessages.filter((message) => {
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
      return true;
    };

    await processMessages(initialMessages);

    while (true) {
      const batch = await receiveBatch();
      const messages = batch.Messages || [];
      const hadMessages = await processMessages(messages);
      if (!hadMessages) {
        break;
      }
    }

    summary.updatedCategoryRefs = dedupeDynamicCatalogCategoryRefs([
      ...updatedCategoryRefs.values(),
    ]);
    summary.updatedAsins = Array.from(new Set(summary.updatedAsins));
    summary.updatedProducts = summary.updatedAsins.length;

    await prisma.priorityRefreshRun.update({
      where: { id: runId },
      data: {
        status: "success",
        finishedAt: new Date(),
        processedMessages: summary.processedMessages,
        uniqueAsins: summary.uniqueAsins,
        updatedProducts: summary.updatedProducts,
        skippedProducts: summary.skippedProducts,
        updatedAsins: summary.updatedAsins,
      },
    });

    return summary;
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : typeof error === "string"
          ? error
          : JSON.stringify(error);

    await prisma.priorityRefreshRun.update({
      where: { id: runId },
      data: {
        status: "error",
        finishedAt: new Date(),
        processedMessages: summary.processedMessages,
        uniqueAsins: summary.uniqueAsins,
        updatedProducts: summary.updatedProducts,
        skippedProducts: summary.skippedProducts,
        updatedAsins: summary.updatedAsins,
        errorMessage,
      },
    });

    if (error instanceof Error) {
      throw error;
    }
    throw new Error(errorMessage);
  }
}
