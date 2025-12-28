import { PrismaClient, Store } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const result = await prisma.offer.deleteMany({
    where: {
      store: Store.MERCADO_LIVRE,
    },
  });

  console.log(
    `✅ ${result.count} offers do Mercado Livre deletadas`
  );
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
