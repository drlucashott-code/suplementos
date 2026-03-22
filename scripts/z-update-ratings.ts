import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import axios from "axios";
import * as cheerio from "cheerio";

const prisma = new PrismaClient({
  log: ["error"],
});

const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

type RatingResult =
  | { rating: number | null; count: number | null; status: "success" | "not_found" }
  | { rating: null; count: null; status: "error" };

async function fetchAmazonRatings(asin: string): Promise<RatingResult> {
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

    return { rating, count, status: "success" };
  } catch (error: unknown) {
    const msg = (error as Error).message;

    if (msg.includes("404")) {
      return { rating: null, count: null, status: "not_found" };
    }

    console.error(`  ❌ Erro no ASIN ${asin}: ${msg}`);
    return { rating: null, count: null, status: "error" };
  }
}

async function processProduct(product: { id: string; asin: string; name: string }) {
  console.log(
    `🔍 [${product.asin}] - Processando: ${product.name.substring(0, 45)}...`
  );

  const result = await fetchAmazonRatings(product.asin);

  if (result.status === "success") {
    await prisma.dynamicProduct.update({
      where: { id: product.id },
      data: {
        ratingAverage: result.rating ?? undefined,
        ratingCount: result.count ?? undefined,
        ratingsUpdatedAt: new Date(),
      },
    });

    console.log(`  ✅ Sucesso: ${result.rating}⭐ | ${result.count} reviews`);
    return "success";
  }

  if (result.status === "not_found") {
    await prisma.dynamicProduct.update({
      where: { id: product.id },
      data: {
        ratingAverage: null,
        ratingCount: null,
        ratingsUpdatedAt: new Date(),
      },
    });

    console.log("  ⚠️ Produto não encontrado (404). Marcado como checado.");
    return "not_found";
  }

  console.log("  ⚠️ Erro temporário. Vai para fila de nova tentativa.");
  return "error";
}

async function main() {
  const trintaDiasAtras = new Date();
  trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30);

  const products = await prisma.dynamicProduct.findMany({
    where: {
      OR: [
        { ratingAverage: null },
        { ratingCount: null },
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
  const retryQueue: { id: string; asin: string; name: string }[] = [];

  for (const product of products) {
    const status = await processProduct(product);

    if (status === "success") {
      atualizados++;
    } else if (status === "error") {
      retryQueue.push(product);
    }

    await sleep(5000);
  }

  if (retryQueue.length > 0) {
    console.log(`\n🔁 Nova tentativa para ${retryQueue.length} produtos com erro...`);
    await sleep(10000);

    for (const product of retryQueue) {
      const status = await processProduct(product);

      if (status === "success") {
        atualizados++;
      }

      await sleep(5000);
    }
  }

  console.log(
    `\n🏁 Sincronização concluída! Total de produtos atualizados nesta rodada: ${atualizados}`
  );
}

main()
  .catch((e) => console.error("❌ Erro fatal:", e))
  .finally(async () => await prisma.$disconnect());
