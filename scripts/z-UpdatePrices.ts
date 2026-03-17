import "dotenv/config";
import https from "https";
import crypto from "node:crypto";
import { PrismaClient } from "@prisma/client";

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
  throw new Error("❌ Credenciais da Amazon não configuradas");
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

interface AmazonListing {
  IsBuyBoxWinner?: boolean;
  Price?: { Amount?: number; Money?: { Amount: number } };
  MerchantInfo?: { Name: string };
}

async function fetchAmazonPricesBatch(asins: string[]): Promise<Record<string, PriceResult>> {
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

              const listingsV2 = item?.OffersV2?.Listings as AmazonListing[] | undefined;
              if (Array.isArray(listingsV2)) {
                const buyBox = listingsV2.find((l) => l?.IsBuyBoxWinner) ?? listingsV2[0];
                const p = buyBox?.Price?.Money?.Amount;
                if (typeof p === "number") {
                  price = p;
                  merchantName = buyBox?.MerchantInfo?.Name || "Desconhecido";
                }
              }

              if (price === 0) {
                const listing1 = item?.Offers?.Listings?.[0] as AmazonListing | undefined;
                const p1 = listing1?.Price?.Amount;
                if (typeof p1 === "number") {
                  price = p1;
                  merchantName = listing1?.MerchantInfo?.Name || "Desconhecido";
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

type DynamicProductLite = {
  id: string;
  asin: string | null;
  totalPrice: number;
  name: string;
  attributes: unknown;
};

async function persistDynamicUpdate(product: DynamicProductLite, result?: PriceResult) {
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

    return `✅ R$ ${result.price.toFixed(2)}`;
  }

  let logStatus = "⚠️ Sem Dados API";
  if (result?.status === "EXCLUDED") logStatus = `🚫 Excluída: ${result.merchantName}`;
  else if (result?.status === "OUT_OF_STOCK") logStatus = "🔻 Sem Estoque na API";

  await prisma.dynamicProduct.update({
    where: { id: product.id },
    data: {
      totalPrice: 0,
      attributes: {
        ...currentAttrs,
        vendedor: result?.merchantName || "Indisponível",
      },
    },
  });

  return logStatus;
}

async function updateAmazonPrices() {
  console.log("🚀 Iniciando Update (Dynamic System - com fila de rechecagem)");

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

  console.log(`📦 Processando ${dynamicProducts.length} produtos em lotes de ${BATCH_SIZE}...\n`);

  const recheckQueue: DynamicProductLite[] = [];

  for (let i = 0; i < dynamicProducts.length; i += BATCH_SIZE) {
    const chunk = dynamicProducts.slice(i, i + BATCH_SIZE);
    const asins = chunk.map((p) => p.asin).filter((id): id is string => !!id);

    let apiResults: Record<string, PriceResult> = {};

    try {
      if (asins.length > 0) apiResults = await fetchAmazonPricesBatch(asins);
    } catch (e) {
      console.error("❌ Erro ao buscar lote na API:", e);
      continue;
    }

    for (const product of chunk) {
      const asin = product.asin || "---";
      const result = apiResults[asin];
      const storeName = result?.merchantName || "---";

      if (result && result.status === "OK" && product.totalPrice > 0) {
        const variation = Math.abs(result.price - product.totalPrice) / product.totalPrice;

        if (variation > VARIATION_THRESHOLD) {
          console.log(
            `   ⏳ Suspeito ${(variation * 100).toFixed(1)}% | ${asin} | R$ ${product.totalPrice} -> R$ ${result.price} | enviado para rechecagem`
          );
          recheckQueue.push(product);
          continue;
        }
      }

      const logStatus = await persistDynamicUpdate(product, result);
      const logName = product.name.substring(0, 25).padEnd(25);
      const logStore = storeName.substring(0, 15).padEnd(15);
      console.log(`   ${logName} | ${asin.padEnd(10)} | 🏪 ${logStore} | ${logStatus}`);
    }

    if (i + BATCH_SIZE < dynamicProducts.length) {
      await new Promise((r) => setTimeout(r, REQUEST_DELAY_MS));
    }
  }

  if (recheckQueue.length > 0) {
    console.log(`\n🔁 Rechecando ${recheckQueue.length} produtos com variação suspeita...`);
    await new Promise((r) => setTimeout(r, RECHECK_DELAY_MS));

    for (let i = 0; i < recheckQueue.length; i += BATCH_SIZE) {
      const chunk = recheckQueue.slice(i, i + BATCH_SIZE);
      const asins = chunk.map((p) => p.asin).filter((id): id is string => !!id);

      let apiResults: Record<string, PriceResult> = {};

      try {
        if (asins.length > 0) apiResults = await fetchAmazonPricesBatch(asins);
      } catch (e) {
        console.error("❌ Erro no lote de rechecagem:", e);
      }

      for (const product of chunk) {
        const asin = product.asin || "---";
        const result = apiResults[asin];
        const storeName = result?.merchantName || "---";

        const logStatus = await persistDynamicUpdate(product, result);
        const logName = product.name.substring(0, 25).padEnd(25);
        const logStore = storeName.substring(0, 15).padEnd(15);
        console.log(`   [RECHECK] ${logName} | ${asin.padEnd(10)} | 🏪 ${logStore} | ${logStatus}`);
      }

      if (i + BATCH_SIZE < recheckQueue.length) {
        await new Promise((r) => setTimeout(r, REQUEST_DELAY_MS));
      }
    }
  }

  console.log("\n🏁 Atualização finalizada com sucesso!");
}

updateAmazonPrices()
  .catch(async (err) => {
    console.error("❌ Falha crítica no script:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
