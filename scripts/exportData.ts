import { PrismaClient } from "@prisma/client";
import fs from "fs";

const prisma = new PrismaClient();

async function exportData() {
  console.log("🚀 Iniciando extração de dados para backup...");

  const products = await prisma.product.findMany({
    include: {
      creatineInfo: true,
      wheyInfo: true,
      proteinBarInfo: true,
      proteinDrinkInfo: true,
      offers: true,
    },
  });

  const data = JSON.stringify(products, null, 2);
  fs.writeFileSync("./prisma/backup_dados.json", data);

  console.log(`✅ Sucesso! ${products.length} produtos salvos em prisma/backup_dados.json`);
}

exportData()
  .catch((e) => console.error("❌ Erro no backup:", e))
  .finally(() => prisma.$disconnect());