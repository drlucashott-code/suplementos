// scripts/sync-reviews.ts
import { PrismaClient } from "@prisma/client";
import axios from "axios";
import * as cheerio from "cheerio";

const prisma = new PrismaClient();

async function fetchAmazonData(asin: string) {
  const url = `https://www.amazon.com.br/dp/${asin}`;
  try {
    const { data } = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "pt-BR,pt;q=0.9",
      },
      timeout: 10000,
    });

    const $ = cheerio.load(data);
    
    // Captura Nota (ex: "4,7 de 5 estrelas")
    const ratingRaw = $("span.a-icon-alt").first().text(); 
    // Captura Contagem (ex: "74.440 avaliações")
    const countRaw = $("#acrCustomerReviewText").first().text();

    const rating = ratingRaw ? parseFloat(ratingRaw.split(" ")[0].replace(",", ".")) : null;
    const count = countRaw ? parseInt(countRaw.replace(/[^0-9]/g, "")) : null;

    return { rating, count };
  } catch (error: any) {
    console.error(`❌ Erro no ASIN ${asin}: ${error.message}`);
    return null;
  }
}

async function main() {
  const offers = await prisma.offer.findMany({
    where: { store: "AMAZON" },
    select: { id: true, externalId: true }
  });

  console.log(`\n🚀 Iniciando atualização de ${offers.length} ofertas da Amazon...`);

  for (const offer of offers) {
    const result = await fetchAmazonData(offer.externalId);
    
    if (result && result.rating !== null) {
      await prisma.offer.update({
        where: { id: offer.id },
        data: {
          ratingAverage: result.rating,
          ratingCount: result.count,
        }
      });
      console.log(`✅ ASIN ${offer.externalId}: ${result.rating}⭐ (${result.count} reviews)`);
    }

    // Delay de 3 segundos para evitar bloqueio (Amazon é sensível)
    await new Promise(res => setTimeout(res, 3000));
  }

  console.log("\n🏁 Sincronização concluída com sucesso!");
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());