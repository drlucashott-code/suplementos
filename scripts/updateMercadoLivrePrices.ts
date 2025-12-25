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
   FETCH + LOGS
========================= */

async function fetchPriceByMLB(
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

    const hasJsonLd = html.includes(
      'type="application/ld+json"'
    );

    console.log(
      "📦 JSON-LD:",
      hasJsonLd ? "PRESENTE" : "AUSENTE"
    );

    const p1 = extractPriceFromJsonLd(html);
    if (p1 !== null) {
      console.log("💰 PRICE via JSON-LD");
      return p1;
    }

    const p2 =
      extractPriceFromPreloadedState(html);
    if (p2 !== null) {
      console.log("💰 PRICE via STATE");
      return p2;
    }

    const p3 = extractPriceByRegex(html);
    if (p3 !== null) {
      console.log("💰 PRICE via REGEX");
      return p3;
    }

    console.warn(
      "❌ Nenhuma estratégia encontrou preço"
    );
    return null;
  } catch (err) {
    console.error("🔥 ERRO fetch:", err);
    return null;
  }
}

/* =========================
   SCRIPT
========================= */

async function updateMercadoLivrePrices() {
  console.log("🧪 Ambiente:", {
    node: process.version,
    platform: process.platform,
    github: !!process.env.GITHUB_ACTIONS,
  });

  console.log(
    "🔄 Atualizando preços do Mercado Livre"
  );

  const offers = await prisma.offer.findMany({
    where: {
      store: Store.MERCADO_LIVRE,
      affiliateUrl: { not: "" },
    },
    take: process.env.GITHUB_ACTIONS
      ? 3
      : undefined,
  });

  console.log(`📦 Ofertas encontradas: ${offers.length}`);

  let updated = 0;

  for (const offer of offers) {
    const price = await fetchPriceByMLB(
      offer.externalId
    );

    if (!price || isNaN(price)) {
      console.warn(
        `⚠️ Preço indisponível (${offer.externalId}), mantendo valor atual`
      );
      continue;
    }

    await prisma.offer.update({
      where: { id: offer.id },
      data: { price },
    });

    updated++;

    console.log(
      `✅ ${offer.externalId} — R$ ${price.toFixed(
        2
      )}`
    );

    await sleep(
      process.env.GITHUB_ACTIONS ? 5000 : 1200
    );
  }

  if (updated === 0) {
    console.warn(
      "⚠️ Nenhum preço atualizado. Pode ser necessário rodar localmente."
    );
  }

  console.log(`🏁 Finalizado — atualizados: ${updated}`);
  await prisma.$disconnect();
}

updateMercadoLivrePrices().catch(async (err) => {
  console.error("❌ Erro geral:", err);
  await prisma.$disconnect();
  process.exit(0);
});
