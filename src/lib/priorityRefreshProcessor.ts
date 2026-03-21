import https from "https";
import crypto from "node:crypto";
import {
  DeleteMessageBatchCommand,
  ReceiveMessageCommand,
  SQSClient,
  type Message,
} from "@aws-sdk/client-sqs";
import { prisma } from "@/lib/prisma";
import { refreshDynamicProductPriceStats } from "@/lib/dynamicPriceStats";

const sqsClient = new SQSClient({ region: process.env.AWS_REGION || "us-east-2" });
const queueUrl =
  process.env.AWS_PRIORITY_QUEUE_URL || process.env.AWS_QUEUE_URL || "";

const AMAZON_ACCESS_KEY = process.env.AMAZON_ACCESS_KEY;
const AMAZON_SECRET_KEY = process.env.AMAZON_SECRET_KEY;
const AMAZON_PARTNER_TAG = process.env.AMAZON_PARTNER_TAG;
const AMAZON_HOST = process.env.AMAZON_HOST ?? "webservices.amazon.com.br";
const AMAZON_REGION = process.env.AMAZON_REGION ?? "us-east-1";
const AMAZON_SERVICE = "ProductAdvertisingAPI";
const BATCH_SIZE = 10;

type AmazonListing = {
  IsBuyBoxWinner?: boolean;
  Price?: { Amount?: number; Money?: { Amount?: number } };
  MerchantInfo?: { Name?: string };
};

type AmazonItem = {
  ASIN?: string;
  DetailPageURL?: string;
  CustomerReviews?: {
    Count?: number;
    StarRating?: { Value?: number };
  };
  Offers?: { Listings?: AmazonListing[] };
  OffersV2?: { Listings?: AmazonListing[] };
};

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

  if (!AMAZON_ACCESS_KEY || !AMAZON_SECRET_KEY || !AMAZON_PARTNER_TAG) {
    throw new Error("Credenciais da Amazon nao configuradas.");
  }
}

function hmac(key: string | Buffer, data: string): Buffer {
  return crypto.createHmac("sha256", key).update(data).digest();
}

function sha256(data: string): string {
  return crypto.createHash("sha256").update(data).digest("hex");
}

function getSignatureKey(
  key: string,
  dateStamp: string,
  region: string,
  service: string
): Buffer {
  const kDate = hmac(`AWS4${key}`, dateStamp);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, service);
  return hmac(kService, "aws4_request");
}

async function fetchAmazonPricesBatch(
  asins: string[]
): Promise<Record<string, PriceResult>> {
  if (asins.length === 0) return {};

  const payload = JSON.stringify({
    ItemIds: asins,
    Resources: [
      "Offers.Listings.Price",
      "OffersV2.Listings.Price",
      "Offers.Listings.MerchantInfo",
      "OffersV2.Listings.MerchantInfo",
      "CustomerReviews.Count",
      "CustomerReviews.StarRating",
    ],
    PartnerTag: AMAZON_PARTNER_TAG,
    PartnerType: "Associates",
    Marketplace: "www.amazon.com.br",
  });

  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.substring(0, 8);

  const canonicalHeaders =
    `content-encoding:amz-1.0\ncontent-type:application/json; charset=utf-8\nhost:${AMAZON_HOST}\nx-amz-date:${amzDate}\n`;
  const signedHeaders = "content-encoding;content-type;host;x-amz-date";
  const canonicalRequest =
    `POST\n/paapi5/getitems\n\n${canonicalHeaders}\n${signedHeaders}\n${sha256(payload)}`;
  const credentialScope = `${dateStamp}/${AMAZON_REGION}/${AMAZON_SERVICE}/aws4_request`;
  const stringToSign =
    `AWS4-HMAC-SHA256\n${amzDate}\n${credentialScope}\n${sha256(canonicalRequest)}`;
  const signingKey = getSignatureKey(
    AMAZON_SECRET_KEY!,
    dateStamp,
    AMAZON_REGION,
    AMAZON_SERVICE
  );
  const signature = crypto
    .createHmac("sha256", signingKey)
    .update(stringToSign)
    .digest("hex");

  const options = {
    hostname: AMAZON_HOST,
    path: "/paapi5/getitems",
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Encoding": "amz-1.0",
      "X-Amz-Date": amzDate,
      "X-Amz-Target": "com.amazon.paapi5.v1.ProductAdvertisingAPIv1.GetItems",
      Authorization: `AWS4-HMAC-SHA256 Credential=${AMAZON_ACCESS_KEY}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
      "Content-Length": Buffer.byteLength(payload),
    },
  };

  return new Promise((resolve) => {
    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const json = JSON.parse(data) as { ItemsResult?: { Items?: AmazonItem[] } };
          const results: Record<string, PriceResult> = {};

          for (const item of json.ItemsResult?.Items || []) {
            const asin = item.ASIN || "";
            if (!asin) continue;

            let price = 0;
            let merchantName: string | null = null;

            const listingsV2 = item.OffersV2?.Listings;
            if (Array.isArray(listingsV2)) {
              const buyBox =
                listingsV2.find((listing) => listing?.IsBuyBoxWinner) ?? listingsV2[0];
              const amount = buyBox?.Price?.Money?.Amount;
              if (typeof amount === "number") {
                price = amount;
                merchantName = buyBox?.MerchantInfo?.Name ?? null;
              }
            }

            if (price === 0) {
              const listing = item.Offers?.Listings?.[0];
              const amount = listing?.Price?.Amount;
              if (typeof amount === "number") {
                price = amount;
                merchantName = listing?.MerchantInfo?.Name ?? null;
              }
            }

            results[asin] = {
              asin,
              price,
              merchantName,
              affiliateUrl:
                item.DetailPageURL ||
                `https://www.amazon.com.br/dp/${asin}?tag=${AMAZON_PARTNER_TAG}`,
              ratingAverage: item.CustomerReviews?.StarRating?.Value ?? null,
              ratingCount: item.CustomerReviews?.Count ?? null,
              status: price > 0 ? "OK" : "OUT_OF_STOCK",
            };
          }

          resolve(results);
        } catch {
          resolve({});
        }
      });
    });

    req.on("error", () => resolve({}));
    req.write(payload);
    req.end();
  });
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
      ratingAverage: result.ratingAverage,
      ratingCount: result.ratingCount,
      ratingsUpdatedAt: new Date(),
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
