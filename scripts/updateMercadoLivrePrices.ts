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
   EXTRAÇÃO DE PREÇO
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

/* =========================
   FETCH
========================= */

async function fetchMLPrice(
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
    return extractPriceFromJsonLd(html);
  } catch {
    return null;
  }
}

/* =========================
   SCRIPT
========================= */

async function updateMercadoLivrePrices() {
  console.log("🔄 Atualizando preços do Mercado Livre...");

  const offers = await prisma.offer.findMany({
    where: {
      store: Store.MERCADO_LIVRE,
      externalId: { not: "" },
    },
    include: {
      product: true,
    },
    orderBy: {
      updatedAt: "asc",
    },
    take: process.env.GITHUB_ACTIONS ? 3 : undefined,
  });

  if (offers.length === 0) {
    console.log(
      "⚠️ Nenhuma offer do Mercado Livre encontrada"
    );
    return;
  }

  for (const offer of offers) {
    console.log(`🔎 MLB ${offer.externalId}`);

    const price = await fetchMLPrice(
      offer.externalId
    );

    if (!price) {
      console.log(
        `⚠️ ${offer.product.name} — preço indisponível`
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

    await sleep(
      process.env.GITHUB_ACTIONS ? 5000 : 1200
    );
  }

  console.log("🏁 Mercado Livre atualizado");
  await prisma.$disconnect();
}

updateMercadoLivrePrices().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
