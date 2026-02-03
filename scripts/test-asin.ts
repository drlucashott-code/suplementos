import "dotenv/config";
import https from "https";
import crypto from "node:crypto";

/* ======================
   CONFIGURAÇÕES
====================== */
const ASINS_ALVO = ["B09MKTR5TC", "B0CLQB9QM4","B09YZ2Y1W3"]; 

// USANDO APENAS A LISTA QUE JÁ SABEMOS QUE FUNCIONA (DO SEU TESTE ANTERIOR)
const SAFE_RESOURCES = [
  "ItemInfo.Title",
  "OffersV2.Listings.Price",
  "OffersV2.Listings.MerchantInfo",
  "OffersV2.Listings.Availability.Message",       // Texto
  "OffersV2.Listings.Availability.MaxOrderQuantity" // Número
];

const AMAZON_HOST = process.env.AMAZON_HOST ?? "webservices.amazon.com.br";
const AMAZON_REGION = process.env.AMAZON_REGION ?? "us-east-1";

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
   FUNÇÃO DE CONSULTA BLINDADA
====================== */
async function checkGhostProducts() {
  console.log(`\n👻 INVESTIGANDO PRODUTOS FANTASMAS: ${ASINS_ALVO.join(", ")}`);
  
  const payload = JSON.stringify({
    ItemIds: ASINS_ALVO,
    Resources: SAFE_RESOURCES, // Lista Segura
    PartnerTag: process.env.AMAZON_PARTNER_TAG,
    PartnerType: "Associates",
    Marketplace: "www.amazon.com.br"
  });

  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.substring(0, 8);
  const canonicalHeaders = `content-encoding:amz-1.0\ncontent-type:application/json; charset=utf-8\nhost:${AMAZON_HOST}\nx-amz-date:${amzDate}\n`;
  const signedHeaders = "content-encoding;content-type;host;x-amz-date";
  const canonicalRequest = `POST\n/paapi5/getitems\n\n${canonicalHeaders}\n${signedHeaders}\n${sha256(payload)}`;
  const credentialScope = `${dateStamp}/${AMAZON_REGION}/ProductAdvertisingAPI/aws4_request`;
  const stringToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${credentialScope}\n${sha256(canonicalRequest)}`;
  const signingKey = getSignatureKey(process.env.AMAZON_SECRET_KEY!, dateStamp, AMAZON_REGION, "ProductAdvertisingAPI");
  const signature = crypto.createHmac("sha256", signingKey).update(stringToSign).digest("hex");

  const options = {
    hostname: AMAZON_HOST,
    path: "/paapi5/getitems",
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Encoding": "amz-1.0",
      "X-Amz-Date": amzDate,
      Authorization: `AWS4-HMAC-SHA256 Credential=${process.env.AMAZON_ACCESS_KEY}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
    },
  };

  const req = https.request(options, (res) => {
    let data = "";
    res.on("data", (chunk) => (data += chunk));
    res.on("end", () => {
      try {
        const json = JSON.parse(data);

        if (json.Errors) {
            console.log("❌ Erro API:", json.Errors);
            return;
        }
        if (!json.ItemsResult?.Items) {
            console.log("❌ Continua retornando VAZIO. O problema pode ser os ASINs nesse momento.");
            console.log("Dump:", JSON.stringify(json, null, 2));
            return;
        }

        // PROCESSA CADA ITEM
        json.ItemsResult.Items.forEach((item: any) => {
            console.log(`\n📦 ASIN: [${item.ASIN}]`);
            
            // Verificação de Erro Específico por Item (Ex: ItemNotAccessible)
            // A Amazon às vezes retorna o item mas com mensagem de erro dentro
            if (item.Errors) {
                console.log(`   ⚠️  Erro no Item: ${item.Errors[0].Code} - ${item.Errors[0].Message}`);
            }

            const title = item.ItemInfo?.Title?.DisplayValue || "Título Desconhecido";
            const listing = item.OffersV2?.Listings?.[0];

            console.log(`   📄 Título: "${title.substring(0, 50)}..."`);

            if (!listing) {
                console.log("   🔻 STATUS: Sem Oferta Ativa (Buy Box Vazia / Sem Estoque)");
                
                // Se não tem listing, verificamos se o JSON trouxe alguma pista em OffersV2
                if (item.OffersV2) {
                   console.log("   🔍 Dump do OffersV2 (para análise):");
                   console.log(JSON.stringify(item.OffersV2, null, 2)); 
                }
                return;
            }

            const price = listing.Price?.DisplayAmount;
            const merchant = listing.MerchantInfo?.Name;
            const avail = listing.Availability;

            console.log(`   💰 Preço: ${price}`);
            console.log(`   🏪 Vendedor: ${merchant}`);
            
            // AQUI ESTÁ A INFORMAÇÃO QUE VOCÊ QUER
            console.log("   📊 DADOS DE ESTOQUE RECEBIDOS:");
            console.log(JSON.stringify(avail, null, 2));
            
            // NOSSA INTERPRETAÇÃO
            const message = avail?.Message || "";
            const qty = avail?.MaxOrderQuantity;
            
            if (qty === 1 || /apenas 1|resta 1|only 1/i.test(message)) {
                console.log("   🔥 RESULTADO: ESTOQUE 1 DETECTADO (Vendedor Ruim?)");
            } else {
                console.log("   ✅ RESULTADO: Estoque OK (ou não informado)");
            }
        });

      } catch (e) {
        console.log("Erro JSON", e);
      }
    });
  });

  req.write(payload);
  req.end();
}

checkGhostProducts();