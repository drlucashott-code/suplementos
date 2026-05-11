// scripts/revertAffiliateTag.ts

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const res1 = await prisma.$executeRawUnsafe(`
    UPDATE "DynamicProduct"
    SET "url" = regexp_replace("url", 'tag=amazonpick0af-20', 'tag=amazon.picks-20', 'g')
    WHERE "url" LIKE '%tag=amazonpick0af-20%';
  `);

  const res2 = await prisma.$executeRawUnsafe(`
    UPDATE "Offer"
    SET "affiliateUrl" = regexp_replace("affiliateUrl", 'tag=amazonpick0af-20', 'tag=amazon.picks-20', 'g')
    WHERE "affiliateUrl" LIKE '%tag=amazonpick0af-20%';
  `);

  console.log("DynamicProduct atualizados:", res1);
  console.log("Offer atualizados:", res2);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
