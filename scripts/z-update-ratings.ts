import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import axios from "axios";
import * as cheerio from "cheerio";

const prisma = new PrismaClient({
  log: ["error"],
});

/**
 * SCRAPER: Captura Notas e Avaliações da Amazon
 */
async function fetchAmazonRatings(asin: string) {
  const url = `https://www.amazon.com.br/dp/${asin}`;

  try {
    const { data } = await axios.get(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "pt-BR,pt;q=0.9",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
      },
      timeout: 15000,
    });

    const $ = cheerio.load(data);

    const ratingText =
      $("#acrPopover").attr("title") || $("span.a-icon-alt").first().text();
    const rating = ratingText
      ? parseFloat(ratingText.split(" ")[0].replace(",", "."))
      : null;

    const countRaw = $("#acrCustomerReviewText").first().text();
    const count = countRaw ? parseInt(countRaw.replace(/[^0-9]/g, ""), 10) : null;

    return { rating, count };
  } catch (error: unknown) {
    const msg = (error as Error).message;
    if (msg.includes("404")) return { rating: null, count: null, error: "404" };
    console.error(`  ❌ Erro no ASIN ${asin}: ${msg}`);
    return null;
  }
}

async function main() {
  const trintaDiasAtras = new Date();
  trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30);

  const products = await prisma.dynamicProduct.findMany({
    where: {
      OR: [
        { ratingsUpdatedAt: null },
        { ratingsUpdatedAt: { lt: trintaDiasAtras } },
      ],
    },
    select: { id: true, asin: true, name: true },
    orderBy: [{ ratingsUpdatedAt: "asc" }, { createdAt: "asc" }],
  });

  if (products.length === 0) {
    console.log("✅ Tudo em dia! Nenhum produto precisa de atualização de rating no momento.");
    return;
  }

  console.log(`\n🚀 Iniciando atualização de fila para ${products.length} produtos...`);

  let atualizados = 0;

  for (const product of products) {
    console.log(
      `🔍 [${product.asin}] - Processando: ${product.name.substring(0, 45)}...`
    );

    const result = await fetchAmazonRatings(product.asin);

    await prisma.dynamicProduct.update({
      where: { id: product.id },
      data: {
        ratingAverage: result?.rating ?? undefined,
        ratingCount: result?.count ?? undefined,
        ratingsUpdatedAt: new Date(),
      },
    });

    if (result && result.rating !== null) {
      console.log(`  ✅ Sucesso: ${result.rating}⭐ | ${result.count} reviews`);
      atualizados++;
    } else {
      console.log("  ⚠️ Dados não encontrados ou erro. Data de checagem atualizada.");
    }

    await new Promise((res) => setTimeout(res, 5000));
  }

  console.log(
    `\n🏁 Sincronização concluída! Total de produtos atualizados nesta rodada: ${atualizados}`
  );
}

main()
  .catch((e) => console.error("❌ Erro fatal:", e))
  .finally(async () => await prisma.$disconnect());
