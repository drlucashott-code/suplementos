'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import https from 'https';
import crypto from 'node:crypto';

/* ======================
ENV
====================== */

const AMAZON_ACCESS_KEY = process.env.AMAZON_ACCESS_KEY!;
const AMAZON_SECRET_KEY = process.env.AMAZON_SECRET_KEY!;
const AMAZON_PARTNER_TAG = process.env.AMAZON_PARTNER_TAG!;

const AMAZON_HOST = "webservices.amazon.com.br";
const AMAZON_REGION = "us-east-1";
const AMAZON_SERVICE = "ProductAdvertisingAPI";

/* ======================
TYPES
====================== */

interface AmazonListing {
  IsBuyBoxWinner?: boolean;
  Price?: {
    Amount?: number;
    Money?: {
      Amount: number;
    };
  };
  MerchantInfo?: {
    Name?: string;
  };
}

interface AmazonItem {
  ASIN?: string;
  ItemInfo?: {
    Title?: {
      DisplayValue?: string;
    };
    ByLineInfo?: {
      Brand?: {
        DisplayValue?: string;
      };
      Manufacturer?: {
        DisplayValue?: string;
      };
    };
  };
  Images?: {
    Primary?: {
      Large?: {
        URL?: string;
      };
    };
  };
  OffersV2?: {
    Listings?: AmazonListing[];
  };
  Offers?: {
    Listings?: AmazonListing[];
  };
}

type PriceResult = {
  price: number;
  merchantName: string;
  item?: AmazonItem;
};

/* ======================
HELPERS
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

const delay = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

/* ======================
FETCH AMAZON
====================== */

async function fetchAmazonPrice(
  asin: string
): Promise<PriceResult | null> {

  const payload = JSON.stringify({
    ItemIds: [asin],
    Resources: [
      "ItemInfo.Title",
      "ItemInfo.ByLineInfo",
      "Images.Primary.Large",
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

  const canonicalHeaders =
`content-encoding:amz-1.0
content-type:application/json; charset=utf-8
host:${AMAZON_HOST}
x-amz-date:${amzDate}
`;

  const signedHeaders =
    "content-encoding;content-type;host;x-amz-date";

  const canonicalRequest =
`POST
/paapi5/getitems

${canonicalHeaders}
${signedHeaders}
${sha256(payload)}`;

  const credentialScope =
    `${dateStamp}/${AMAZON_REGION}/${AMAZON_SERVICE}/aws4_request`;

  const stringToSign =
`AWS4-HMAC-SHA256
${amzDate}
${credentialScope}
${sha256(canonicalRequest)}`;

  const signingKey = getSignatureKey(
    AMAZON_SECRET_KEY,
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
      "X-Amz-Target":
        "com.amazon.paapi5.v1.ProductAdvertisingAPIv1.GetItems",
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
          const item = json?.ItemsResult?.Items?.[0] as AmazonItem | undefined;

          if (!item) {
            resolve(null);
            return;
          }

          let price = 0;
          let merchantName = "Desconhecido";

          const listingsV2 = item?.OffersV2?.Listings;

          if (Array.isArray(listingsV2)) {

            const buyBox =
              listingsV2.find((l: AmazonListing) => l?.IsBuyBoxWinner) ??
              listingsV2[0];

            const p =
              buyBox?.Price?.Money?.Amount ??
              buyBox?.Price?.Amount;

            if (typeof p === "number") {
              price = p;
              merchantName =
                buyBox?.MerchantInfo?.Name ?? "Desconhecido";
            }
          }

          if (price === 0) {

            const listing1 = item?.Offers?.Listings?.[0];

            const p1 = listing1?.Price?.Amount;

            if (typeof p1 === "number") {

              price = p1 > 1000 ? p1 / 100 : p1;

              merchantName =
                listing1?.MerchantInfo?.Name ?? "Desconhecido";
            }
          }

          resolve({
            price,
            merchantName,
            item
          });

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
ACTION IMPORT
====================== */

export async function importCasaViaAPI(
  asinsRaw: string,
  categoryId: string
) {

  const asinList = asinsRaw
    .split(/[\s,]+/)
    .map((a) => a.trim())
    .filter(Boolean);

  const logs: string[] = [];

  for (const asin of asinList) {

    try {

      await delay(2000);

      const result = await fetchAmazonPrice(asin);

      if (!result) {

        logs.push(`❌ ${asin}: Não encontrado na API`);
        continue;

      }

      const { price, merchantName, item } = result;

      if (merchantName === "Loja Suplemento") {

        logs.push(`🚫 ${asin}: Excluído (Loja Suplemento)`);
        continue;

      }

      const name =
        item?.ItemInfo?.Title?.DisplayValue ??
        "Produto Amazon";

      const brand =
        item?.ItemInfo?.ByLineInfo?.Brand?.DisplayValue ??
        item?.ItemInfo?.ByLineInfo?.Manufacturer?.DisplayValue ??
        "Amazon";

      const imageUrl =
        item?.Images?.Primary?.Large?.URL ?? "";

      const url =
        `https://www.amazon.com.br/dp/${asin}?tag=${AMAZON_PARTNER_TAG}`;

      await prisma.homeProduct.create({

        data: {

          name,
          imageUrl,
          url,
          totalPrice: price,
          categoryId,

          attributes: {
            brand,
            seller: merchantName
          }

        }

      });

      if (price === 0) {

        logs.push(`⚠️ ${asin}: Importado sem preço`);

      } else {

        logs.push(
          `✅ R$ ${price.toFixed(2)} | ${asin} | 🏪 ${merchantName}`
        );

      }

    } catch (error) {

      console.error(error);

      logs.push(`❌ ${asin}: erro na importação`);

    }

  }

  revalidatePath('/admin/casa/produtos');

  return { logs };

}