import "dotenv/config";
import { PrismaClient, Store } from "@prisma/client";

const prisma = new PrismaClient();

/* =========================
   EXTRAÇÃO DE RATING
========================= */

function extractRating(html: string): number | null {
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

  console.log("\n==================================");
  console.log(`🔎 MLB: ${mlb}`);
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
    console.log(
      "📡 VIA:",
      res.headers.get("via")
    );
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

    // Verificações de bloqueio / payload incompleto
    if (html.length < 20000) {
      console.warn(
        "🚫 HTML muito pequeno (bloqueio forte provável)"
      );
    }

    if (
      html.includes("captcha") ||
      html.includes("robot") ||
      html.includes("blocked")
    ) {
      console.warn(
        "🚫 HTML contém termos de bloqueio"
      );
    }

    const hasRatingKey =
      html.includes("rating_average") ||
      html.includes("average_rating") ||
      html.includes('"rating"');

    console.log(
      "⭐ Chave de rating no HTML:",
      hasRatingKey ? "SIM" : "NÃO"
    );

    const hasJsonLd = html.includes(
      'type="application/ld+json"'
    );

    console.log(
      "📦 JSON-LD:",
      hasJsonLd ? "PRESENTE" : "AUSENTE"
    );

    if (!hasRatingKey) {
      console.log(
        "— HTML completo, mas rating NÃO entregue"
      );
      return null;
    }

    const rating = extractRating(html);

    if (rating === null) {
      console.warn(
        "⚠️ Regex falhou apesar da chave existir"
      );
      return null;
    }

    console.log(`⭐ RATING EXTRAÍDO: ${rating}`);
    return rating;
  } catch (err) {
    console.error("🔥 ERRO fetch:", err);
    return null;
  }
}

/* =========================
   SCRIPT PRINCIPAL
========================= */

async function diagnosticMercadoLivreRatings() {
  console.log("🧪 Ambiente:", {
    node: process.version,
    platform: process.platform,
    github: !!process.env.GITHUB_ACTIONS,
  });

  console.log(
    "🔄 Diagnóstico de RATING — Mercado Livre"
  );

  const offers = await prisma.offer.findMany({
    where: {
      store: Store.MERCADO_LIVRE,
      externalId: { not: "" },
    },
    take: 3, // 👈 limite para diagnóstico
  });

  console.log(`📦 Ofertas analisadas: ${offers.length}`);

  for (const offer of offers) {
    const rating = await fetchRatingByMLB(
      offer.externalId
    );

    if (rating === null) {
      console.log(
        `❌ Rating indisponível (${offer.externalId})`
      );
    } else {
      console.log(
        `✅ Rating OK (${offer.externalId}): ${rating}`
      );
    }

    await new Promise((r) =>
      setTimeout(r, 5000)
    );
  }

  await prisma.$disconnect();
  console.log("🏁 Diagnóstico finalizado");
}

diagnosticMercadoLivreRatings().catch(async (err) => {
  console.error("❌ Erro geral:", err);
  await prisma.$disconnect();
  process.exit(0);
});
