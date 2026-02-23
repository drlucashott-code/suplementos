import "dotenv/config";
import https from "https";
import crypto from "node:crypto";
import { Store } from "@prisma/client";
import { prisma } from "../src/lib/prisma";

/* ======================
   CONFIGURAÇÕES
====================== */
const REQUEST_DELAY_MS = 2000; 
const BATCH_SIZE = 10; 

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

function getSignatureKey(key: string, dateStamp: string, region: string, service: string): Buffer {
  const kDate = hmac(`AWS4${key}`, dateStamp);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, service);
  return hmac(kService, "aws4_request");
}

/* ======================
   API CALL (GetItems)
====================== */
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
        "OffersV2.Listings.MerchantInfo"
    ],
    PartnerTag: AMAZON_PARTNER_TAG,
    PartnerType: "Associates",
    Marketplace: "www.amazon.com.br"
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

/* ======================
    MAIN LOOP
====================== */
async function updateAmazonPrices() {
  console.log("🚀 Iniciando Update Inteligente (Vencidos ou Sem Preço)");

  // Define o ponto de corte para 1 hora atrás
  const oneHourAgo = new Date();
  oneHourAgo.setHours(oneHourAgo.getHours() - 1);
  
  const offers = await prisma.offer.findMany({
    where: { 
      store: Store.AMAZON,
      // Lógica: Atualiza se for antigo (> 1h) OU se preço for 0
      OR: [
        { updatedAt: { lt: oneHourAgo } },
        { price: 0 }
      ]
    },
    // CORREÇÃO: 'select' adicionado para trazer o relacionamento 'product'
    select: {
      id: true,
      externalId: true,
      price: true,
      product: { 
        select: { name: true } 
      },
    },
    orderBy: { updatedAt: "asc" },
  });

  console.log(`📦 Encontrados ${offers.length} produtos para atualizar...\n`);

  for (let i = 0; i < offers.length; i += BATCH_SIZE) {
    const chunk = offers.slice(i, i + BATCH_SIZE);
    const asins = chunk.map((o) => o.externalId).filter((id): id is string => !!id);

    let apiResults: Record<string, PriceResult> = {};
    
    try {
      if (asins.length > 0) {
        apiResults = await fetchAmazonPricesBatch(asins);
      }
    } catch (e) {
      console.error("❌ Erro no lote:", e);
    }

    for (const offer of chunk) {
      const asin = offer.externalId || "---";
      // Safe navigation caso o produto venha sem nome (raro com o select, mas seguro)
      const name = offer.product?.name || "Produto sem nome"; 
      let result = apiResults[asin];

      // 🔍 LÓGICA DE VERIFICAÇÃO DE VARIAÇÃO (> 20%)
      if (result && result.status === "OK" && offer.price > 0) {
        const variation = Math.abs(result.price - offer.price) / offer.price;
        
        if (variation > 0.20) {
          console.log(`   ⏳ Variação Brusca (${(variation * 100).toFixed(1)}% - R$ ${result.price}) em ${asin}. Re-checando em 60s...`);
          await new Promise((r) => setTimeout(r, 60000));
          
          const secondCheck = await fetchAmazonPricesBatch([asin]);
          if (secondCheck[asin]) {
            result = secondCheck[asin];
            console.log(`   🎯 Verificação final para ${asin}: R$ ${result.price}`);
          }
        }
      }

      let finalPrice = 0;
      let logStatus = "";
      const storeName = result?.merchantName || "---";

      if (result && result.status === "OK") {
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

        const lastHistory = await prisma.offerPriceHistory.findFirst({
          where: { offerId: offer.id },
          orderBy: { createdAt: 'desc' }
        });

        const now = new Date();
        const isSameDay = lastHistory && 
          lastHistory.createdAt.toDateString() === now.toDateString();

        if (!isSameDay || (lastHistory && lastHistory.price !== finalPrice)) {
          await prisma.offerPriceHistory.create({
            data: { offerId: offer.id, price: finalPrice },
          });
          logStatus += " | 💾 Histórico Salvo";
        } else {
          logStatus += " | ⏩ Histórico Mantido";
        }

      } else {
        finalPrice = 0;
        
        if (result?.status === "EXCLUDED") {
             logStatus = `🚫 Excluída: ${result.merchantName}`;
        } else if (result?.status === "OUT_OF_STOCK") {
             logStatus = "🔻 Sem Estoque na API";
        } else {
             logStatus = "⚠️ Erro/Sem Dados API";
        }

        await prisma.offer.update({
          where: { id: offer.id },
          data: { price: 0, updatedAt: new Date() },
        });
      }

      const logName = name.substring(0, 25).padEnd(25);
      const logStore = storeName.substring(0, 15).padEnd(15);
      
      console.log(`   ${logName} | ${asin.padEnd(10)} | 🏪 ${logStore} | ${logStatus}`);
    }

    if (i + BATCH_SIZE < offers.length) {
        await new Promise((r) => setTimeout(r, REQUEST_DELAY_MS));
    }
  }

  console.log("\n🏁 Finalizado.");
}

updateAmazonPrices().catch(async (err) => {
  console.error(err);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});