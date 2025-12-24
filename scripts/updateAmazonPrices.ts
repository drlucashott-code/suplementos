import "dotenv/config";
import https from "https";
import crypto from "node:crypto";
import { PrismaClient, Store } from "@prisma/client";

const prisma = new PrismaClient();

/* ======================
   ENV CHECK
====================== */
const AMAZON_ACCESS_KEY = process.env.AMAZON_ACCESS_KEY;
const AMAZON_SECRET_KEY = process.env.AMAZON_SECRET_KEY;
const AMAZON_ASSOCIATE_TAG = process.env.AMAZON_ASSOCIATE_TAG;
const AMAZON_HOST = process.env.AMAZON_HOST ?? "webservices.amazon.com.br";
const AMAZON_REGION = process.env.AMAZON_REGION ?? "us-east-1";
const AMAZON_SERVICE = "ProductAdvertisingAPI";

if (
  !AMAZON_ACCESS_KEY ||
  !AMAZON_SECRET_KEY ||
  !AMAZON_ASSOCIATE_TAG
) {
  console.error("ENV DEBUG:", {
    AMAZON_ACCESS_KEY: !!AMAZON_ACCESS_KEY,
    AMAZON_SECRET_KEY: !!AMAZON_SECRET_KEY,
    AMAZON_ASSOCIATE_TAG: !!AMAZON_ASSOCIATE_TAG,
    AMAZON_HOST,
    AMAZON_REGION,
  });

  throw new Error("Credenciais da Amazon não configuradas");
}

/* ======================
   NON-NULL ASSERTIONS
====================== */
const ACCESS_KEY = AMAZON_ACCESS_KEY!;
const SECRET_KEY = AMAZON_SECRET_KEY!;
const ASSOCIATE_TAG = AMAZON_ASSOCIATE_TAG!;
const HOST = AMAZON_HOST!;
const REGION = AMAZON_REGION!;

/* ======================
   HELPERS AWS
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
   FETCH AMAZON PRICE
====================== */
async function fetchAmazonPrice(asin: string): Promise<number | null> {
  const payload = JSON.stringify({
    ItemIds: [asin],
    Resources: ["Offers.Listings.Price"],
    PartnerTag: ASSOCIATE_TAG,
    PartnerType: "Associates",
    Marketplace: "www.amazon.com.br",
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
          const price =
            json?.ItemsResult?.Items?.[0]?.Offers?.Listings?.[0]?.Price?.Amount;
          resolve(price ?? null);
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
  console.log("🔄 Atualizando preços da Amazon...");

  const offers = await prisma.offer.findMany({
    where: { store: Store.AMAZON },
    include: { product: true },
  });

  if (offers.length === 0) {
    console.log("⚠️ Nenhuma offer da Amazon encontrada");
    return;
  }

  for (const offer of offers) {
    console.log(`🔎 ASIN ${offer.externalId}`);

    const price = await fetchAmazonPrice(offer.externalId);
    if (!price) {
      console.log(`⚠️ Preço não encontrado para ${offer.externalId}`);
      continue;
    }

    await prisma.offer.update({
      where: { id: offer.id },
      data: {
        price,
        affiliateUrl: `https://www.amazon.com.br/dp/${offer.externalId}?tag=${ASSOCIATE_TAG}`,
      },
    });

    console.log(`✅ ${offer.product.name} — R$ ${price}`);
  }

  console.log("🏁 Amazon atualizada");
  await prisma.$disconnect();
}

updateAmazonPrices().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
