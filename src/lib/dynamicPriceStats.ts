import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type PriceStatsRow = {
  averagePrice30d: number | null;
  lowestPrice30d: number | null;
  highestPrice30d: number | null;
};

export async function refreshDynamicProductPriceStats(productId: string) {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const rows = await prisma.$queryRaw<PriceStatsRow[]>(Prisma.sql`
    SELECT
      AVG("price")::float AS "averagePrice30d",
      MIN("price")::float AS "lowestPrice30d",
      MAX("price")::float AS "highestPrice30d"
    FROM "DynamicPriceHistory"
    WHERE
      "productId" = ${productId}
      AND "createdAt" >= ${thirtyDaysAgo}
      AND "price" > 0
  `);

  const row = rows[0];

  await prisma.$executeRaw`
    UPDATE "DynamicProduct"
    SET
      "averagePrice30d" = ${row?.averagePrice30d ?? null},
      "lowestPrice30d" = ${row?.lowestPrice30d ?? null},
      "highestPrice30d" = ${row?.highestPrice30d ?? null},
      "priceStatsUpdatedAt" = NOW(),
      "updatedAt" = NOW()
    WHERE "id" = ${productId}
  `;
}
