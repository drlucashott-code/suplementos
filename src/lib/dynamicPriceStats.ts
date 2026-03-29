import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type PriceStatsRow = {
  productId?: string;
  averagePrice30d: number | null;
  lowestPrice30d: number | null;
  highestPrice30d: number | null;
  lowestPrice365d: number | null;
};

export async function refreshDynamicProductPriceStats(productId: string) {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const threeHundredSixtyFiveDaysAgo = new Date();
  threeHundredSixtyFiveDaysAgo.setDate(threeHundredSixtyFiveDaysAgo.getDate() - 365);

  const rows = await prisma.$queryRaw<PriceStatsRow[]>(Prisma.sql`
    SELECT
      AVG("price") FILTER (WHERE "date" >= ${thirtyDaysAgo})::float AS "averagePrice30d",
      MIN("price") FILTER (WHERE "date" >= ${thirtyDaysAgo})::float AS "lowestPrice30d",
      MAX("price") FILTER (WHERE "date" >= ${thirtyDaysAgo})::float AS "highestPrice30d",
      MIN("price")::float AS "lowestPrice365d"
    FROM "DynamicPriceHistory"
    WHERE
      "productId" = ${productId}
      AND "date" >= ${threeHundredSixtyFiveDaysAgo}
      AND "price" > 0
  `);

  const row = rows[0];

  await prisma.dynamicProduct.update({
    where: { id: productId },
    data: {
      averagePrice30d: row?.averagePrice30d ?? null,
      lowestPrice30d: row?.lowestPrice30d ?? null,
      highestPrice30d: row?.highestPrice30d ?? null,
      lowestPrice365d: row?.lowestPrice365d ?? null,
      priceStatsUpdatedAt: new Date(),
    },
  });
}

export async function refreshDynamicProductPriceStatsBulk(productIds: string[]) {
  const uniqueProductIds = [...new Set(productIds.filter(Boolean))];
  if (uniqueProductIds.length === 0) return;

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const threeHundredSixtyFiveDaysAgo = new Date();
  threeHundredSixtyFiveDaysAgo.setDate(threeHundredSixtyFiveDaysAgo.getDate() - 365);

  const rows = await prisma.$queryRaw<PriceStatsRow[]>(Prisma.sql`
    SELECT
      "productId",
      AVG("price") FILTER (WHERE "date" >= ${thirtyDaysAgo})::float AS "averagePrice30d",
      MIN("price") FILTER (WHERE "date" >= ${thirtyDaysAgo})::float AS "lowestPrice30d",
      MAX("price") FILTER (WHERE "date" >= ${thirtyDaysAgo})::float AS "highestPrice30d",
      MIN("price")::float AS "lowestPrice365d"
    FROM "DynamicPriceHistory"
    WHERE
      "productId" IN (${Prisma.join(uniqueProductIds)})
      AND "date" >= ${threeHundredSixtyFiveDaysAgo}
      AND "price" > 0
    GROUP BY "productId"
  `);

  const statsByProductId = new Map(
    rows
      .filter((row): row is PriceStatsRow & { productId: string } => !!row.productId)
      .map((row) => [row.productId, row])
  );

  const now = new Date();

  await prisma.$transaction(
    uniqueProductIds.map((productId) => {
      const row = statsByProductId.get(productId);
      return prisma.dynamicProduct.update({
        where: { id: productId },
        data: {
          averagePrice30d: row?.averagePrice30d ?? null,
          lowestPrice30d: row?.lowestPrice30d ?? null,
          highestPrice30d: row?.highestPrice30d ?? null,
          lowestPrice365d: row?.lowestPrice365d ?? null,
          priceStatsUpdatedAt: now,
        },
      });
    })
  );
}
