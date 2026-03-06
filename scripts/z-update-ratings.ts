import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import axios from "axios";
import * as cheerio from "cheerio";

const prisma = new PrismaClient({
  log: ['error'],
});

/**
 * SCRAPER: Captura Notas e Avaliações da Amazon
 */
async function fetchAmazonRatings(asin: string) {
  const url = `https://www.amazon.com.br/dp/${asin}`;
  try {
    const { data } = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "pt-BR,pt;q=0.9",
      },
      timeout: 15000,
    });

    const $ = cheerio.load(data);
    
    // Captura Nota (ex: "4,7 de 5 estrelas")
    const ratingRaw = $("span.a-icon-alt").first().text(); 
    const rating = ratingRaw ? parseFloat(ratingRaw.split(" ")[0].replace(",", ".")) : null;

    // Captura Contagem de Reviews
    const countRaw = $("#acrCustomerReviewText").first().text();
    const count = countRaw ? parseInt(countRaw.replace(/[^0-9]/g, "")) : null;

    return { rating, count };
  } catch (error: unknown) {
    console.error(`  ❌ Erro no ASIN ${asin}: ${(error as Error).message}`);
    return null;
  }
}

async function main() {
  // 1. BUSCA TODOS OS PRODUTOS (Sem filtro de data)
  const products = await prisma.dynamicProduct.findMany({
    select: { id: true, asin: true, name: true }
  });

  if (products.length === 0) {
    console.log("⚠️ Nenhum produto dinâmico encontrado no banco.");
    return;
  }

  console.log(`\n🚀 Iniciando atualização TOTAL de ${products.length} produtos...`);

  let atualizados = 0;

  for (const product of products) {
    console.log(`🔍 [${product.asin}] - Processando: ${product.name.substring(0, 40)}...`);
    
    const result = await fetchAmazonRatings(product.asin);
    
    if (result && result.rating !== null) {
      await prisma.dynamicProduct.update({
        where: { id: product.id },
        data: {
          ratingAverage: result.rating,
          ratingCount: result.count,
          // O updatedAt será atualizado automaticamente pelo Prisma
        }
      });
      console.log(`  ✅ Sucesso: ${result.rating}⭐ | ${result.count} reviews`);
      atualizados++;
    } else {
      console.log(`  ⚠️ Pulado ou erro na captura para este ASIN.`);
    }

    // Delay de 4 segundos para evitar que a Amazon bloqueie seu IP
    await new Promise(res => setTimeout(res, 4000));
  }

  console.log(`\n🏁 Sincronização concluída! Total de produtos processados: ${atualizados}`);
}

main()
  .catch(e => console.error("❌ Erro fatal:", e))
  .finally(async () => await prisma.$disconnect());