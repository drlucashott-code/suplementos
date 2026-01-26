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

// User-Agents para rotação no Scraping
const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0",
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
   API EM LOTE (RETORNA STATUS)
====================== */
type ApiStatus = "OK" | "OUT_OF_STOCK" | "ERROR";

type PriceResult = {
  price: number;
  status: ApiStatus;
};

async function fetchAmazonPricesBatch(asins: string[]): Promise<Record<string, PriceResult>> {
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
              
              // 1. Tenta pegar preço V1 ou V2
              const p1 = item?.Offers?.Listings?.[0]?.Price?.Amount;
              if (typeof p1 === "number") price = p1;
              else {
                const listingsV2 = item?.OffersV2?.Listings;
                if (Array.isArray(listingsV2)) {
                   const buyBox = listingsV2.find((l: any) => l?.IsBuyBoxWinner) ?? listingsV2[0];
                   const p2 = buyBox?.Price?.Money?.Amount;
                   if (typeof p2 === "number") price = p2;
                }
              }

              // LÓGICA DE ESTOQUE DA API
              if (price > 0) {
                results[item.ASIN] = { price, status: "OK" };
              } else {
                // Se o item veio, mas sem preço, é certeza que está sem estoque na Amazon
                results[item.ASIN] = { price: 0, status: "OUT_OF_STOCK" };
              }
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
   SCRAPING FALLBACK
====================== */
async function scrapeAmazonPrice(asin: string): Promise<number | null> {
  const randomAgent = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
  return new Promise((resolve) => {
    https.get(
      {
        hostname: "www.amazon.com.br",
        path: `/dp/${asin}`,
        headers: {
          "User-Agent": randomAgent,
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
          "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
        },
      },
      (res) => {
        let html = "";
        res.on("data", (c) => (html += c));
        res.on("end", () => {
          if (res.statusCode === 503 || html.includes("api-services-support@amazon.com")) {
            resolve(null); return;
          }
          const match = html.match(/R\$[\s]*([\d\.]+,\d{2})/);
          if (!match) return resolve(null);
          const price = Number(match[1].replace(/\./g, "").replace(",", "."));
          resolve(Number.isFinite(price) ? price : null);
        });
      }
    ).on("error", () => resolve(null));
  });
}

/* ======================
   MAIN LOOP
====================== */
async function updateAmazonPrices() {
  const ENABLE_SCRAPING = process.argv.includes("--scrape");

  console.log("🚀 Iniciando Update");
  console.log(`MODO: ${ENABLE_SCRAPING ? "🔥 Scraping Habilitado (Se necessário)" : "🛡️ Apenas API"}\n`);

  const offers = await prisma.offer.findMany({
    where: { store: Store.AMAZON },
    select: { id: true, externalId: true, product: { select: { name: true } } },
    orderBy: { updatedAt: "asc" },
  });

  console.log(`📦 Processando ${offers.length} ofertas em lotes de ${BATCH_SIZE}...\n`);

  for (let i = 0; i < offers.length; i += BATCH_SIZE) {
    const chunk = offers.slice(i, i + BATCH_SIZE);
    const asins = chunk.map(o => o.externalId).filter(Boolean);

    // 1. CHAMA API
    let apiResults: Record<string, PriceResult> = {};
    let apiCrashed = false;
    
    try {
      if (asins.length > 0) apiResults = await fetchAmazonPricesBatch(asins);
    } catch {
      apiCrashed = true;
    }

    // 2. PROCESSA RESULTADOS
    for (const offer of chunk) {
      const result = apiResults[offer.externalId];
      let finalPrice = 0;
      let shouldZero = false;
      let logMsg = "";

      if (result) {
        // --- CASO 1: API SUCESSO ---
        if (result.status === "OK") {
          finalPrice = result.price;
          logMsg = `✅ R$ ${finalPrice}`;
        } 
        // --- CASO 2: API DIZ SEM ESTOQUE (Regra: Não faz scraping) ---
        else if (result.status === "OUT_OF_STOCK") {
          shouldZero = true;
          logMsg = `❌ Sem estoque (API). Scraping ignorado.`;
        }
      } 
      else {
        // --- CASO 3: ERRO TÉCNICO OU ASIN NÃO RETORNADO ---
        // (Aqui aplicamos a regra: Se o erro for "outro", tenta scraping)
        if (ENABLE_SCRAPING && !apiCrashed) {
           process.stdout.write(`   ⚠️ [${offer.externalId}] Erro na API. Tentando Scraping... `);
           const scraped = await scrapeAmazonPrice(offer.externalId);
           
           if (scraped) {
             finalPrice = scraped;
             logMsg = `🕷️ Salvo pelo Scraping: R$ ${finalPrice}`;
           } else {
             // Se scraping também falhar, mantemos preço antigo (segurança)
             logMsg = `⚠️ Falha total. Mantendo preço antigo.`;
           }
           console.log(""); // quebra linha do stdout
        } else {
           logMsg = `⚠️ Erro API (Modo Seguro). Mantendo antigo.`;
        }
      }

      // 3. ATUALIZA BANCO
      if (finalPrice > 0) {
        await prisma.offer.update({
          where: { id: offer.id },
          data: {
            price: finalPrice,
            updatedAt: new Date(),
            affiliateUrl: `https://www.amazon.com.br/dp/${offer.externalId}?tag=${AMAZON_PARTNER_TAG}`,
          },
        });
        await prisma.offerPriceHistory.create({
          data: { offerId: offer.id, price: finalPrice },
        });
        console.log(`   ${logMsg} -> ${offer.product.name.substring(0, 20)}...`);
      } 
      else if (shouldZero) {
        await prisma.offer.update({
          where: { id: offer.id },
          data: { price: 0, updatedAt: new Date() },
        });
        console.log(`   ${logMsg} -> ${offer.product.name.substring(0, 20)}...`);
      } 
      else {
        console.log(`   ${logMsg}`);
      }
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