import "dotenv/config";
import https from "https";
import crypto from "node:crypto";
import { PrismaClient, Store } from "@prisma/client";

const prisma = new PrismaClient();

/* ======================
   CONFIGURAÇÕES
====================== */
const REQUEST_DELAY_MS = 2000; 
const BATCH_SIZE = 10; 

// 🚫 LISTA DE BLOQUEIO
const BLOCKED_STORES = [
  "Loja Suplemento"
];

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
   API CALL
====================== */
type ApiStatus = "OK" | "FALLBACK" | "OUT_OF_STOCK" | "ERROR";

type PriceResult = {
  price: number;
  status: ApiStatus;
  merchant: string;
};

async function fetchAmazonPricesBatch(asins: string[]): Promise<Record<string, PriceResult>> {
  const results: Record<string, PriceResult> = {};
  
  // Inicializa como ERROR (para zerar caso a requisição falhe totalmente)
  asins.forEach(asin => {
    results[asin] = { price: 0, status: "ERROR", merchant: "-" };
  });

  if (asins.length === 0) return results;

  const payload = JSON.stringify({
    ItemIds: asins,
    Resources: [
      "Offers.Listings.Price", 
      "Offers.Listings.MerchantInfo", 
      "OffersV2.Listings.Price",
      "OffersV2.Listings.MerchantInfo",
      "Offers.Summaries.HighestPrice", // Único Fallback Ativo
      "Offers.Summaries.LowestPrice"
    ],
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

          if (json?.ItemsResult?.Items) {
            for (const item of json.ItemsResult.Items) {
              let price = 0;
              let merchantName = "-";
              let finalStatus: ApiStatus = "OUT_OF_STOCK";

              // Helper para filtrar lojas bloqueadas
              const getValidOffer = (listings: any[]) => {
                if (!Array.isArray(listings)) return null;
                const valid = listings.filter((l: any) => !BLOCKED_STORES.includes(l?.MerchantInfo?.Name));
                return valid.length > 0 ? (valid.find((l:any) => l.IsBuyBoxWinner) || valid[0]) : null;
              };

              // 1. TENTA ACHAR OFERTA VÁLIDA
              let chosen = getValidOffer(item?.OffersV2?.Listings);
              if (!chosen) chosen = getValidOffer(item?.Offers?.Listings);

              if (chosen) {
                const p = chosen.Price?.Money?.Amount || chosen.Price?.Amount;
                if (p > 0) {
                  price = p;
                  merchantName = chosen.MerchantInfo?.Name || "Desconhecido";
                  finalStatus = "OK";
                }
              }

              // 2. FALLBACK: Apenas HighestPrice do Sumário
              if (price === 0) {
                 const highest = item?.Offers?.Summaries?.[0]?.HighestPrice?.Amount;
                 if (highest > 0) {
                    price = highest;
                    merchantName = "Amazon (Ref)";
                    finalStatus = "FALLBACK";
                 }
                 // Se não achou HighestPrice, mantém como OUT_OF_STOCK
                 // (Mesmo que tenha sido bloqueado, será considerado Sem Estoque Válido)
              }

              results[item.ASIN] = { price, status: finalStatus, merchant: merchantName };
            }
          }
          resolve(results);
        } catch { resolve(results); }
      });
    });
    req.on("error", () => resolve(results));
    req.write(payload);
    req.end();
  });
}

/* ======================
   MAIN LOOP
====================== */
async function updateAmazonPrices() {
  console.log("🚀 Iniciando Update (Logs: OK, Ref, Erro API ou Sem Estoque)");
  console.log("🚫 Lojas Bloqueadas:", BLOCKED_STORES);
  
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
    
    try {
      if (asins.length > 0) apiResults = await fetchAmazonPricesBatch(asins);
    } catch (e) { console.error("❌ Erro fatal no lote:", e); }

    for (const offer of chunk) {
      const asin = offer.externalId;
      const name = offer.product.name;
      const result = apiResults[asin];

      let finalPrice = 0;
      let historyStatus = "⏩ Mantido";
      let logMessage = "";

      // CASO 1: PREÇO VÁLIDO (Oferta Real ou Fallback)
      if (result && (result.status === "OK" || result.status === "FALLBACK")) {
        finalPrice = result.price;
        
        await prisma.offer.update({
          where: { id: offer.id },
          data: {
            price: finalPrice,
            updatedAt: new Date(),
            affiliateUrl: `https://www.amazon.com.br/dp/${asin}?tag=${AMAZON_PARTNER_TAG}`,
          },
        });

        const lastHistory = await prisma.offerPriceHistory.findFirst({
          where: { offerId: offer.id }, orderBy: { createdAt: 'desc' }
        });
        const now = new Date();
        const isSameDay = lastHistory && 
          lastHistory.createdAt.getDate() === now.getDate() &&
          lastHistory.createdAt.getMonth() === now.getMonth() &&
          lastHistory.createdAt.getFullYear() === now.getFullYear();

        if (!isSameDay || (lastHistory && lastHistory.price !== finalPrice)) {
          await prisma.offerPriceHistory.create({ data: { offerId: offer.id, price: finalPrice } });
          historyStatus = "💾 Atualizado";
        }

        const icon = result.status === "FALLBACK" ? "🛡️ Ref." : "✅";
        logMessage = `${name} | ${asin} | R$ ${finalPrice.toFixed(2).replace('.',',')} | ${icon} ${result.merchant} | ${historyStatus}`;

      } 
      // CASO 2: ZERADO (Sem Estoque, Bloqueado ou Erro API)
      else {
        // Zera o preço no banco
        await prisma.offer.update({
          where: { id: offer.id },
          data: { price: 0, updatedAt: new Date() },
        });

        let statusLabel = "";
        
        // Diferencia apenas Erro Técnico de Falta de Estoque
        if (result?.status === "ERROR") {
          statusLabel = "⚠️ ZERADO (Erro na API)";
        } else {
          // OUT_OF_STOCK ou Bloqueado caem aqui como "Sem Estoque"
          statusLabel = "🔻 ZERADO (Sem Estoque)";
        }

        logMessage = `${name} | ${asin} | R$ 0,00 | - | ${statusLabel}`;
      }

      console.log(logMessage);
    }

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