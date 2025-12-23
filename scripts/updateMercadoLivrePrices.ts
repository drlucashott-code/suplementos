import "dotenv/config";
import { PrismaClient, Store } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Busca preço via HTML usando MLB
 */
async function fetchPriceByMLB(
  mlb: string
): Promise<number | null> {
  const url =
    `https://www.mercadolivre.com.br/p/${mlb}`;

  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      "Accept-Language": "pt-BR,pt;q=0.9",
    },
  });

  if (!res.ok) return null;

  const html = await res.text();

  const match = html.match(
    /"price"\s*:\s*([\d.]+)/i
  );

  if (!match) return null;

  const price = Number(match[1]);
  return isNaN(price) ? null : price;
}

async function updateMercadoLivrePrices() {
  console.log(
    "🔄 Atualizando preços do Mercado Livre..."
  );

  const offers = await prisma.offer.findMany({
    where: {
      store: Store.MERCADO_LIVRE,
      affiliateUrl: { not: "" }, // só com comissão
    },
    include: {
      product: true,
    },
  });

  console.log(
    `📦 Ofertas encontradas: ${offers.length}`
  );

  for (const offer of offers) {
    const mlb = offer.externalId;

    console.log(`🔎 ${mlb}`);

    const price = await fetchPriceByMLB(mlb);

    if (!price) {
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
