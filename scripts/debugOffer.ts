import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function run() {
  const offers = await prisma.offer.findMany({
    where: { store: "AMAZON" },
    select: {
      id: true,
      externalId: true,
      price: true,
    },
  });

  console.log("OFFERS AMAZON:");
  offers.forEach((o) =>
    console.log(`offerId=${o.id} | ASIN=${o.externalId} | price=${o.price}`)
  );
}

run().finally(() => prisma.$disconnect());
