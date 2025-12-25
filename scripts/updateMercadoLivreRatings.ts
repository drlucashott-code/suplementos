import "dotenv/config";
import { PrismaClient, Store } from "@prisma/client";

const prisma = new PrismaClient();

/* =========================
   EXTRAÇÃO DE NOTA (HTML)
   SOMENTE MÉDIA
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
   FETCH HTML
========================= */

async function fetchHtmlByMLB(
  mlb: string
): Promise<string | null> {
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
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      },
    });

    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

/* =========================
   SCRIPT PRINCIPAL
========================= */

async function updateMercadoLivreRatings() {
  console.log(
    "🔄 Atualizando NOTAS do Mercado Livre (HTML-only)..."
  );

  const offers = await prisma.offer.findMany({
    where: {
      store: Store.MERCADO_LIVRE,
      externalId: { not: "" },
    },
  });

  console.log(`📦 Ofertas encontradas: ${offers.length}`);

  let updated = 0;

  for (const offer of offers) {
    console.log(`🔎 ${offer.externalId}`);

    const html = await fetchHtmlByMLB(
      offer.externalId
    );

    if (!html) {
      console.warn("⚠️ HTML não carregado");
      continue;
    }

    const ratingAverage =
      extractRatingAverageFromHtml(html);

    if (ratingAverage === null) {
      console.log("— nota não encontrada no HTML");
      continue;
    }

    await prisma.offer.update({
      where: { id: offer.id },
      data: {
        ratingAverage,
        updatedAt: new Date(),
      },
    });

    updated++;

    console.log(`⭐ ${ratingAverage}`);

    // delay amigável
    await new Promise((r) => setTimeout(r, 1200));
  }

  console.log(
    `🏁 Finalizado — notas atualizadas: ${updated}`
  );

  await prisma.$disconnect();
}

updateMercadoLivreRatings().catch(async (err) => {
  console.error("❌ Erro no script:", err);
  await prisma.$disconnect();
  process.exit(0);
});
