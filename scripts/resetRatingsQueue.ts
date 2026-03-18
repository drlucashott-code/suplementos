import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const result = await prisma.dynamicProduct.updateMany({
    where: {
      OR: [
        { ratingAverage: null },
        { ratingCount: null },
      ],
    },
    data: {
      ratingsUpdatedAt: null,
    },
  });

  console.log(`✅ ${result.count} produtos voltaram para a fila de atualização.`);
}

main()
  .catch((err) => {
    console.error("❌ Erro:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
