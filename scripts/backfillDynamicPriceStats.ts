import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { refreshDynamicProductPriceStatsBulk } from "../src/lib/dynamicPriceStats";

const prisma = new PrismaClient();
const BATCH_SIZE = 250;

async function main() {
  const products = await prisma.dynamicProduct.findMany({
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });

  console.log(`Backfill de estatisticas de preco para ${products.length} produtos`);

  for (let index = 0; index < products.length; index += BATCH_SIZE) {
    const batch = products.slice(index, index + BATCH_SIZE).map((product) => product.id);
    await refreshDynamicProductPriceStatsBulk(batch);
    console.log(
      `Lote ${Math.floor(index / BATCH_SIZE) + 1}/${Math.max(
        Math.ceil(products.length / BATCH_SIZE),
        1
      )} concluido`
    );
  }

  console.log("Backfill concluido");
}

main()
  .catch((error) => {
    console.error("Falha no backfill de estatisticas:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
