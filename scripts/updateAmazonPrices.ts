import "dotenv/config";
import https from "https";
import crypto from "node:crypto";
import { PrismaClient, Store } from "@prisma/client";

const prisma = new PrismaClient();

/* ======================
   CONFIG
====================== */
const HOURS_LIMIT = 6;
const REQUEST_DELAY_MS = 1800;

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

if (!AMAZON_ACCESS_KEY || !AMAZON_SECRET_KEY || !AMAZON_PARTNER_TAG) {
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
   PRICE EXTRACTOR (V1 + V2)
====================== */
function extractAmazonPrice(json: any): number | null {
  const item = json?.ItemsResult?.Items?.[0];
  if (!item) return null;

  // V1
  const priceV1 =
    item?.Offers?.Listings?.[0]?.Price?.Amount;
  if (typeof priceV1 === "number") {
    return priceV1;
  }

  // V2
  const listingsV2 = item?.OffersV2?.Listings;
  if (Array.isArray(listingsV2)) {
    const buyBox =
      listingsV2.find(
        (l: any) => l?.IsBuyBoxWinner === true
      ) ?? listingsV2[0];

    const priceV2 =
      buyBox?.Price?.Money?.Amount;

    if (typeof priceV2 === "number") {
      return priceV2;
    }
  }

  return null;
}

/* ======================
   FETCH PRICE
====================== */
async function fetchAmazonPrice(
  asin: string
): Promise<number | null> {
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
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
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
   SCRIPT
====================== */
async function updateAmazonPrices() {
  console.log(
    "🔄 Atualizando preços da Amazon (price=0 ou > 6h)\n"
  );

  const LIMIT_DATE = new Date(
    Date.now() - HOURS_LIMIT * 60 * 60 * 1000
  );

  const offers = await prisma.offer.findMany({
    where: {
      store: Store.AMAZON,
      OR: [
        { price: 0 },
        { updatedAt: { lt: LIMIT_DATE } },
      ],
    },
    include: {
      product: true,
    },
    orderBy: {
      updatedAt: "asc",
    },
  });

  console.log(`🔎 ${offers.length} ofertas para atualizar\n`);

  for (const offer of offers) {
    console.log(
      `🔎 ASIN ${offer.externalId}\n` +
      `   Produto: ${offer.product.name}\n` +
      `   Preço antes: ${offer.price}\n` +
      `   updatedAt antes: ${offer.updatedAt.toISOString()}`
    );

    const price = await fetchAmazonPrice(offer.externalId);

    const data: any = {
      price: price ?? 0,       // 🔑 indisponível = 0
      updatedAt: new Date(),   // 🔑 sempre marca tentativa
    };

    if (price !== null) {
      data.affiliateUrl =
        `https://www.amazon.com.br/dp/${offer.externalId}?tag=${PARTNER_TAG}`;
    }

    const updated = await prisma.offer.update({
      where: { id: offer.id },
      data,
    });

    console.log(
      price === null
        ? "⚠️ Preço não encontrado → marcado como indisponível (price=0)"
        : `✅ Preço encontrado: R$ ${price}`
    );

    console.log(
      `   Preço salvo: ${updated.price}\n` +
      `   updatedAt salvo: ${updated.updatedAt.toISOString()}`
    );

    console.log("—".repeat(50));

    await new Promise((r) =>
      setTimeout(r, REQUEST_DELAY_MS)
    );
  }

  console.log("\n🏁 Amazon atualizada");
  await prisma.$disconnect();
}

updateAmazonPrices().catch(async (err) => {
  console.error("❌ Erro no script:", err);
  await prisma.$disconnect();
  process.exit(1);
});
