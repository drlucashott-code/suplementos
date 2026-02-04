import "dotenv/config";
import https from "https";
import crypto from "node:crypto";
import { PrismaClient, Store } from "@prisma/client";
import { chromium } from "playwright";

const prisma = new PrismaClient();

/* ======================
   CONFIGURAÇÕES
====================== */
const REQUEST_DELAY_MS = 2000; // Delay entre lotes
const RETRY_DELAY_MS = 3000;   // Delay antes de tentar a API de novo (Double Check)
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
   SCRAPER VALIDATOR (Playwright)
====================== */
async function validateOfferWithScraper(asin: string, apiPrice: number): Promise<boolean> {
  console.log(`      🕵️  Rodando Scraper visual no ASIN ${asin}...`);
  
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    
    // Timeout de 15s para não travar
    await page.goto(`https://www.amazon.com.br/dp/${asin}`, { timeout: 15000, waitUntil: 'domcontentloaded' });
    
    // Seletores comuns de preço
    const selectors = [
      '.a-price .a-offscreen', 
      '#priceblock_ourprice', 
      '#priceblock_dealprice', 
      '#corePrice_feature_div .a-offscreen'
    ];

    let priceText = null;
    for (const selector of selectors) {
      try {
        priceText = await page.$eval(selector, el => el.textContent);
        if (priceText) break;
      } catch (e) { continue; }
    }

    if (!priceText) {
        console.log(`      ⚠️ Scraper não achou preço visível.`);
        return false; 
    }

    // Limpa "R$ 100,00" -> 100.00
    const scrapedPrice = parseFloat(priceText.replace(/[^\d,]/g, '').replace(',', '.'));

    // Margem de erro de R$ 1,00
    if (Math.abs(scrapedPrice - apiPrice) < 1.0) {
      console.log(`      ✅ Validado via HTML! Preço: R$ ${scrapedPrice}`);
      return true;
    } else {
      console.log(`      ⛔ Divergência! API: ${apiPrice} vs HTML: ${scrapedPrice}`);
      return false;
    }

  } catch (error) {
    console.error(`      ❌ Erro no Scraper (Timeou/Captcha):`, error instanceof Error ? error.message : error);
    return false;
  } finally {
    if (browser) await browser.close();
  }
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
        "OffersV2.Listings.MerchantInfo"
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
          const results: Record<string, PriceResult> = {};

          if (json?.ItemsResult?.Items) {
            for (const item of json.ItemsResult.Items) {
              let price = 0;
              let merchantName = "Desconhecido";
              
              // Tenta V2 (Buy Box)
              const listingsV2 = item?.OffersV2?.Listings;
              if (Array.isArray(listingsV2)) {
                const buyBox = listingsV2.find((l: any) => l?.IsBuyBoxWinner) ?? listingsV2[0];
                const p = buyBox?.Price?.Money?.Amount;
                if (typeof p === "number") {
                    price = p;
                    merchantName = buyBox?.MerchantInfo?.Name || "Desconhecido";
                }
              }

              // Fallback V1
              if (price === 0) {
                 const listing1 = item?.Offers?.Listings?.[0];
                 const p1 = listing1?.Price?.Amount;
                 if (typeof p1 === "number") {
                     price = p1;
                     merchantName = listing1?.MerchantInfo?.Name || "Desconhecido";
                 }
              }

              // Logica de Status
              let status: ApiStatus = price > 0 ? "OK" : "OUT_OF_STOCK";

              // Filtro de Loja Excluída
              if (merchantName === "Loja Suplemento") {
                  status = "EXCLUDED";
                  price = 0; // Zera o preço para não salvar
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
  console.log("🚀 Iniciando Update (API + Double Check + Scraping)");
  
  const offers = await prisma.offer.findMany({
    where: { store: Store.AMAZON },
    select: {
      id: true,
      externalId: true,
      price: true,
      product: { select: { name: true } },
    },
    orderBy: { product: { name: "asc" } },
  });

  console.log(`📦 Processando ${offers.length} ofertas em lotes de ${BATCH_SIZE}...\n`);

  for (let i = 0; i < offers.length; i += BATCH_SIZE) {
    const chunk = offers.slice(i, i + BATCH_SIZE);
    const asins = chunk.map((o) => o.externalId).filter(Boolean);

    let apiResults: Record<string, PriceResult> = {};
    
    // 1. Chamada Principal à API
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
      let storeName = result?.merchantName || "---";

      if (result && result.status === "OK") {
        const proposedPrice = result.price;
        const currentPrice = offer.price;
        let isValid = true;

        // VERIFICAÇÃO DE QUEDA BRUSCA (> 20%)
        if (currentPrice > 0 && proposedPrice > 0) {
            const discount = (currentPrice - proposedPrice) / currentPrice;
            
            if (discount > 0.20) {
                console.log(`   ⚠️ Suspeita: Queda de ${(discount * 100).toFixed(0)}% (R$ ${currentPrice} -> R$ ${proposedPrice}). Re-testando...`);
                
                // A) Aguarda
                await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));

                // B) Requisita API novamente (apenas este item)
                const reCheckResult = await fetchAmazonPricesBatch([asin]);
                const reCheckData = reCheckResult[asin];

                if (reCheckData && reCheckData.status === "OK" && reCheckData.price === proposedPrice) {
                    // C) API confirmou 2x. Agora vai pro Scraping.
                    const scraped = await validateOfferWithScraper(asin, proposedPrice);
                    if (!scraped) {
                        isValid = false;
                        logStatus = "🛡️ Bloqueado pelo Scraper";
                        storeName = result.merchantName;
                    }
                } else {
                    // Preço mudou no re-check ou deu erro
                    isValid = false;
                    logStatus = "🛡️ Bloqueado no Double Check da API";
                }
            }
        }

        if (isValid) {
            finalPrice = proposedPrice;
            logStatus = `✅ R$ ${finalPrice}`;
            storeName = result.merchantName;
            
            // Atualiza Tabela Offer
            await prisma.offer.update({
              where: { id: offer.id },
              data: {
                price: finalPrice,
                updatedAt: new Date(),
                affiliateUrl: `https://www.amazon.com.br/dp/${asin}?tag=${AMAZON_PARTNER_TAG}`,
              },
            });

            // Histórico Inteligente
            const lastHistory = await prisma.offerPriceHistory.findFirst({
              where: { offerId: offer.id },
              orderBy: { createdAt: 'desc' }
            });

            const now = new Date();
            const isSameDay = lastHistory && 
              lastHistory.createdAt.getDate() === now.getDate() &&
              lastHistory.createdAt.getMonth() === now.getMonth() &&
              lastHistory.createdAt.getFullYear() === now.getFullYear();

            if (!isSameDay || (lastHistory && lastHistory.price !== finalPrice)) {
              await prisma.offerPriceHistory.create({
                data: { offerId: offer.id, price: finalPrice },
              });
              logStatus += " | 💾 Histórico Salvo";
            } else {
              logStatus += " | ⏩ Histórico Mantido";
            }
        } else {
            // Se foi invalidado pelo Scraper/Check, mantém o preço antigo
            finalPrice = currentPrice;
        }

      } else {
        // TRATAMENTO DE ERROS / ESTOQUE
        finalPrice = 0;
        
        if (result?.status === "EXCLUDED") {
             logStatus = `🚫 Excluída: ${result.merchantName}`;
             storeName = result.merchantName;
        } else if (result?.status === "OUT_OF_STOCK") {
             logStatus = "🔻 Sem Estoque na API";
             storeName = result?.merchantName || "Amazon";
        } else {
             logStatus = "⚠️ Erro/Sem Dados";
        }

        // Se não tem preço ou é loja proibida, zera.
        await prisma.offer.update({
          where: { id: offer.id },
          data: { price: 0, updatedAt: new Date() },
        });
      }

      // LOG FINAL FORMATADO
      // Nome Curto | ASIN | Loja | Status | Histórico
      const logName = name.substring(0, 25).padEnd(25);
      const logStore = storeName.substring(0, 15).padEnd(15);
      
      console.log(`   ${logName} | ${asin} | 🏪 ${logStore} | ${logStatus}`);
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