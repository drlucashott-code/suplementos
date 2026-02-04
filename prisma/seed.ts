import { PrismaClient } from "@prisma/client";
import fs from "fs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Populando banco de dados com o backup...");

  const backupRaw = fs.readFileSync("./prisma/backup_dados.json", "utf-8");
  const products = JSON.parse(backupRaw);

  for (const p of products) {
    await prisma.product.upsert({
      where: { id: p.id },
      update: {},
      create: {
        ...p,
        // Remove IDs internos das relações para evitar conflitos no upsert
        creatineInfo: p.creatineInfo ? { create: p.creatineInfo } : undefined,
        wheyInfo: p.wheyInfo ? { create: p.wheyInfo } : undefined,
        proteinBarInfo: p.proteinBarInfo ? { create: p.proteinBarInfo } : undefined,
        proteinDrinkInfo: p.proteinDrinkInfo ? { create: p.proteinDrinkInfo } : undefined,
        offers: { create: p.offers },
      },
    });
  }

  console.log("✅ Restore concluído com sucesso!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });