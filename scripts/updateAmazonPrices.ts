import "dotenv/config";
import https from "https";
import crypto from "node:crypto";
import { PrismaClient, Store } from "@prisma/client";

const prisma = new PrismaClient();

/* ======================
   CONFIGURAÇÕES
====================== */
const REQUEST_DELAY_MS = 2000; // 2 segundos entre lotes (evita erro 429)
const BATCH_SIZE = 10; // Limite máximo da API por requisição

/* ======================
   ENV CHECK
====================== */
const AMAZON_ACCESS_KEY = process.env.AMAZON_ACCESS_KEY;
const AMAZON_SECRET_KEY = process.env.AMAZON_SECRET_KEY;
const AMAZON_PARTNER_TAG = process.env.AMAZON_PARTNER_TAG;
const AMAZON_HOST = process.env.AMAZON_HOST ?? "webservices.amazon.com.br";
const AMAZON_REGION = process.env.AMAZON_REGION ?? "us-east-1";
const AMAZON_SERVICE = "ProductAdvertisingAPI";

if (!AMAZON_ACCESS_KEY || !AMAZON_SECRET_KEY || !AMAZON_PARTNER_TAG) {
  throw new Error("❌ Credenciais da Amazon não configuradas");
}

/* ======================
   AWS HELPERS (Assinatura)
====================== */
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

/* ======================
   API CALL (GetItems)
====================== */
type ApiStatus = "OK" | "OUT_OF_STOCK" | "ERROR";

type PriceResult = {
  price: number;
  status: ApiStatus;
};

async function fetchAmazonPricesBatch(
  asins: string[]
): Promise<Record<string, PriceResult>> {
  if (asins.length === 0) return {};

  const payload = JSON.stringify({
    ItemIds: asins,
    Resources: ["Offers.Listings.Price", "OffersV2.Listings.Price"],
    PartnerTag: AMAZON_PARTNER_TAG,
    PartnerType: "Associates",
  });

  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.substring(0, 8);

  const canonicalHeaders = `content-encoding:amz-1.0\ncontent-type:application/json; charset=utf-8\nhost:${AMAZON_HOST}\nx-amz-date:${amzDate}\n`;
  const signedHeaders = "content-encoding;content-type;host;x-amz-date";
  const canonicalRequest = `POST\n/paapi5/getitems\n\n${canonicalHeaders}\n${signedHeaders}\n${sha256(payload)}`;
  const credentialScope = `${dateStamp}/${AMAZON_REGION}/${AMAZON_SERVICE}/aws4_request`;
  const stringToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${credentialScope}\n${sha256(canonicalRequest)}`;
  const signingKey = getSignatureKey(AMAZON_SECRET_KEY!, dateStamp, AMAZON_REGION, AMAZON_SERVICE);
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
              
              // Tenta V2 (Buy Box)
              const listingsV2 = item?.OffersV2?.Listings;
              if (Array.isArray(listingsV2)) {
                const buyBox = listingsV2.find((l: any) => l?.IsBuyBoxWinner) ?? listingsV2[0];
                const p = buyBox?.Price?.Money?.Amount;
                if (typeof p === "number") price = p;
              }

              // Fallback V1
              if (price === 0) {
                 const p1 = item?.Offers?.Listings?.[0]?.Price?.Amount;
                 if (typeof p1 === "number") price = p1;
              }

              results[item.ASIN] = price > 0
                ? { price, status: "OK" }
                : { price: 0, status: "OUT_OF_STOCK" };
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

/* ======================
   MAIN LOOP
====================== */
async function updateAmazonPrices() {
  console.log("🚀 Iniciando Update (Modo Estrito: APENAS API OFICIAL)");
  
  const offers = await prisma.offer.findMany({
    where: { store: Store.AMAZON },
    select: {
      id: true,
      externalId: true,
      product: { select: { name: true } },
    },
    orderBy: { product: { name: "asc" } },
  });

  console.log(`📦 Processando ${offers.length} ofertas em lotes de ${BATCH_SIZE}...\n`);

  for (let i = 0; i < offers.length; i += BATCH_SIZE) {
    const chunk = offers.slice(i, i + BATCH_SIZE);
    const asins = chunk.map((o) => o.externalId).filter(Boolean);

    let apiResults: Record<string, PriceResult> = {};
    
    // Chamada à API
    try {
      if (asins.length > 0) {
        apiResults = await fetchAmazonPricesBatch(asins);
      }
    } catch (e) {
      console.error("❌ Erro no lote:", e);
    }

    for (const offer of chunk) {
      const asin = offer.externalId;
      const name = offer.product.name;
      const result = apiResults[asin];

      let finalPrice = 0;
      let logStatus = "";

      if (result && result.status === "OK") {
        // ✅ SUCESSO: Preço oficial capturado
        finalPrice = result.price;
        logStatus = `✅ R$ ${finalPrice}`;
        
        await prisma.offer.update({
          where: { id: offer.id },
          data: {
            price: finalPrice,
            updatedAt: new Date(),
            affiliateUrl: `https://www.amazon.com.br/dp/${asin}?tag=${AMAZON_PARTNER_TAG}`,
          },
        });

        await prisma.offerPriceHistory.create({
          data: { offerId: offer.id, price: finalPrice },
        });

      } else {
        // ❌ FALHA: Sem estoque, erro ou "ItemNotAccessible"
        // Zera o preço para não exibir no site
        finalPrice = 0;
        logStatus = result?.status === "OUT_OF_STOCK" 
            ? "🔻 Sem Estoque" 
            : "⚠️ API Bloqueada/Sem Dados";

        await prisma.offer.update({
          where: { id: offer.id },
          data: { price: 0, updatedAt: new Date() },
        });
      }

      console.log(`   ${name.substring(0, 40).padEnd(40)} [${asin}] | ${logStatus}`);
    }

    // Delay obrigatório
    await new Promise((r) => setTimeout(r, REQUEST_DELAY_MS));
  }

  console.log("\n🏁 Finalizado.");
  await prisma.$disconnect();
}

updateAmazonPrices().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});