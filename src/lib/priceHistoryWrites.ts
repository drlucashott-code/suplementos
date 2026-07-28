import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";

export async function writeDynamicDailyPriceHistoryIfChanged(params: {
  productId: string;
  date: Date;
  price: number;
}) {
  const changedRows = await prisma.$queryRaw<Array<{ changed: number }>>`
    INSERT INTO "DynamicPriceHistory" (
      "id", "productId", "date", "price", "updateCount", "createdAt", "updatedAt"
    )
    VALUES (
      ${randomUUID()}, ${params.productId}, ${params.date}, ${params.price}, 1, NOW(), NOW()
    )
    ON CONFLICT ("productId", "date") DO UPDATE
    SET
      "price" = EXCLUDED."price",
      "updateCount" = "DynamicPriceHistory"."updateCount" + 1,
      "updatedAt" = NOW()
    WHERE "DynamicPriceHistory"."price" IS DISTINCT FROM EXCLUDED."price"
    RETURNING 1 AS changed
  `;

  return changedRows.length > 0;
}

export async function writeTrackedDailyPriceHistoryIfChanged(params: {
  trackedProductId: string;
  date: Date;
  price: number;
}) {
  const changedRows = await prisma.$queryRaw<Array<{ changed: number }>>`
    INSERT INTO "SiteTrackedAmazonProductPriceHistory" (
      "id", "trackedProductId", "date", "price", "updateCount", "createdAt", "updatedAt"
    )
    VALUES (
      ${randomUUID()}, ${params.trackedProductId}, ${params.date}, ${params.price}, 1, NOW(), NOW()
    )
    ON CONFLICT ("trackedProductId", "date") DO UPDATE
    SET
      "price" = EXCLUDED."price",
      "updateCount" = "SiteTrackedAmazonProductPriceHistory"."updateCount" + 1,
      "updatedAt" = NOW()
    WHERE "SiteTrackedAmazonProductPriceHistory"."price" IS DISTINCT FROM EXCLUDED."price"
    RETURNING 1 AS changed
  `;

  return changedRows.length > 0;
}
