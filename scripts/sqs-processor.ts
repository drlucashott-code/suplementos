import 'dotenv/config';
import https from "https";
import crypto from "node:crypto";
import { SQSClient, ReceiveMessageCommand, DeleteMessageCommand } from "@aws-sdk/client-sqs";
import { Store } from "@prisma/client";
import { prisma } from "../src/lib/prisma";

/* ======================
    CONFIGURAÇÕES
====================== */
const sqsClient = new SQSClient({ region: process.env.AWS_REGION || "us-east-2" });
const queueUrl = process.env.AWS_QUEUE_URL;

const AMAZON_ACCESS_KEY = process.env.AMAZON_ACCESS_KEY;
const AMAZON_SECRET_KEY = process.env.AMAZON_SECRET_KEY;
const AMAZON_PARTNER_TAG = process.env.AMAZON_PARTNER_TAG;
const AMAZON_HOST = process.env.AMAZON_HOST ?? "webservices.amazon.com.br";
const AMAZON_REGION = process.env.AMAZON_REGION ?? "us-east-1";
const AMAZON_SERVICE = "ProductAdvertisingAPI";

if (!AMAZON_ACCESS_KEY || !AMAZON_SECRET_KEY || !AMAZON_PARTNER_TAG || !queueUrl) {
  throw new Error("❌ Credenciais ou Fila SQS não configuradas no .env");
}

/* ======================
    INTERFACES
====================== */
interface AmazonListing {
  IsBuyBoxWinner?: boolean;
  Price?: { Amount?: number; Money?: { Amount: number } };
  MerchantInfo?: { Name: string };
}

interface AmazonItem {
  ASIN: string;
  Offers?: { Listings?: AmazonListing[] };
  OffersV2?: { Listings?: AmazonListing[] };
}

interface AmazonResponse {
  ItemsResult?: { Items?: AmazonItem[] };
  Errors?: Array<{ Message: string; Code: string }>;
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
    PROCESSADOR DA FILA (Loop de Esvaziamento)
====================== */
async function processQueue() {
  console.log("🔍 [SQS] Iniciando limpeza da fila...");
  let hasMessages = true;

  while (hasMessages) {
    try {
      const data = await sqsClient.send(new ReceiveMessageCommand({
        QueueUrl: queueUrl,
        MaxNumberOfMessages: 10, // Processa em lotes de 10
        WaitTimeSeconds: 5,      // Long Polling
      }));

      if (!data.Messages || data.Messages.length === 0) {
        console.log("📭 Fila esvaziada ou sem mensagens pendentes.");
        hasMessages = false;
        break;
      }

      console.log(`📩 Recebidas ${data.Messages.length} mensagens para processar...`);

      for (const message of data.Messages) {
        const { asin } = JSON.parse(message.Body || "{}") as { asin: string };
        
        if (!asin) {
          await sqsClient.send(new DeleteMessageCommand({ QueueUrl: queueUrl, ReceiptHandle: message.ReceiptHandle }));
          continue;
        }

        const offer = await prisma.offer.findFirst({
          where: { externalId: asin, store: Store.AMAZON },
          include: { product: true }
        });

        if (offer) {
          const payload = JSON.stringify({
            ItemIds: [asin],
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
          const credentialScope = `${dateStamp}/${AMAZON_REGION}/${AMAZON_SERVICE}/aws4_request`;
          const signingKey = getSignatureKey(AMAZON_SECRET_KEY!, dateStamp, AMAZON_REGION, AMAZON_SERVICE);
          
          const canonicalHeaders = `content-encoding:amz-1.0\ncontent-type:application/json; charset=utf-8\nhost:${AMAZON_HOST}\nx-amz-date:${amzDate}\n`;
          const signedHeaders = "content-encoding;content-type;host;x-amz-date";
          const canonicalRequest = `POST\n/paapi5/getitems\n\n${canonicalHeaders}\n${signedHeaders}\n${sha256(payload)}`;
          const stringToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${credentialScope}\n${sha256(canonicalRequest)}`;
          const signature = crypto.createHmac("sha256", signingKey).update(stringToSign).digest("hex");

          const apiResponse = await new Promise<AmazonResponse>((resolve) => {
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
              let d = "";
              res.on("data", (chunk) => (d += chunk));
              res.on("end", () => {
                try { resolve(JSON.parse(d) as AmazonResponse); } catch { resolve({}); }
              });
            });
            req.write(payload);
            req.end();
          });

          const item = apiResponse?.ItemsResult?.Items?.[0];
          let price = 0;
          let merchantName = "Desconhecido";

          const listingsV2 = item?.OffersV2?.Listings;
          if (Array.isArray(listingsV2)) {
            const buyBox = listingsV2.find((l) => l?.IsBuyBoxWinner) ?? listingsV2[0];
            const p = buyBox?.Price?.Money?.Amount;
            if (typeof p === "number") {
              price = p;
              merchantName = buyBox?.MerchantInfo?.Name || "Desconhecido";
            }
          }

          if (price === 0) {
            const listing1 = item?.Offers?.Listings?.[0];
            const p1 = listing1?.Price?.Amount;
            if (typeof p1 === "number") {
              price = p1;
              merchantName = listing1?.MerchantInfo?.Name || "Desconhecido";
            }
          }

          let logStatus = "";
          if (price > 0 && merchantName !== "Loja Suplemento") {
            logStatus = `✅ R$ ${price}`;
            await prisma.offer.update({
              where: { id: offer.id },
              data: { price, updatedAt: new Date() }
            });

            const lastHistory = await prisma.offerPriceHistory.findFirst({
              where: { offerId: offer.id },
              orderBy: { createdAt: 'desc' }
            });

            const isSameDay = lastHistory && lastHistory.createdAt.toDateString() === now.toDateString();

            if (!isSameDay || (lastHistory && lastHistory.price !== price)) {
              await prisma.offerPriceHistory.create({ data: { offerId: offer.id, price } });
              logStatus += " | 💾 Histórico Salvo";
            } else {
              logStatus += " | ⏩ Histórico Mantido";
            }
          } else {
            logStatus = merchantName === "Loja Suplemento" ? "🚫 Excluída" : "🔻 Sem Estoque/Erro";
            await prisma.offer.update({
              where: { id: offer.id },
              data: { price: 0, updatedAt: new Date() }
            });
          }

          const logName = offer.product.name.substring(0, 25).padEnd(25);
          console.log(`   ${logName} | ${asin.padEnd(10)} | 🏪 ${merchantName.padEnd(15)} | ${logStatus}`);
        }

        // Deleta a mensagem após o processamento
        await sqsClient.send(new DeleteMessageCommand({
          QueueUrl: queueUrl,
          ReceiptHandle: message.ReceiptHandle
        }));
      }
      
      // Delay de 1s entre mensagens do lote para respeitar o rate limit da Amazon
      await new Promise(r => setTimeout(r, 1000));

    } catch (err) {
      console.error("💥 Erro no ciclo de processamento:", err);
      hasMessages = false; // Interrompe o loop em caso de erro crítico
    }
  }
}

processQueue().finally(async () => {
  await prisma.$disconnect();
  process.exit(0);
});