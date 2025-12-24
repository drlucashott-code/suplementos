import "dotenv/config";
import { PrismaClient, Store } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Extrai preço do JSON-LD
 */
function extractPriceFromJsonLd(html: string): number | null {
  const scripts = html.match(
    /<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi
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

      if (price) return Number(price);
    } catch {
      continue;
    }
  }

  return null;
}

/**
 * Extrai preço do PRELOADED_STATE
 */
function extractPriceFromPreloadedState(
  html: string
): number | null {
  const match = html.match(
    /"price"\s*:\s*\{\s*"amount"\s*:\s*([\d.,]+)/i
  );

  if (!match) return null;

  return Number(match[1].replace(",", "."));
}

/**
 * Fallback simples (regex)
 */
function extractPriceByRegex(
  html: string
): number | null {
  const match = html.match(
    /"price"\s*:\s*([\d.,]+)/i
  );

  if (!match) return null;

  return Number(match[1].replace(",", "."));
}

/**
 * Busca preço do Mercado Livre via MLB
 */
async function fetchPriceByMLB(
  mlb: string
): Promise<number | null> {
  const url = `https://www.mercadolivre.com.br/p/${mlb}`;

  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      "Accept-Language": "pt-BR,pt;q=0.9",
    },
  });

  if (!res.ok) return null;

  const html = await res.text();

  return (
    extractPriceFromJsonLd(html) ??
    extractPriceFromPreloadedState(html) ??
    extractPriceByRegex(html)
  );
}

async function updateMercadoLivrePrices() {
  console.log("🔄 Atualizando preços do Mercado Livre...");

  const offers = await prisma.offer.findMany({
    where: {
      store: Store.MERCADO_LIVRE,
      affiliateUrl: { not: "" },
    },
    include: { product: true },
  });

  console.log(`📦 Ofertas encontradas: ${offers.length}`);

  for (const offer of offers) {
    const mlb = offer.externalId;

    console.log(`🔎 ${mlb}`);

    const price = await fetchPriceByMLB(mlb);

    if (!price || isNaN(price)) {
      console.warn(
        `⚠️ Preço não encontrado para ${mlb}`
      );
      continue;
    }

    await prisma.offer.update({
      where: { id: offer.id },
      data: { price },
    });

    console.log(
      `✅ ${offer.product.name} — R$ ${price.toFixed(
        2
      )}`
    );

    await new Promise((r) => setTimeout(r, 800));
  }

  await prisma.$disconnect();
  console.log("🏁 Mercado Livre atualizado");
}

updateMercadoLivrePrices();
