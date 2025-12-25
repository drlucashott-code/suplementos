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
   (somente média)
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
   FETCH + LOGS
========================= */

async function fetchRatingByMLB(
  mlb: string
): Promise<number | null> {
  const url = `https://www.mercadolivre.com.br/p/${mlb}`;

  console.log(`\n🔎 MLB ${mlb}`);
  console.log(`🌐 URL: ${url}`);

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

    console.log("📡 STATUS:", res.status);
    console.log("📡 VIA:", res.headers.get("via"));
    console.log(
      "📡 CONTENT-TYPE:",
      res.headers.get("content-type")
    );

    if (!res.ok) {
      console.warn("❌ HTTP não OK");
      return null;
    }

    const html = await res.text();

    console.log("📄 HTML length:", html.length);

    if (html.length < 200_000) {
      console.warn(
        "🚫 HTML filtrado (payload reduzido)"
      );
    }

    const rating =
      extractRatingAverageFromHtml(html);

    if (rating !== null) {
      console.log("⭐ RATING encontrado:", rating);
      return rating;
    }

    console.warn("❌ Rating não encontrado no HTML");
    return null;
  } catch (err) {
    console.error("🔥 ERRO fetch:", err);
    return null;
  }
}

/* =========================
   SCRIPT
========================= */

async function updateMercadoLivreRatings() {
  console.log("🧪 Ambiente:", {
    node: process.version,
    platform: process.platform,
    github: !!process.env.GITHUB_ACTIONS,
  });

  console.log(
    "🔄 Atualizando ratings do Mercado Livre"
  );

  const offers = await prisma.offer.findMany({
    where: {
      store: Store.MERCADO_LIVRE,
      externalId: { not: "" },
    },
    take: process.env.GITHUB_ACTIONS
      ? 3
      : undefined,
  });

  console.log(`📦 Ofertas encontradas: ${offers.length}`);

  let updated = 0;

  for (const offer of offers) {
    const rating = await fetchRatingByMLB(
      offer.externalId
    );

    if (rating === null) {
      console.warn(
        `⚠️ Rating indisponível (${offer.externalId}), mantendo valor atual`
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
      `✅ ${offer.externalId} — ⭐ ${rating}`
    );

    await sleep(
      process.env.GITHUB_ACTIONS ? 5000 : 1200
    );
  }

  if (updated === 0) {
    console.warn(
      "⚠️ Nenhum rating atualizado. Pode ser necessário rodar localmente."
    );
  }

  console.log(
    `🏁 Finalizado — ratings atualizados: ${updated}`
  );

  await prisma.$disconnect();
}

updateMercadoLivreRatings().catch(async (err) => {
  console.error("❌ Erro geral:", err);
  await prisma.$disconnect();
  process.exit(0);
});
