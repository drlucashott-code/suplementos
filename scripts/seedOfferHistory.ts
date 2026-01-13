import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// 🔴 COLE AQUI O offerId EXATO (copie do debugOffer.ts)
const OFFER_ID = "cmjqejrha000ncno07kuilinz";

async function run() {
  const prices = [80, 90, 100, 110, 120];

  for (const price of prices) {
    await prisma.offerPriceHistory.create({
      data: {
        offerId: OFFER_ID,
        price,
      },
    });
  }

  console.log("✅ Histórico criado com sucesso");
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
