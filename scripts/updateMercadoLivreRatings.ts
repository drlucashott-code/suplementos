import "dotenv/config";
import { PrismaClient, Store } from "@prisma/client";

const prisma = new PrismaClient();

/* =========================
   UTIL
========================= */

function sleep(ms: number) {
  return new Promise<void>((resolve) =>
    setTimeout(resolve, ms)
  );
}

/* =========================
   EXTRAÇÃO DE RATING
========================= */

function extractRatingAverageFromHtml(
  html: string
): number | null {
  const match =
    html.match(/"rating_average"\s*:\s*([\d.]+)/i) ||
    html.match(/"average_rating"\s*:\s*([\d.]+)/i) ||
    html.match(/"rating"\s*:\s*([\d.]+)/i);

  if (!match) return null;

  const value = Number(match[1]);
  return isNaN(value) ? null : value;
}

/* =========================
   FETCH
========================= */

async function fetchMLRating(
  mlb: string
): Promise<number | null> {
  const url = `https://www.mercadolivre.com.br/p/${mlb}`;

  try {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 8000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
          "AppleWebKit/537.36 (KHTML, like Gecko) " +
          "Chrome/122.0.0.0 Safari/537.36",
        "Accept-Language": "pt-BR,pt;q=0.9",
      },
    });

    if (!res.ok) return null;

    const html = await res.text();
    return extractRatingAverageFromHtml(html);
  } catch {
    return null;
  }
}

/* =========================
   SCRIPT
========================= */

async function updateMercadoLivreRatings() {
  console.log("🔄 Atualizando ratings do Mercado Livre...");

  const offers = await prisma.offer.findMany({
    where: {
      store: Store.MERCADO_LIVRE,
      externalId: { not: "" },
    },
    include: {
      product: true,
    },
    orderBy: {
      updatedAt: "asc", // rotação
    },
    take: process.env.GITHUB_ACTIONS
      ? 3
      : undefined,
  });

  if (offers.length === 0) {
    console.log(
      "⚠️ Nenhuma offer do Mercado Livre encontrada"
    );
    return;
  }

  let updated = 0;

  for (const offer of offers) {
    console.log(`🔎 MLB ${offer.externalId}`);

    const rating = await fetchMLRating(
      offer.externalId
    );

    if (rating === null) {
      console.log(
        `⚠️ ${offer.product.name} — rating indisponível`
      );
      continue;
    }

    await prisma.offer.update({
      where: { id: offer.id },
      data: {
        ratingAverage: rating,
        updatedAt: new Date(),
      },
    });

    updated++;

    console.log(
      `✅ ${offer.product.name} — ⭐ ${rating}`
    );

    await sleep(
      process.env.GITHUB_ACTIONS ? 5000 : 1200
    );
  }

  if (updated === 0) {
    console.log(
      "⚠️ Nenhum rating atualizado nesta execução"
    );
  }

  console.log("🏁 Mercado Livre (ratings) atualizado");
  await prisma.$disconnect();
}

updateMercadoLivreRatings().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
