import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  getPriceHistoryBusinessDateKey,
  shiftPriceHistoryDateKey,
} from "@/lib/dynamicPriceHistory";

type PriceStatsRow = {
  productId?: string;
  averagePrice30d: number | null;
  lowestPrice30d: number | null;
  highestPrice30d: number | null;
  lowestPrice365d: number | null;
};

export async function refreshDynamicProductPriceStats(productId: string) {
  const todayKey = getPriceHistoryBusinessDateKey();
  const thirtyDaysAgoKey = shiftPriceHistoryDateKey(todayKey, -29);
  const threeHundredSixtyFiveDaysAgoKey = shiftPriceHistoryDateKey(todayKey, -364);

  const rows = await prisma.$queryRaw<PriceStatsRow[]>(Prisma.sql`
    WITH "dailyHistory" AS (
      SELECT DISTINCT ON (DATE("date"))
        DATE("date") AS "historyDate",
        "price"
      FROM "DynamicPriceHistory"
      WHERE
        "productId" = ${productId}
        AND DATE("date") >= ${threeHundredSixtyFiveDaysAgoKey}::date
        AND "price" > 0
      ORDER BY DATE("date"), "date" DESC, "updatedAt" DESC, "createdAt" DESC
    )
    SELECT
      AVG("price") FILTER (WHERE "historyDate" >= ${thirtyDaysAgoKey}::date)::float AS "averagePrice30d",
      MIN("price") FILTER (WHERE "historyDate" >= ${thirtyDaysAgoKey}::date)::float AS "lowestPrice30d",
      MAX("price") FILTER (WHERE "historyDate" >= ${thirtyDaysAgoKey}::date)::float AS "highestPrice30d",
      MIN("price")::float AS "lowestPrice365d"
    FROM "dailyHistory"
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

  const todayKey = getPriceHistoryBusinessDateKey();
  const thirtyDaysAgoKey = shiftPriceHistoryDateKey(todayKey, -29);
  const threeHundredSixtyFiveDaysAgoKey = shiftPriceHistoryDateKey(todayKey, -364);

  const rows = await prisma.$queryRaw<PriceStatsRow[]>(Prisma.sql`
    WITH "dailyHistory" AS (
      SELECT DISTINCT ON ("productId", DATE("date"))
        "productId",
        DATE("date") AS "historyDate",
        "price"
      FROM "DynamicPriceHistory"
      WHERE
        "productId" IN (${Prisma.join(uniqueProductIds)})
        AND DATE("date") >= ${threeHundredSixtyFiveDaysAgoKey}::date
        AND "price" > 0
      ORDER BY "productId", DATE("date"), "date" DESC, "updatedAt" DESC, "createdAt" DESC
    )
    SELECT
      "productId",
      AVG("price") FILTER (WHERE "historyDate" >= ${thirtyDaysAgoKey}::date)::float AS "averagePrice30d",
      MIN("price") FILTER (WHERE "historyDate" >= ${thirtyDaysAgoKey}::date)::float AS "lowestPrice30d",
      MAX("price") FILTER (WHERE "historyDate" >= ${thirtyDaysAgoKey}::date)::float AS "highestPrice30d",
      MIN("price")::float AS "lowestPrice365d"
    FROM "dailyHistory"
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
