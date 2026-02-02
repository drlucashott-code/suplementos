import "dotenv/config";
import https from "https";
import crypto from "node:crypto";

/* ======================
    CONFIGURAÇÕES AWS
====================== */
const { AMAZON_ACCESS_KEY, AMAZON_SECRET_KEY, AMAZON_PARTNER_TAG } = process.env;
const AMAZON_HOST = "webservices.amazon.com.br";
const AMAZON_REGION = "us-east-1";

/* ======================
    DADOS DE TESTE
====================== */
const TARGET_ASINS = ["B0CLDVSB6M", "B0CLQB9QM4"];

/* ======================
    HELPERS DE ASSINATURA
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
    LOGICA DE CAPTURA INTELIGENTE
====================== */
function extractBestOffer(item: any) {
  const v1Listings = item.Offers?.Listings || [];
  const v2Listings = item.OffersV2?.Listings || [];
  const allListings = [...v1Listings, ...v2Listings];

  // 1. Tenta achar a Amazon.com.br primeiro (A "Segunda Chance")
  const amazonOffer = allListings.find(l => 
    l.MerchantInfo?.Name?.toLowerCase().includes("amazon")
  );

  if (amazonOffer) {
    return {
      price: amazonOffer.Price?.Money?.Amount || amazonOffer.Price?.Amount,
      merchant: "Amazon.com.br",
      source: "Venda Direta Amazon"
    };
  }

  // 2. Se não tem Amazon, olha o vencedor da Buybox
  const buyBox = v2Listings[0] || v1Listings[0];
  if (!buyBox) return null;

  const merchant = buyBox.MerchantInfo?.Name || "Marketplace";
  let price = buyBox.Price?.Money?.Amount || buyBox.Price?.Amount || 0;

  // 3. Regra Especial: Se for Loja Suplemento, usamos o preço de segurança (Highest)
  if (merchant === "Loja Suplemento") {
    const highest = item.Offers?.Summaries?.[0]?.HighestPrice?.Amount;
    return {
      price: highest || price,
      merchant: "Loja Suplemento",
      source: highest ? "Preço de Segurança (Highest)" : "Buybox Direta"
    };
  }

  return { price, merchant, source: "Marketplace Buybox" };
}

/* ======================
    REQUEST PA-API
====================== */
async function fetchPrices() {
  const payload = JSON.stringify({
    ItemIds: TARGET_ASINS,
    Resources: [
      "Offers.Listings.Price",
      "Offers.Listings.MerchantInfo",
      "OffersV2.Listings.Price",
      "OffersV2.Listings.MerchantInfo",
      "Offers.Summaries.HighestPrice"
    ],
    PartnerTag: AMAZON_PARTNER_TAG,
    PartnerType: "Associates",
  });

  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.substring(0, 8);
  const credentialScope = `${dateStamp}/${AMAZON_REGION}/ProductAdvertisingAPI/aws4_request`;

  const canonicalHeaders = `content-encoding:amz-1.0\ncontent-type:application/json; charset=utf-8\nhost:${AMAZON_HOST}\nx-amz-date:${amzDate}\n`;
  const signedHeaders = "content-encoding;content-type;host;x-amz-date";
  const canonicalRequest = `POST\n/paapi5/getitems\n\n${canonicalHeaders}\n${signedHeaders}\n${sha256(payload)}`;
  const stringToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${credentialScope}\n${sha256(canonicalRequest)}`;
  const signingKey = getSignatureKey(AMAZON_SECRET_KEY!, dateStamp, AMAZON_REGION, "ProductAdvertisingAPI");
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
    },
  };

  const req = https.request(options, (res) => {
    let data = "";
    res.on("data", (chunk) => data += chunk);
    res.on("end", () => {
      const response = JSON.parse(data);
      console.log(`🛡️ Relatório de Preços [${new Date().toLocaleTimeString()}]\n`);

      response.ItemsResult?.Items?.forEach((item: any) => {
        const result = extractBestOffer(item);
        if (result) {
          console.log(`ASIN: ${item.ASIN}`);
          console.log(`Preço: R$ ${result.price.toFixed(2)}`);
          console.log(`Loja: ${result.merchant}`);
          console.log(`Estratégia: ${result.source}`);
          console.log("-----------------------------------");
        }
      });
    });
  });

  req.write(payload);
  req.end();
}

fetchPrices().catch(console.error);