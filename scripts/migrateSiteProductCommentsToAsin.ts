import "dotenv/config";
import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Migrando SiteProductComment para thread por ASIN...");

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "SiteProductComment"
    ADD COLUMN IF NOT EXISTS "productAsin" text
  `);

  const backfillResult = await prisma.$executeRaw(Prisma.sql`
    UPDATE "SiteProductComment" c
    SET "productAsin" = p."asin"
    FROM "DynamicProduct" p
    WHERE c."productId" = p."id"
      AND (c."productAsin" IS NULL OR c."productAsin" = '')
  `);

  console.log(`Backfill concluído: ${backfillResult} linhas atualizadas.`);

  const missingRows = await prisma.$queryRaw<Array<{ count: bigint }>>(Prisma.sql`
    SELECT COUNT(*)::bigint AS "count"
    FROM "SiteProductComment"
    WHERE "productAsin" IS NULL OR "productAsin" = ''
  `);

  const missingCount = Number(missingRows[0]?.count ?? 0);
  if (missingCount > 0) {
    throw new Error(`Ainda existem ${missingCount} comentários sem ASIN. A migração foi interrompida.`);
  }

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "SiteProductComment"
    ALTER COLUMN "productAsin" SET NOT NULL
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "SiteProductComment"
    ALTER COLUMN "productId" DROP NOT NULL
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "SiteProductComment"
    DROP CONSTRAINT IF EXISTS "SiteProductComment_productId_fkey"
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "SiteProductComment"
    ADD CONSTRAINT "SiteProductComment_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "DynamicProduct"("id")
    ON DELETE SET NULL
    ON UPDATE CASCADE
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "SiteProductComment_productAsin_createdAt_idx"
    ON "SiteProductComment" ("productAsin", "createdAt" DESC)
  `);

  console.log("Migração concluída com sucesso.");
}

main()
  .catch((error) => {
    console.error("Falha na migração de comentários:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
