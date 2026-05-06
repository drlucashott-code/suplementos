import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  getPriceHistoryBusinessDateKey,
  shiftPriceHistoryDateKey,
} from "@/lib/dynamicPriceHistory";

type PriceStatsRow = {
  trackedProductId?: string;
  averagePrice30d: number | null;
  lowestPrice30d: number | null;
  highestPrice30d: number | null;
  lowestPrice365d: number | null;
};

export async function refreshTrackedAmazonProductPriceStatsBulk(trackedProductIds: string[]) {
  const uniqueTrackedProductIds = [...new Set(trackedProductIds.filter(Boolean))];
  if (uniqueTrackedProductIds.length === 0) return;

  const todayKey = getPriceHistoryBusinessDateKey();
  const thirtyDaysAgoKey = shiftPriceHistoryDateKey(todayKey, -29);
  const threeHundredSixtyFiveDaysAgoKey = shiftPriceHistoryDateKey(todayKey, -364);

  const rows = await prisma.$queryRaw<PriceStatsRow[]>(Prisma.sql`
    WITH "dailyHistory" AS (
      SELECT DISTINCT ON ("trackedProductId", DATE("date"))
        "trackedProductId",
        DATE("date") AS "historyDate",
        "price"
      FROM "SiteTrackedAmazonProductPriceHistory"
      WHERE
        "trackedProductId" IN (${Prisma.join(uniqueTrackedProductIds)})
        AND DATE("date") >= ${threeHundredSixtyFiveDaysAgoKey}::date
        AND "price" > 0
      ORDER BY "trackedProductId", DATE("date"), "date" DESC, "updatedAt" DESC, "createdAt" DESC
    )
    SELECT
      "trackedProductId",
      AVG("price") FILTER (WHERE "historyDate" >= ${thirtyDaysAgoKey}::date)::float AS "averagePrice30d",
      MIN("price") FILTER (WHERE "historyDate" >= ${thirtyDaysAgoKey}::date)::float AS "lowestPrice30d",
      MAX("price") FILTER (WHERE "historyDate" >= ${thirtyDaysAgoKey}::date)::float AS "highestPrice30d",
      MIN("price")::float AS "lowestPrice365d"
    FROM "dailyHistory"
    GROUP BY "trackedProductId"
  `);

  const statsByTrackedProductId = new Map(
    rows
      .filter((row): row is PriceStatsRow & { trackedProductId: string } => !!row.trackedProductId)
      .map((row) => [row.trackedProductId, row])
  );

  for (const trackedProductId of uniqueTrackedProductIds) {
    const row = statsByTrackedProductId.get(trackedProductId);
    await prisma.siteTrackedAmazonProduct.updateMany({
      where: { id: trackedProductId },
      data: {
        averagePrice30d: row?.averagePrice30d ?? null,
        lowestPrice30d: row?.lowestPrice30d ?? null,
        highestPrice30d: row?.highestPrice30d ?? null,
        lowestPrice365d: row?.lowestPrice365d ?? null,
        updatedAt: new Date(),
      },
    });
  }
}
