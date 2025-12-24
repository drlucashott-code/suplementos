import "dotenv/config";
import { PrismaClient, Store } from "@prisma/client";

const prisma = new PrismaClient();

/* =========================
   EXTRAÇÕES
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
      if (typeof price === "string")
        return Number(price.replace(",", "."));
    } catch {
      continue;
    }
  }

  return null;
}

function extractPriceFromPreloadedState(
  html: string
): number | null {
  const match = html.match(
    /"price"\s*:\s*\{\s*"amount"\s*:\s*([\d.,]+)/i
  );

  if (!match) return null;

  const value = Number(
    match[1].replace(/\./g, "").replace(",", ".")
  );

  return isNaN(value) ? null : value;
}

function extractPriceByRegex(
  html: string
): number | null {
  const match = html.match(
    /"price"\s*:\s*([\d.,]+)/i
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

    const html = await res.text();

    return (
      extractPriceFromJsonLd(html) ??
      extractPriceFromPreloadedState(html) ??
      extractPriceByRegex(html)
    );
  } catch {
    return null;
  }
}

/* =========================
   SCRIPT
========================= */

async function updateMercadoLivrePrices() {
  console.log(
    "🔄 Atualizando preços do Mercado Livre (HTML)..."
  );

  const offers = await prisma.offer.findMany({
    where: {
      store: Store.MERCADO_LIVRE,
      affiliateUrl: { not: "" },
    },
  });

  console.log(`📦 Ofertas encontradas: ${offers.length}`);

  for (const offer of offers) {
    console.log(`🔎 ${offer.externalId}`);

    const price = await fetchPriceByMLB(
      offer.externalId
    );

    if (!price || isNaN(price)) {
      console.warn(
        `⚠️ Preço não encontrado para ${offer.externalId}`
      );
      continue; // mantém price = 0
    }

    await prisma.offer.update({
      where: { id: offer.id },
      data: { price },
    });

    console.log(
      `✅ ${offer.externalId} — R$ ${price.toFixed(
        2
      )}`
    );

    await new Promise((r) => setTimeout(r, 1200));
  }

  await prisma.$disconnect();
  console.log("🏁 Mercado Livre atualizado");
}

updateMercadoLivrePrices().catch(async () => {
  await prisma.$disconnect();
  process.exit(0); // nunca quebra o job
});
