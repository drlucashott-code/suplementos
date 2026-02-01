import "dotenv/config";
import https from "https";
import crypto from "node:crypto";
import { PrismaClient, Store } from "@prisma/client";

const prisma = new PrismaClient();

const REQUEST_DELAY_MS = 2000;
const BATCH_SIZE = 10;

const AMAZON_ACCESS_KEY = process.env.AMAZON_ACCESS_KEY;
const AMAZON_SECRET_KEY = process.env.AMAZON_SECRET_KEY;
const AMAZON_PARTNER_TAG = process.env.AMAZON_PARTNER_TAG;
const AMAZON_HOST = "webservices.amazon.com.br";
const AMAZON_REGION = "us-east-1";

/* ======================
    AWS HELPERS
====================== */
function hmac(key: string | Buffer, data: string): Buffer {
  return crypto.createHmac("sha256", key).update(data).digest();
}
function sha256(data: string): string {
  return crypto.createHash("sha256").update(data).digest("hex");
}
function getSignatureKey(key: string, dateStamp: string, region: string, service: string): Buffer {
  const kDate = hmac(`AWS4${key}`, dateStamp);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, service);
  return hmac(kService, "aws4_request");
}

/* ======================
    CAPTURA IGUAL AO SEU ORIGINAL
====================== */
async function fetchAmazonBatch(asins: string[]): Promise<Record<string, any>> {
  if (asins.length === 0) return {};

  const payload = JSON.stringify({
    ItemIds: asins,
    Resources: [
      "Offers.Listings.Price",
      "Offers.Listings.MerchantInfo", // Você já usa e funciona
      "OffersV2.Listings.Price",
      "OffersV2.Listings.MerchantInfo", // Você já usa e funciona
      "Offers.Summaries.HighestPrice"
    ],
    PartnerTag: AMAZON_PARTNER_TAG,
    PartnerType: "Associates",
  });

  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.substring(0, 8);
  const credentialScope = `${dateStamp}/${AMAZON_REGION}/ProductAdvertisingAPI/aws4_request`;

  // Headers exatos do seu script original
  const canonicalHeaders = `content-encoding:amz-1.0\ncontent-type:application/json; charset=utf-8\nhost:${AMAZON_HOST}\nx-amz-date:${amzDate}\n`;
  const signedHeaders = "content-encoding;content-type;host;x-amz-date";
  const canonicalRequest = `POST\n/paapi5/getitems\n\n${canonicalHeaders}\n${signedHeaders}\n${sha256(payload)}`;
  const stringToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${credentialScope}\n${sha256(canonicalRequest)}`;
  const signingKey = getSignatureKey(AMAZON_SECRET_KEY!, dateStamp, AMAZON_REGION, "ProductAdvertisingAPI");
  const signature = crypto.createHmac("sha256", signingKey).update(stringToSign).digest("hex");

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
      "Content-Length": Buffer.byteLength(payload)
    },
  };

  return new Promise((resolve) => {
    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const json = JSON.parse(data);
          const results: Record<string, any> = {};
          if (json?.ItemsResult?.Items) {
            for (const item of json.ItemsResult.Items) {
              results[item.ASIN] = item;
            }
          }
          resolve(results);
        } catch { resolve({}); }
      });
    });
    req.write(payload);
    req.end();
  });
}

/* ======================
    LOOP DE AUDITORIA
====================== */
async function runAudit() {
  console.log("🛡️ Iniciando Auditoria Estabilizada (Estrutura Original)\n");

  const offers = await prisma.offer.findMany({
    where: { store: Store.AMAZON },
    select: { externalId: true, product: { select: { name: true } } },
    orderBy: { product: { name: "asc" } },
  });

  const suspicious = [];

  for (let i = 0; i < offers.length; i += BATCH_SIZE) {
    const chunk = offers.slice(i, i + BATCH_SIZE);
    const asins = chunk.map((o) => o.externalId).filter(Boolean);
    const apiData = await fetchAmazonBatch(asins);

    for (const offer of chunk) {
      const item = apiData[offer.externalId];
      let price = 0;
      let merchant = "N/A";

      if (item) {
        const v2 = item.OffersV2?.Listings?.[0];
        const v1 = item.Offers?.Listings?.[0];
        price = v2?.Price?.Money?.Amount || v1?.Price?.Amount || 0;
        merchant = v2?.MerchantInfo?.Name || v1?.MerchantInfo?.Name || "Marketplace";

        // Sua regra da Loja Suplemento
        if (merchant === "Loja Suplemento") {
          const highest = item?.Offers?.Summaries?.[0]?.HighestPrice?.Amount;
          if (highest) price = highest;
        }
      }

      // CRITÉRIO DE AUDITORIA SEGURO (Baseado no Vendedor)
      const isAmazon = merchant.toLowerCase().includes("amazon");
      const isLojaSup = merchant === "Loja Suplemento";
      const isSafe = isAmazon || isLojaSup;

      if (price > 0) {
        const icon = isSafe ? "✅" : "❌";
        console.log(`   ${icon} R$ ${price.toFixed(2).padEnd(8)} | ${offer.product.name.substring(0, 30).padEnd(30)} [${merchant}]`);
        
        if (!isSafe) {
          suspicious.push({ ASIN: offer.externalId, Produto: offer.product.name.substring(0, 30), Vendedor: merchant });
        }
      } else {
        console.log(`   🔻 SEM PREÇO | ${offer.product.name.substring(0, 30).padEnd(30)} [${offer.externalId}]`);
      }
    }
    await new Promise((r) => setTimeout(r, REQUEST_DELAY_MS));
  }

  console.log("\n--- 🛡️ RELATÓRIO DE REMOÇÃO ---");
  if (suspicious.length > 0) console.table(suspicious);

  await prisma.$disconnect();
}

runAudit();