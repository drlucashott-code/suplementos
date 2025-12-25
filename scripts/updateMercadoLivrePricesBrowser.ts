import "dotenv/config";
import { chromium } from "playwright";
import { PrismaClient, Store } from "@prisma/client";

const prisma = new PrismaClient();

/* =========================
   UTIL
========================= */

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/* =========================
   MAIN
========================= */

async function updateMercadoLivrePricesBrowser() {
  console.log("🚀 Script Mercado Livre Browser iniciado");

  console.log("🧪 Ambiente:", {
    node: process.version,
    platform: process.platform,
    github: !!process.env.GITHUB_ACTIONS,
  });

  console.log("🔍 Buscando ofertas no banco...");

  const offers = await prisma.offer.findMany({
    where: {
      store: Store.MERCADO_LIVRE,
      externalId: { not: "" },
    },
    take: 2, // ⚠️ LIMITADO PARA TESTE
  });

  console.log("📦 Ofertas encontradas:", offers.length);

  if (offers.length === 0) {
    console.log("⚠️ Nenhuma oferta encontrada. Encerrando.");
    await prisma.$disconnect();
    return;
  }

  console.log("🌐 Abrindo Chromium...");

  const browser = await chromium.launch({
    headless: true, // GitHub exige headless
  });

  const context = await browser.newContext({
    locale: "pt-BR",
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
      "AppleWebKit/537.36 (KHTML, like Gecko) " +
      "Chrome/122.0.0.0 Safari/537.36",
    viewport: { width: 1366, height: 768 },
  });

  const page = await context.newPage();

  for (const offer of offers) {
    const url = `https://www.mercadolivre.com.br/p/${offer.externalId}`;

    console.log("\n===============================");
    console.log("🔎 MLB:", offer.externalId);
    console.log("➡️ Navegando para:", url);

    try {
      await page.goto(url, {
        waitUntil: "networkidle",
        timeout: 30000,
      });

      console.log("✅ Página carregada");

      // atraso humano mínimo
      await sleep(3000);

      const html = await page.content();

      console.log("📄 HTML length:", html.length);

      const hasJsonLd = html.includes(
        'type="application/ld+json"'
      );
      const hasRating =
        html.includes("rating_average") ||
        html.includes("average_rating");

      console.log(
        "📦 JSON-LD:",
        hasJsonLd ? "PRESENTE" : "AUSENTE"
      );
      console.log(
        "⭐ Rating:",
        hasRating ? "PRESENTE" : "AUSENTE"
      );

      // 🔴 FAIL-SAFE: não atualiza se payload vier filtrado
      if (!hasJsonLd) {
        console.warn(
          "🚫 Payload filtrado (JSON-LD ausente). Não atualizando."
        );
        continue;
      }

      // ⚠️ Aqui você pode plugar o parser de preço depois
      console.log(
        "🧪 Diagnóstico OK para",
        offer.externalId
      );
    } catch (err) {
      console.error(
        "🔥 Erro ao navegar:",
        offer.externalId,
        err
      );
    }

    // delay entre produtos
    await sleep(5000);
  }

  console.log("\n🏁 Script finalizado");

  await browser.close();
  await prisma.$disconnect();
}

/* =========================
   RUN
========================= */

updateMercadoLivrePricesBrowser().catch(async (err) => {
  console.error("❌ Erro fatal no script:", err);
  await prisma.$disconnect();
  process.exit(1);
});
