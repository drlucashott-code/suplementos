import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function run() {
  const count = await prisma.offerPriceHistory.count({
    where: {
      offerId: "cmjqejrha000ncno07kuilinz", // use o ID completo
    },
  });

  console.log("Históricos encontrados:", count);
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
