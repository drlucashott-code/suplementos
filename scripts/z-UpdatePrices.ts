import "dotenv/config";
import https from "https";
import crypto from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { reconcileDynamicFallbackState } from "../src/lib/dynamicFallback";
import { refreshDynamicProductPriceStats } from "../src/lib/dynamicPriceStats";

const prisma = new PrismaClient();

const REQUEST_DELAY_MS = 2000;
const RECHECK_DELAY_MS = 5000;
const BATCH_SIZE = 10;
const VARIATION_THRESHOLD = 0.2;

const AMAZON_ACCESS_KEY = process.env.AMAZON_ACCESS_KEY;
const AMAZON_SECRET_KEY = process.env.AMAZON_SECRET_KEY;
const AMAZON_PARTNER_TAG = process.env.AMAZON_PARTNER_TAG;
const AMAZON_HOST = process.env.AMAZON_HOST ?? "webservices.amazon.com.br";
const AMAZON_REGION = process.env.AMAZON_REGION ?? "us-east-1";
const AMAZON_SERVICE = "ProductAdvertisingAPI";

if (!AMAZON_ACCESS_KEY || !AMAZON_SECRET_KEY || !AMAZON_PARTNER_TAG) {
  throw new Error("Credenciais da Amazon nao configuradas");
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

interface AmazonListing {
  IsBuyBoxWinner?: boolean;
  Price?: { Amount?: number; Money?: { Amount: number } };
  MerchantInfo?: { Name: string };
}

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

  const payload = JSON.stringify({
    ItemIds: asins,
    Resources: [
      "Offers.Listings.Price",
      "OffersV2.Listings.Price",
      "Offers.Listings.MerchantInfo",
      "OffersV2.Listings.MerchantInfo",
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
          const json = JSON.parse(data);
          const results: Record<string, PriceResult> = {};

          if (json?.ItemsResult?.Items) {
            for (const item of json.ItemsResult.Items) {
              let price = 0;
              let merchantName = "Desconhecido";

              const listingsV2 = item?.OffersV2?.Listings as
                | AmazonListing[]
                | undefined;
              if (Array.isArray(listingsV2)) {
                const buyBox =
                  listingsV2.find((listing) => listing?.IsBuyBoxWinner) ??
                  listingsV2[0];
                const buyBoxPrice = buyBox?.Price?.Money?.Amount;
                if (typeof buyBoxPrice === "number") {
                  price = buyBoxPrice;
                  merchantName = buyBox?.MerchantInfo?.Name || "Desconhecido";
                }
              }

              if (price === 0) {
                const legacyListing = item?.Offers?.Listings?.[0] as
                  | AmazonListing
                  | undefined;
                const legacyPrice = legacyListing?.Price?.Amount;
                if (typeof legacyPrice === "number") {
                  price = legacyPrice;
                  merchantName =
                    legacyListing?.MerchantInfo?.Name || "Desconhecido";
                }
              }

              let status: ApiStatus = price > 0 ? "OK" : "OUT_OF_STOCK";

              if (merchantName === "Loja Suplemento") {
                status = "EXCLUDED";
                price = 0;
              }

              results[item.ASIN] = { price, merchantName, status };
            }
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

    await refreshDynamicProductPriceStats(product.id);

    return {
      logStatus: `OK R$ ${result.price.toFixed(2)}`,
      outcome: "UPDATED" as PersistOutcome,
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

  await refreshDynamicProductPriceStats(product.id);

  return { logStatus, outcome };
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

        const { logStatus, outcome } = await persistDynamicUpdate(product, result);
        incrementCounters(counters, outcome);
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

          const { logStatus, outcome } = await persistDynamicUpdate(product, result);
          incrementCounters(counters, outcome);
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
