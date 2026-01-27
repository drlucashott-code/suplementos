import "dotenv/config";
import https from "https";
import crypto from "node:crypto";
import { PrismaClient, Store } from "@prisma/client";
import { chromium, Browser } from "playwright";

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
   API EM LOTE
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

  const canonicalHeaders =
    `content-encoding:amz-1.0\ncontent-type:application/json; charset=utf-8\nhost:${AMAZON_HOST}\nx-amz-date:${amzDate}\n`;
  const signedHeaders = "content-encoding;content-type;host;x-amz-date";
  const canonicalRequest =
    `POST\n/paapi5/getitems\n\n${canonicalHeaders}\n${signedHeaders}\n${sha256(payload)}`;
  const credentialScope =
    `${dateStamp}/${AMAZON_REGION}/${AMAZON_SERVICE}/aws4_request`;
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
      Authorization:
        `AWS4-HMAC-SHA256 Credential=${AMAZON_ACCESS_KEY}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
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
              const listingsV2 = item?.OffersV2?.Listings;
              if (Array.isArray(listingsV2)) {
                const buyBox = listingsV2.find((l: any) => l?.IsBuyBoxWinner) ?? listingsV2[0];
                const p = buyBox?.Price?.Money?.Amount;
                if (typeof p === "number") price = p;
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
   SCRAPING HTML LEVE
====================== */
async function scrapeAmazonPrice(asin: string): Promise<number | null> {
  const randomAgent = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
  return new Promise((resolve) => {
    https
      .get(
        {
          hostname: "www.amazon.com.br",
          path: `/dp/${asin}`,
          headers: {
            "User-Agent": randomAgent,
            "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
          },
        },
        (res) => {
          let html = "";
          res.on("data", (c) => (html += c));
          res.on("end", () => {
            if (res.statusCode === 503 || html.includes("api-services-support@amazon.com")) {
              return resolve(null);
            }
            // Procura por seletores comuns de preço da Amazon
            const match =
              html.match(/id="priceblock_ourprice"[\s\S]*?R\$[\s]*([\d\.]+,\d{2})/) ||
              html.match(/id="priceblock_dealprice"[\s\S]*?R\$[\s]*([\d\.]+,\d{2})/) ||
              html.match(/a-offscreen">R\$[\s]*([\d\.]+,\d{2})</);

            if (!match) return resolve(null);
            const price = Number(match[1].replace(/\./g, "").replace(",", "."));
            resolve(Number.isFinite(price) ? price : null);
          });
        }
      )
      .on("error", () => resolve(null));
  });
}

/* ======================
   PLAYWRIGHT (BROWSER REAL) - OTIMIZADO
   Recebe a instância do browser já aberta para economizar recursos.
====================== */
async function playwrightAmazonPrice(
  asin: string,
  browser: Browser
): Promise<number | null> {
  const page = await browser.newPage();
  try {
    await page.goto(`https://www.amazon.com.br/dp/${asin}`, {
      waitUntil: "networkidle",
      timeout: 30000,
    });

    const priceText = await page
      .locator(".a-price .a-offscreen")
      .first()
      .textContent();

    if (!priceText) return null;

    const price = Number(
      priceText.replace("R$", "").trim().replace(/\./g, "").replace(",", ".")
    );
    return Number.isFinite(price) ? price : null;
  } catch {
    return null;
  } finally {
    await page.close(); // Fecha apenas a aba, mantém o browser vivo
  }
}

/* ======================
   MAIN LOOP
====================== */
async function updateAmazonPrices() {
  const ENABLE_SCRAPING = process.argv.includes("--scrape");
  const ENABLE_BROWSER = process.argv.includes("--browser");

  // 🚀 OTIMIZAÇÃO: Inicializa o browser uma única vez fora do loop
  let browser: Browser | null = null;
  if (ENABLE_BROWSER) {
    console.log("🧠 Inicializando Playwright (Browser Global)...");
    browser = await chromium.launch({ headless: true });
  }

  console.log("🚀 Iniciando Update");
  console.log(
    `MODO: ${
      ENABLE_SCRAPING
        ? "🔥 Scraping Habilitado"
        : "🛡️ Apenas API"
    } | Browser: ${ENABLE_BROWSER ? "ON" : "OFF"}\n`
  );

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

  try {
    for (let i = 0; i < offers.length; i += BATCH_SIZE) {
      const chunk = offers.slice(i, i + BATCH_SIZE);
      const asins = chunk.map((o) => o.externalId).filter(Boolean);

      let apiResults: Record<string, PriceResult> = {};
      let apiCrashed = false;

      // 1. Tenta API Oficial
      try {
        if (asins.length > 0) apiResults = await fetchAmazonPricesBatch(asins);
      } catch {
        apiCrashed = true;
      }

      for (const offer of chunk) {
        const asin = offer.externalId;
        const name = offer.product.name;
        const result = apiResults[asin];

        let finalPrice = 0;
        let statusLog = "";
        let shouldZero = false;

        // Lógica de Prioridade: API -> Scraping Leve -> Playwright
        if (result) {
          if (result.status === "OK") {
            finalPrice = result.price;
            statusLog = `✅ R$ ${finalPrice}`;
          } else {
            shouldZero = true;
            statusLog = `❌ Sem estoque (API)`;
          }
        } else if (ENABLE_SCRAPING && !apiCrashed) {
          process.stdout.write(`   ⚠️ ${name} [${asin}] -> Erro API. Scraping... `);
          
          // 2. Tenta Scraping Leve
          const scraped = await scrapeAmazonPrice(asin);

          if (scraped) {
            finalPrice = scraped;
            statusLog = `🕷️ Scraping: R$ ${finalPrice}`;
            console.log("OK");
          } else if (ENABLE_BROWSER && browser) {
            console.log("Falhou → Browser");
            
            // 3. Tenta Playwright (usando a instância global)
            const browserPrice = await playwrightAmazonPrice(asin, browser);

            if (browserPrice) {
              finalPrice = browserPrice;
              statusLog = `🌐 Browser: R$ ${finalPrice}`;
            } else {
              statusLog = `⚠️ Falha total (Mantido antigo)`;
            }
          } else {
            statusLog = `⚠️ Falha scraping`;
            console.log("Falhou");
          }
        } else {
          statusLog = `⚠️ Erro API (Modo Seguro)`;
        }

        // Atualização no Banco de Dados
        if (finalPrice > 0) {
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
          console.log(`   ${name} [${asin}] | ${statusLog}`);
        } else if (shouldZero) {
          await prisma.offer.update({
             where: { id: offer.id },
             data: { price: 0, updatedAt: new Date() }
          });
          console.log(`   ${name} [${asin}] | ${statusLog}`);
        } else {
          // Log de erro sem tocar no banco
          if (!statusLog.includes("OK")) console.log(`   ${name} [${asin}] | ${statusLog}`);
        }
      }

      // Delay entre lotes
      await new Promise((r) => setTimeout(r, REQUEST_DELAY_MS));
    }
  } finally {
    // 🚀 OTIMIZAÇÃO: Fecha o browser apenas no final de tudo
    if (browser) {
      console.log("\n🧹 Fechando Playwright...");
      await browser.close();
    }
  }

  console.log("\n🏁 Finalizado.");
  await prisma.$disconnect();
}

updateAmazonPrices().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});