import "dotenv/config";
import { PrismaClient, Store } from "@prisma/client";

const prisma = new PrismaClient();

/* =========================
   EXTRAÇÕES DE PREÇO
========================= */

function extractPriceFromJsonLd(html: string): number | null {
  const scripts = html.match(
    /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi
  );

  if (!scripts) return null;

  for (const script of scripts) {
    try {
      const jsonText = script
        .replace(/<script[^>]*>/i, "")
        .replace(/<\/script>/i, "");

      const data = JSON.parse(jsonText);

      const offers = Array.isArray(data)
        ? data.find((x) => x?.offers)?.offers
        : data?.offers;

      const price =
        offers?.price ??
        offers?.lowPrice ??
        offers?.highPrice;

      if (typeof price === "number") return price;
      if (typeof price === "string") {
        const v = Number(price.replace(",", "."));
        return isNaN(v) ? null : v;
      }
    } catch {
      continue;
    }
  }

  return null;
}

function extractPriceFromState(html: string): number | null {
  const match = html.match(
    /"price"\s*:\s*\{\s*"amount"\s*:\s*([\d.,]+)/i
  );

  if (!match) return null;

  const value = Number(
    match[1].replace(/\./g, "").replace(",", ".")
  );

  return isNaN(value) ? null : value;
}

/* =========================
   FETCH
========================= */

async function fetchPriceByMLB(
  mlb: string
): Promise<number | null> {
  const url = `https://www.mercadolivre.com.br/p/${mlb}`;

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

  const html = await res.text();

  return (
    extractPriceFromJsonLd(html) ??
    extractPriceFromState(html)
  );
}

/* =========================
   SCRIPT
========================= */

async function updateMercadoLivrePrices() {
  console.log("🔄 Atualizando preços (Mercado Livre)");

  const offers = await prisma.offer.findMany({
    where: {
      store: Store.MERCADO_LIVRE,
      affiliateUrl: { not: "" },
    },
  });

  console.log(`📦 Ofertas: ${offers.length}`);

  let updated = 0;

  for (const offer of offers) {
    const price = await fetchPriceByMLB(
      offer.externalId
    );

    if (!price) {
      console.log(
        `— preço indisponível (${offer.externalId})`
      );
      continue;
    }

    await prisma.offer.update({
      where: { id: offer.id },
      data: { price },
    });

    updated++;
    console.log(
      `✅ ${offer.externalId} → R$ ${price.toFixed(2)}`
    );

    await new Promise((r) =>
      setTimeout(r, 1500)
    );
  }

  console.log(`🏁 Preços atualizados: ${updated}`);
  await prisma.$disconnect();
}

updateMercadoLivrePrices().catch(async (err) => {
  console.error("❌ Erro:", err);
  await prisma.$disconnect();
  process.exit(0);
});
