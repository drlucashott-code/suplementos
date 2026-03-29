import {
  DeleteMessageBatchCommand,
  ReceiveMessageCommand,
  SQSClient,
  type Message,
} from "@aws-sdk/client-sqs";
import {
  getAmazonItemAffiliateUrl,
  getAmazonItemMerchantName,
  getAmazonItemPrice,
  getAmazonItems,
  type AmazonItem,
} from "@/lib/amazonApiClient";
import { prisma } from "@/lib/prisma";
import { refreshDynamicProductPriceStats } from "@/lib/dynamicPriceStats";

const sqsClient = new SQSClient({ region: process.env.AWS_REGION || "us-east-2" });
const queueUrl =
  process.env.AWS_PRIORITY_QUEUE_URL || process.env.AWS_QUEUE_URL || "";

const AMAZON_PARTNER_TAG = process.env.AMAZON_PARTNER_TAG;
const BATCH_SIZE = 10;

type PriceResult = {
  asin: string;
  price: number;
  merchantName: string | null;
  affiliateUrl: string;
  ratingAverage: number | null;
  ratingCount: number | null;
  status: "OK" | "OUT_OF_STOCK";
};

export type PriorityRefreshRunSummary = {
  processedMessages: number;
  uniqueAsins: number;
  updatedProducts: number;
  skippedProducts: number;
  updatedAsins: string[];
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

  const items = await getAmazonItems({
    itemIds: asins,
    resources: [
      "Offers.Listings.Price",
      "OffersV2.Listings.Price",
      "Offers.Listings.MerchantInfo",
      "OffersV2.Listings.MerchantInfo",
      "CustomerReviews.Count",
      "CustomerReviews.StarRating",
    ],
  });

  const results: Record<string, PriceResult> = {};

  for (const item of items) {
    const asin = item.ASIN || "";
    if (!asin) continue;

    const price = getAmazonItemPrice(item);
    const merchantName = getAmazonItemMerchantName(item);

    results[asin] = {
      asin,
      price,
      merchantName,
      affiliateUrl:
        getAmazonItemAffiliateUrl(item) ||
        `https://www.amazon.com.br/dp/${asin}?tag=${AMAZON_PARTNER_TAG}`,
      ratingAverage: item.CustomerReviews?.StarRating?.Value ?? null,
      ratingCount: item.CustomerReviews?.Count ?? null,
      status: price > 0 ? "OK" : "OUT_OF_STOCK",
    };
  }

  return results;
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
  const current = await prisma.dynamicProduct.findUnique({
    where: { id: productId },
    select: {
      attributes: true,
    },
  });

  if (!current) {
    return false;
  }

  const attributes = {
    ...(current.attributes as Record<string, string | number | boolean | undefined>),
    seller:
      result.status === "OUT_OF_STOCK"
        ? "Indisponivel"
        : (result.merchantName ?? undefined),
    asin: result.asin,
  };

  await prisma.dynamicProduct.update({
    where: { id: productId },
    data: {
      totalPrice: result.price,
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
  } else {
    await prisma.$executeRaw`
      UPDATE "DynamicProduct"
      SET
        "availabilityStatus" = 'OUT_OF_STOCK',
        "lastAvailabilityCheckedAt" = ${now},
        "updatedAt" = NOW()
      WHERE "id" = ${productId}
    `;
  }

  const lastHistory = await prisma.dynamicPriceHistory.findFirst({
    where: { productId },
    orderBy: { createdAt: "desc" },
  });

  const shouldCreateHistory =
    !lastHistory ||
    lastHistory.price !== result.price ||
    lastHistory.createdAt.toDateString() !== new Date().toDateString();

  if (shouldCreateHistory) {
    await prisma.dynamicPriceHistory.create({
      data: {
        productId,
        price: result.price,
        date: now,
      },
    });
  }

  await refreshDynamicProductPriceStats(productId);

  return true;
}

export async function processPriorityRefreshQueue() {
  assertEnv();

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
    runId,
  };

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

      const uniqueAsins = Array.from(
        new Set(messages.map(extractAsinFromMessage).filter(Boolean))
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
        },
      });

      const productMap = new Map(products.map((product) => [product.asin, product]));
      const results = await fetchAmazonPricesBatch(uniqueAsins);

      for (const asin of uniqueAsins) {
        const product = productMap.get(asin);
        const result = results[asin];

        if (!product || !result) {
          summary.skippedProducts += 1;
          continue;
        }

        const updated = await persistDynamicUpdate(product.id, result);
        if (updated) {
          summary.updatedProducts += 1;
          summary.updatedAsins.push(asin);
        } else {
          summary.skippedProducts += 1;
        }
      }

      const deletableMessages = messages.filter((message) => message.ReceiptHandle);
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
