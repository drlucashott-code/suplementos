import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function updateMercadoLivrePrices() {
  console.log("🔄 Atualizando preços do Mercado Livre...");

  const offers = await prisma.offer.findMany({
    where: { store: "MERCADO_LIVRE" },
  });

  if (offers.length === 0) {
    console.log("⚠️ Nenhuma offer do Mercado Livre encontrada");
    return;
  }

  for (const offer of offers) {
    console.log("🔎 Offer encontrada:", {
      id: offer.id,
      externalId: offer.externalId,
    });

    try {
      console.log(`🌐 Buscando MLB ${offer.externalId}`);

      const res = await fetch(
        `https://api.mercadolibre.com/items/${offer.externalId}`
      );

      if (!res.ok) {
        console.log(
          `❌ MLB ${offer.externalId} não encontrado (${res.status})`
        );
        continue;
      }

      const data = await res.json();

      const price = data.price;

      if (!price) {
        console.log(`⚠️ MLB ${offer.externalId} sem preço`);
        continue;
      }

      await prisma.offer.update({
        where: { id: offer.id },
        data: {
          price,
          affiliateUrl: `https://www.mercadolivre.com.br/${offer.externalId}`,
        },
      });

      console.log(`✅ Atualizado MLB ${offer.externalId}: R$ ${price}`);
    } catch (err) {
      console.error("🔥 Erro ao atualizar MLB:", err);
    }
  }

  console.log("🏁 Mercado Livre atualizado");
}

updateMercadoLivrePrices()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
