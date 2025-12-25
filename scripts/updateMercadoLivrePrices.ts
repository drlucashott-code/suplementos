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
   JSON-LD PRICE PARSER
========================= */

function extractPriceFromJsonLd(
  html: string
): number | null {
  const scripts = html.match(
    /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi
  );

  if (!scripts) return null;

  for (const script of scripts) {
    try {
      const jsonText = script
        .replace(/<script[^>]*>/i, "")
        .replace(/<\/script>/i, "");

      const parsed = JSON.parse(jsonText);

      const candidates = Array.isArray(parsed)
        ? parsed
        : [parsed];

      for (const data of candidates) {
        const offers = Array.isArray(data?.offers)
          ? data.offers
          : [data?.offers];

        for (const offer of offers) {
          if (!offer) continue;

          const price =
            offer.price ??
            offer.lowPrice ??
            offer.highPrice ??
            offer?.priceSpecification?.price;

          if (typeof price === "number") return price;

          if (typeof price === "string") {
            const v = Number(
              price.replace(".", "").replace(",", ".")
            );
            if (!isNaN(v)) return v;
          }
        }
      }
    } catch {
      continue;
    }
  }

  return null;
}

/* =========================
   FETCH ML PRICE
========================= */

async function fetchMLPriceOnce(
  mlb: string
): Promise<number | null> {
  const url = `https://www.mercadolivre.com.br/p/${mlb}`;

  try {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 12000);

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
   FETCH COM RETRY
========================= */

async function fetchMLPrice(
  mlb: string,
  retries = 3
): Promise<number | null> {
  for (let i = 0; i < retries; i++) {
    const price = await fetchMLPriceOnce(mlb);
    if (price !== null) return price;

    if (i < retries - 1) {
      console.log("⏳ Retry preço Mercado Livre...");
      await sleep(2000);
    }
  }
  return null;
}

/* =========================
   SCRIPT
========================= */

async function updateMercadoLivrePrices() {
  console.log(
    "🔄 Atualizando preços do Mercado Livre...\n"
  );

  const offers = await prisma.offer.findMany({
    where: {
      store: Store.MERCADO_LIVRE,
      externalId: { not: "" },
    },
    include: { product: true },
    orderBy: { updatedAt: "asc" },
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

    if (price === null) {
      console.log(
        `⚠️ ${offer.product.name} — preço indisponível`
      );
      await sleep(
        process.env.GITHUB_ACTIONS ? 5000 : 1500
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
      process.env.GITHUB_ACTIONS ? 5000 : 1500
    );
  }

  console.log("\n🏁 Mercado Livre atualizado");
  await prisma.$disconnect();
}

updateMercadoLivrePrices().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
