import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function writeDynamicDailyPriceHistoryIfChanged(params: {
  productId: string;
  date: Date;
  price: number;
}) {
  const rows = await prisma.$queryRaw<Array<{ wrote: boolean }>>(Prisma.sql`
    WITH upserted AS (
      INSERT INTO "DynamicPriceHistory" (
        "productId",
        "date",
        "price",
        "updateCount",
        "createdAt",
        "updatedAt"
      )
      VALUES (
        ${params.productId},
        ${params.date},
        ${params.price},
        1,
        NOW(),
        NOW()
      )
      ON CONFLICT ("productId", "date")
      DO UPDATE SET
        "price" = EXCLUDED."price",
        "updateCount" = "DynamicPriceHistory"."updateCount" + 1,
        "updatedAt" = NOW()
      WHERE "DynamicPriceHistory"."price" IS DISTINCT FROM EXCLUDED."price"
      RETURNING 1
    )
    SELECT EXISTS(SELECT 1 FROM upserted) AS "wrote"
  `);

  return rows[0]?.wrote ?? false;
}

export async function writeTrackedDailyPriceHistoryIfChanged(params: {
  trackedProductId: string;
  date: Date;
  price: number;
}) {
  const rows = await prisma.$queryRaw<Array<{ wrote: boolean }>>(Prisma.sql`
    WITH upserted AS (
      INSERT INTO "SiteTrackedAmazonProductPriceHistory" (
        "trackedProductId",
        "date",
        "price",
        "updateCount",
        "createdAt",
        "updatedAt"
      )
      VALUES (
        ${params.trackedProductId},
        ${params.date},
        ${params.price},
        1,
        NOW(),
        NOW()
      )
      ON CONFLICT ("trackedProductId", "date")
      DO UPDATE SET
        "price" = EXCLUDED."price",
        "updateCount" = "SiteTrackedAmazonProductPriceHistory"."updateCount" + 1,
        "updatedAt" = NOW()
      WHERE "SiteTrackedAmazonProductPriceHistory"."price" IS DISTINCT FROM EXCLUDED."price"
      RETURNING 1
    )
    SELECT EXISTS(SELECT 1 FROM upserted) AS "wrote"
  `);

  return rows[0]?.wrote ?? false;
}
