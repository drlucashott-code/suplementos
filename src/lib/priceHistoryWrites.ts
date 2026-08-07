import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";

export async function writeDynamicDailyPriceHistoryIfChanged(params: {
  productId: string;
  date: Date;
  price: number;
}) {
  if (!Number.isFinite(params.price) || !Number.isFinite(params.date.getTime())) {
    return false;
  }

  // Keep the bind value textual before casting it in PostgreSQL. A whole-number
  // JavaScript value (for example, 55.00) is encoded by Prisma as an integer,
  // which conflicts with the float8 parameter expected by the explicit cast.
  const priceValue = params.price.toString();

  const changedRows = await prisma.$queryRaw<Array<{ changed: number }>>`
    INSERT INTO "DynamicPriceHistory" (
      "id", "productId", "date", "price", "updateCount", "createdAt", "updatedAt"
    )
    VALUES (
      ${randomUUID()}, ${params.productId}, ${params.date}::timestamptz, ${priceValue}::double precision, 1, NOW(), NOW()
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
  if (!Number.isFinite(params.price) || !Number.isFinite(params.date.getTime())) {
    return false;
  }

  const priceValue = params.price.toString();

  const changedRows = await prisma.$queryRaw<Array<{ changed: number }>>`
    INSERT INTO "SiteTrackedAmazonProductPriceHistory" (
      "id", "trackedProductId", "date", "price", "updateCount", "createdAt", "updatedAt"
    )
    VALUES (
      ${randomUUID()}, ${params.trackedProductId}, ${params.date}::timestamptz, ${priceValue}::double precision, 1, NOW(), NOW()
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
