import "dotenv/config";
import https from "https";
import crypto from "node:crypto";
import { PrismaClient, Store } from "@prisma/client";

const prisma = new PrismaClient();

/* ======================
   CONFIG
====================== */
const HOURS_LIMIT = 4;
const REQUEST_DELAY_MS = 1800;
const SCRAPE_INTERVAL_MS = 24 * 60 * 60 * 1000;

// 🔥 FORÇA SCRAPING IGNORANDO EXECUÇÕES ANTERIORES
const FORCE_SCRAPE = true;

/* ======================
   ENV CHECK
====================== */
const AMAZON_ACCESS_KEY = process.env.AMAZON_ACCESS_KEY;
const AMAZON_SECRET_KEY = process.env.AMAZON_SECRET_KEY;
const AMAZON_PARTNER_TAG = process.env.AMAZON_PARTNER_TAG;

const AMAZON_HOST =
  process.env.AMAZON_HOST ?? "webservices.amazon.com.br";
const AMAZON_REGION =
  process.env.AMAZON_REGION ?? "us-east-1";
const AMAZON_SERVICE = "ProductAdvertisingAPI";

if (
  !AMAZON_ACCESS_KEY ||
  !AMAZON_SECRET_KEY ||
  !AMAZON_PARTNER_TAG
) {
  throw new Error("Credenciais da Amazon não configuradas");
}

const ACCESS_KEY = AMAZON_ACCESS_KEY;
const SECRET_KEY = AMAZON_SECRET_KEY;
const PARTNER_TAG = AMAZON_PARTNER_TAG;
const HOST = AMAZON_HOST;
const REGION = AMAZON_REGION;

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
   PRICE EXTRACTOR
====================== */
function extractAmazonPrice(json: any): number | null {
  const item = json?.ItemsResult?.Items?.[0];
  if (!item) return null;

  const priceV1 =
    item?.Offers?.Listings?.[0]?.Price?.Amount;
  if (typeof priceV1 === "number") return priceV1;

  const listingsV2 = item?.OffersV2?.Listings;
  if (Array.isArray(listingsV2)) {
    const buyBox =
      listingsV2.find((l: any) => l?.IsBuyBoxWinner) ??
      listingsV2[0];

    const priceV2 =
      buyBox?.Price?.Money?.Amount;

    if (typeof priceV2 === "number") return priceV2;
  }

  return null;
}

/* ======================
   FETCH AMAZON PRICE (API)
====================== */
async function fetchAmazonPrice(
  asin: string
): Promise<number | null | "NOT_ACCESSIBLE"> {
  const payload = JSON.stringify({
    ItemIds: [asin],
    Resources: [
      "Offers.Listings.Price",
      "OffersV2.Listings.Price",
    ],
    PartnerTag: PARTNER_TAG,
    PartnerType: "Associates",
  });

  const now = new Date();
  const amzDate = now
    .toISOString()
    .replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.substring(0, 8);

  const canonicalHeaders =
    "content-encoding:amz-1.0\n" +
    "content-type:application/json; charset=utf-8\n" +
    `host:${HOST}\n` +
    `x-amz-date:${amzDate}\n`;

  const signedHeaders =
    "content-encoding;content-type;host;x-amz-date";

  const canonicalRequest =
    "POST\n/paapi5/getitems\n\n" +
    canonicalHeaders +
    "\n" +
    signedHeaders +
    "\n" +
    sha256(payload);

  const credentialScope =
    `${dateStamp}/${REGION}/${AMAZON_SERVICE}/aws4_request`;

  const stringToSign =
    "AWS4-HMAC-SHA256\n" +
    amzDate +
    "\n" +
    credentialScope +
    "\n" +
    sha256(canonicalRequest);

  const signingKey = getSignatureKey(
    SECRET_KEY,
    dateStamp,
    REGION,
    AMAZON_SERVICE
  );

  const signature = crypto
    .createHmac("sha256", signingKey)
    .update(stringToSign)
    .digest("hex");

  const options = {
    hostname: HOST,
    path: "/paapi5/getitems",
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Encoding": "amz-1.0",
      "X-Amz-Date": amzDate,
      "X-Amz-Target":
        "com.amazon.paapi5.v1.ProductAdvertisingAPIv1.GetItems",
      Authorization:
        `AWS4-HMAC-SHA256 Credential=${ACCESS_KEY}/${credentialScope}, ` +
        `SignedHeaders=${signedHeaders}, Signature=${signature}`,
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

          if (
            json?.Errors?.some(
              (e: any) =>
                e?.Code === "ItemNotAccessible"
            )
          ) {
            resolve("NOT_ACCESSIBLE");
            return;
          }

          resolve(extractAmazonPrice(json));
        } catch {
          resolve(null);
        }
      });
    });

    req.on("error", () => resolve(null));
    req.write(payload);
    req.end();
  });
}

/* ======================
   SCRAPING FALLBACK
====================== */
async function scrapeAmazonPrice(
  asin: string
): Promise<number | null> {
  return new Promise((resolve) => {
    https
      .get(
        {
          hostname: "www.amazon.com.br",
          path: `/dp/${asin}`,
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
            "Accept-Language":
              "pt-BR,pt;q=0.9",
          },
        },
        (res) => {
          let html = "";
          res.on("data", (c) => (html += c));
          res.on("end", () => {
            const match =
              html.match(
                /R\$[\s]*([\d\.]+,\d{2})/
              );

            if (!match) return resolve(null);

            const price = Number(
              match[1]
                .replace(/\./g, "")
                .replace(",", ".")
            );

            resolve(
              Number.isFinite(price)
                ? price
                : null
            );
          });
        }
      )
      .on("error", () => resolve(null));
  });
}

/* ======================
   SCRIPT PRINCIPAL
====================== */
async function updateAmazonPrices() {
  console.log("🔄 Atualizando preços da Amazon\n");

  const LIMIT_DATE = new Date(
    Date.now() - HOURS_LIMIT * 60 * 60 * 1000
  );

  const offers = await prisma.offer.findMany({
    where: {
      store: Store.AMAZON,
      OR: [
        { updatedAt: { lt: LIMIT_DATE } },
        { price: 0 },
      ],
    },
    select: {
      id: true,
      externalId: true,
      price: true,
      updatedAt: true,
      product: {
        select: { name: true },
      },
    },
    orderBy: { updatedAt: "asc" },
  });

  console.log(`🔎 ${offers.length} ofertas\n`);

  for (const offer of offers) {
    console.log(
      `🔎 ${offer.externalId} — ${offer.product.name}`
    );

    const result = await fetchAmazonPrice(
      offer.externalId
    );

    /* ---------- API OK ---------- */
    if (typeof result === "number" && result > 0) {
      await prisma.offer.update({
        where: { id: offer.id },
        data: {
          price: result,
          updatedAt: new Date(),
          affiliateUrl: `https://www.amazon.com.br/dp/${offer.externalId}?tag=${PARTNER_TAG}`,
        },
      });

      await prisma.offerPriceHistory.create({
        data: {
          offerId: offer.id,
          price: result,
        },
      });

      console.log(`✅ API: R$ ${result}`);
    }

    /* ---------- API INDISPONÍVEL ---------- */
    else if (result === null) {
      await prisma.offer.update({
        where: { id: offer.id },
        data: { price: 0 },
      });

      console.log("⚠️ Indisponível via API");
    }

    /* ---------- API BLOQUEADA → SCRAPING ---------- */
    else if (result === "NOT_ACCESSIBLE") {
      const canScrape =
        FORCE_SCRAPE ||
        Date.now() -
          offer.updatedAt.getTime() >
          SCRAPE_INTERVAL_MS;

      if (canScrape) {
        console.log(
          "🕷️ API bloqueada → scraping (FORÇADO)"
        );

        const scraped =
          await scrapeAmazonPrice(
            offer.externalId
          );

        if (scraped && scraped > 0) {
          await prisma.offer.update({
            where: { id: offer.id },
            data: { price: scraped },
          });

          await prisma.offerPriceHistory.create({
            data: {
              offerId: offer.id,
              price: scraped,
            },
          });

          console.log(
            `🕷️ Scrape: R$ ${scraped}`
          );
        } else {
          await prisma.offer.update({
            where: { id: offer.id },
            data: { price: 0 },
          });

          console.log(
            "⚠️ Scraping falhou"
          );
        }
      } else {
        console.log(
          "⏳ Scraping já feito hoje"
        );
      }
    }

    console.log("—".repeat(40));
    await new Promise((r) =>
      setTimeout(r, REQUEST_DELAY_MS)
    );
  }

  console.log("\n🏁 Finalizado");
  await prisma.$disconnect();
}

updateAmazonPrices().catch(async (err) => {
  console.error("❌ Erro:", err);
  await prisma.$disconnect();
  process.exit(1);
});
