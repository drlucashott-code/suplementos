import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  getCurrentSiteUser,
  isSiteUserVerified,
  verificationRequiredResponse,
} from "@/lib/siteAuth";
import {
  extractAmazonAsin,
  fetchMonitoredAmazonProductSnapshot,
} from "@/lib/siteMonitoredProducts";
import { getPriceHistoryCanonicalDate } from "@/lib/dynamicPriceHistory";
import { refreshTrackedAmazonProductPriceStatsBulk } from "@/lib/siteTrackedAmazonPriceStats";

export async function GET() {
  const user = await getCurrentSiteUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  if (!isSiteUserVerified(user)) {
    return verificationRequiredResponse();
  }

  const products = await prisma.$queryRaw<
    Array<{
      id: string;
      trackedProductId: string | null;
      asin: string;
      amazonUrl: string;
      name: string;
      imageUrl: string | null;
      totalPrice: number;
      averagePrice30d: number | null;
      availabilityStatus: string | null;
      programAndSavePrice: number | null;
      sortOrder: number;
      createdAt: Date;
    }>
  >(Prisma.sql`
    SELECT
      mp."id",
      mp."trackedProductId",
      COALESCE(tp."asin", mp."asin") AS "asin",
      COALESCE(tp."amazonUrl", mp."amazonUrl") AS "amazonUrl",
      COALESCE(tp."name", mp."name") AS "name",
      COALESCE(tp."imageUrl", mp."imageUrl") AS "imageUrl",
      COALESCE(tp."totalPrice", mp."totalPrice") AS "totalPrice",
      COALESCE(tp."averagePrice30d", mp."averagePrice30d") AS "averagePrice30d",
      COALESCE(tp."availabilityStatus", mp."availabilityStatus") AS "availabilityStatus",
      COALESCE(tp."programAndSavePrice", mp."programAndSavePrice") AS "programAndSavePrice",
      mp."sortOrder",
      mp."createdAt"
    FROM "SiteUserMonitoredProduct" mp
    LEFT JOIN "SiteTrackedAmazonProduct" tp ON tp."id" = mp."trackedProductId"
    WHERE mp."userId" = ${user.id}
    ORDER BY mp."sortOrder" ASC, mp."createdAt" DESC
  `);

  return NextResponse.json({
    ok: true,
    monitoredProducts: products.map((product) => ({
        id: product.id,
        trackedProductId: product.trackedProductId,
        savedAt: product.createdAt.toISOString(),
        sortOrder: product.sortOrder,
        product: {
          id: product.trackedProductId ?? product.id,
          asin: product.asin,
          name: product.name,
          totalPrice: product.totalPrice,
          imageUrl: product.imageUrl,
        url: product.amazonUrl,
        averagePrice30d: product.averagePrice30d,
        availabilityStatus: product.availabilityStatus,
        programAndSavePrice: product.programAndSavePrice,
      },
    })),
  });
}

export async function POST(request: Request) {
  const user = await getCurrentSiteUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  if (!isSiteUserVerified(user)) {
    return verificationRequiredResponse();
  }

  try {
    const body = (await request.json()) as { amazonUrl?: string };
    const amazonUrl = body.amazonUrl?.trim() ?? "";
    const asin = extractAmazonAsin(amazonUrl);

    if (!amazonUrl || !asin) {
      return NextResponse.json({ ok: false, error: "invalid_amazon_url" }, { status: 400 });
    }

    const catalogProducts = await prisma.$queryRaw<
      Array<{
        id: string;
        asin: string;
        name: string;
        totalPrice: number;
        imageUrl: string | null;
        url: string;
        averagePrice30d: number | null;
        availabilityStatus: string | null;
        categoryName: string;
        categoryGroup: string;
        categorySlug: string;
      }>
    >(Prisma.sql`
      SELECT
        p."id",
        p."asin",
        p."name",
        p."totalPrice",
        p."imageUrl",
        p."url",
        p."averagePrice30d",
        p."availabilityStatus",
        c."name" AS "categoryName",
        c."group" AS "categoryGroup",
        c."slug" AS "categorySlug"
      FROM "DynamicProduct" p
      INNER JOIN "DynamicCategory" c ON c."id" = p."categoryId"
      WHERE p."asin" = ${asin}
      LIMIT 1
    `);

    if (catalogProducts[0]) {
      const catalogProduct = catalogProducts[0];

      const favoriteRows = await prisma.$queryRaw<
        Array<{
          favoriteId: string;
          createdAt: Date;
        }>
      >(Prisma.sql`
        INSERT INTO "SiteUserFavorite" (
          "id",
          "userId",
          "productId",
          "createdAt",
          "updatedAt"
        )
        VALUES (
          ${randomUUID()},
          ${user.id},
          ${catalogProduct.id},
          NOW(),
          NOW()
        )
        ON CONFLICT ("userId", "productId")
        DO UPDATE SET "updatedAt" = NOW()
        RETURNING "id" AS "favoriteId", "createdAt"
      `);

      const existingFavorite =
        favoriteRows[0] ??
        (
          await prisma.$queryRaw<Array<{ favoriteId: string; createdAt: Date }>>(Prisma.sql`
            SELECT "id" AS "favoriteId", "createdAt"
            FROM "SiteUserFavorite"
            WHERE "userId" = ${user.id}
              AND "productId" = ${catalogProduct.id}
            LIMIT 1
          `)
        )[0];

      await prisma.$executeRaw`
        DELETE FROM "SiteUserMonitoredProduct"
        WHERE "userId" = ${user.id}
          AND "asin" = ${asin}
      `;

      if (!existingFavorite) {
        throw new Error("favorite_upsert_failed");
      }

      return NextResponse.json({
        ok: true,
        source: "catalog",
        favorite: {
          id: existingFavorite.favoriteId,
          savedAt: existingFavorite.createdAt.toISOString(),
          product: {
            id: catalogProduct.id,
            asin: catalogProduct.asin,
            name: catalogProduct.name,
            totalPrice: catalogProduct.totalPrice,
            imageUrl: catalogProduct.imageUrl,
            url: catalogProduct.url,
            averagePrice30d: catalogProduct.averagePrice30d,
            availabilityStatus: catalogProduct.availabilityStatus,
            category: {
              name: catalogProduct.categoryName,
              group: catalogProduct.categoryGroup,
              slug: catalogProduct.categorySlug,
            },
          },
        },
      });
    }

    const snapshot = await fetchMonitoredAmazonProductSnapshot(amazonUrl);
    const suggestionRows = await prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT s."id"
      FROM "SiteProductSuggestion" s
      WHERE s."asin" = ${snapshot.asin}
      LIMIT 1
    `);

    const trackedProductRows = await prisma.$queryRaw<
      Array<{
        id: string;
        asin: string;
        amazonUrl: string;
        name: string;
        imageUrl: string | null;
        totalPrice: number;
        averagePrice30d: number | null;
        availabilityStatus: string | null;
        programAndSavePrice: number | null;
      }>
    >(Prisma.sql`
      INSERT INTO "SiteTrackedAmazonProduct" (
        "id",
        "asin",
        "amazonUrl",
        "name",
        "imageUrl",
        "totalPrice",
        "availabilityStatus",
        "programAndSavePrice",
        "lastSyncedAt",
        "createdAt",
        "updatedAt"
      )
      VALUES (
        ${randomUUID()},
        ${snapshot.asin},
        ${snapshot.amazonUrl},
        ${snapshot.name},
        ${snapshot.imageUrl},
        ${snapshot.totalPrice},
        ${snapshot.availabilityStatus},
        ${snapshot.programAndSavePrice},
        NOW(),
        NOW(),
        NOW()
      )
      ON CONFLICT ("asin")
      DO UPDATE SET
        "amazonUrl" = EXCLUDED."amazonUrl",
        "name" = EXCLUDED."name",
        "imageUrl" = EXCLUDED."imageUrl",
        "totalPrice" = EXCLUDED."totalPrice",
        "availabilityStatus" = EXCLUDED."availabilityStatus",
        "programAndSavePrice" = EXCLUDED."programAndSavePrice",
        "lastSyncedAt" = NOW(),
        "updatedAt" = NOW()
      RETURNING
        "id",
        "asin",
        "amazonUrl",
        "name",
        "imageUrl",
        "totalPrice",
        "averagePrice30d",
        "availabilityStatus",
        "programAndSavePrice"
    `);
    const trackedProduct = trackedProductRows[0];
    if (!trackedProduct) {
      throw new Error("tracked_amazon_product_upsert_failed");
    }

    const maxSortOrderRows = await prisma.$queryRaw<Array<{ maxSortOrder: number | null }>>(Prisma.sql`
      SELECT MAX(mp."sortOrder")::int AS "maxSortOrder"
      FROM "SiteUserMonitoredProduct" mp
      WHERE mp."userId" = ${user.id}
    `);

    const monitoredProduct = await prisma.$queryRaw<
      Array<{
        id: string;
        trackedProductId: string | null;
        asin: string;
        amazonUrl: string;
        name: string;
        imageUrl: string | null;
        totalPrice: number;
        averagePrice30d: number | null;
        availabilityStatus: string | null;
        programAndSavePrice: number | null;
        sortOrder: number;
        createdAt: Date;
      }>
    >(Prisma.sql`
      INSERT INTO "SiteUserMonitoredProduct" (
        "id",
        "userId",
        "trackedProductId",
        "asin",
        "amazonUrl",
        "name",
        "imageUrl",
        "totalPrice",
        "availabilityStatus",
        "programAndSavePrice",
        "sortOrder",
        "lastTrackedPrice",
        "lastTrackedAvailability",
        "lastSyncedAt",
        "createdAt",
        "updatedAt"
      )
      VALUES (
        ${randomUUID()},
        ${user.id},
        ${trackedProduct.id},
        ${snapshot.asin},
        ${snapshot.amazonUrl},
        ${snapshot.name},
        ${snapshot.imageUrl},
        ${snapshot.totalPrice},
        ${snapshot.availabilityStatus},
        ${snapshot.programAndSavePrice},
        ${(maxSortOrderRows[0]?.maxSortOrder ?? -1) + 1},
        ${snapshot.totalPrice > 0 ? snapshot.totalPrice : null},
        ${snapshot.availabilityStatus},
        NOW(),
        NOW(),
        NOW()
      )
      ON CONFLICT ("userId", "asin")
      DO UPDATE SET
        "trackedProductId" = EXCLUDED."trackedProductId",
        "amazonUrl" = EXCLUDED."amazonUrl",
        "name" = EXCLUDED."name",
        "imageUrl" = EXCLUDED."imageUrl",
        "totalPrice" = EXCLUDED."totalPrice",
        "availabilityStatus" = EXCLUDED."availabilityStatus",
        "programAndSavePrice" = EXCLUDED."programAndSavePrice",
        "lastSyncedAt" = NOW(),
        "updatedAt" = NOW()
      RETURNING
        "id",
        "trackedProductId",
        "asin",
        "amazonUrl",
        "name",
        "imageUrl",
        "totalPrice",
        "averagePrice30d",
        "availabilityStatus",
        "programAndSavePrice",
        "sortOrder",
        "createdAt"
    `);
    const row = monitoredProduct[0];
    if (!row) {
      throw new Error("monitored_product_upsert_failed");
    }

    if (trackedProduct.totalPrice > 0) {
      const historyDate = getPriceHistoryCanonicalDate();
      await prisma.$executeRaw(Prisma.sql`
        INSERT INTO "SiteTrackedAmazonProductPriceHistory" (
          "id",
          "trackedProductId",
          "price",
          "updateCount",
          "date",
          "createdAt",
          "updatedAt"
        )
        VALUES (
          ${randomUUID()},
          ${trackedProduct.id},
          ${trackedProduct.totalPrice},
          1,
          ${historyDate},
          NOW(),
          NOW()
        )
        ON CONFLICT ("trackedProductId", "date")
        DO UPDATE SET
          "price" = EXCLUDED."price",
          "updateCount" = "SiteTrackedAmazonProductPriceHistory"."updateCount" + 1,
          "updatedAt" = NOW()
      `);

      await refreshTrackedAmazonProductPriceStatsBulk([trackedProduct.id]);
    }

    await prisma.$executeRaw`
      UPDATE "SiteTrackedAmazonProduct"
      SET "monitorCount" = (
        SELECT COUNT(*)::int
        FROM "SiteUserMonitoredProduct"
        WHERE "trackedProductId" = ${trackedProduct.id}
      )
      WHERE "id" = ${trackedProduct.id}
    `;

    return NextResponse.json({
      ok: true,
      source: "amazon",
      canSuggestComparator: suggestionRows.length === 0,
      monitoredProduct: {
        id: row.id,
        trackedProductId: row.trackedProductId,
        savedAt: row.createdAt.toISOString(),
        sortOrder: row.sortOrder,
        product: {
          id: trackedProduct.id,
          asin: trackedProduct.asin,
          name: trackedProduct.name,
          totalPrice: trackedProduct.totalPrice,
          imageUrl: trackedProduct.imageUrl,
          url: trackedProduct.amazonUrl,
          averagePrice30d: trackedProduct.averagePrice30d,
          availabilityStatus: trackedProduct.availabilityStatus,
          programAndSavePrice: trackedProduct.programAndSavePrice,
        },
      },
    });
  } catch (error) {
    console.error("monitored_product_create_failed", error);
    return NextResponse.json(
      { ok: false, error: "monitored_product_create_failed" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  const user = await getCurrentSiteUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  if (!isSiteUserVerified(user)) {
    return verificationRequiredResponse();
  }

  try {
    const body = (await request.json()) as { orderedIds?: string[] };
    const orderedIds = Array.isArray(body.orderedIds)
      ? body.orderedIds.map((value) => value.trim()).filter(Boolean)
      : [];

    if (orderedIds.length === 0) {
      return NextResponse.json({ ok: false, error: "invalid_order" }, { status: 400 });
    }

    const currentItems = await prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT mp."id"
      FROM "SiteUserMonitoredProduct" mp
      WHERE mp."userId" = ${user.id}
    `);

    if (currentItems.length !== orderedIds.length) {
      return NextResponse.json({ ok: false, error: "invalid_order" }, { status: 400 });
    }

    const currentIds = new Set(currentItems.map((item) => item.id));
    const hasInvalidItem = orderedIds.some((itemId) => !currentIds.has(itemId));
    if (hasInvalidItem) {
      return NextResponse.json({ ok: false, error: "invalid_order" }, { status: 400 });
    }

    for (let index = 0; index < orderedIds.length; index += 1) {
      await prisma.$executeRaw`
        UPDATE "SiteUserMonitoredProduct"
        SET "sortOrder" = ${index}, "updatedAt" = NOW()
        WHERE "id" = ${orderedIds[index]!}
          AND "userId" = ${user.id}
      `;
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("monitored_product_reorder_failed", error);
    return NextResponse.json(
      { ok: false, error: "monitored_product_reorder_failed" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  const user = await getCurrentSiteUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  if (!isSiteUserVerified(user)) {
    return verificationRequiredResponse();
  }

  try {
    const body = (await request.json()) as { monitoredProductId?: string };
    const monitoredProductId = body.monitoredProductId?.trim() ?? "";
    if (!monitoredProductId) {
      return NextResponse.json(
        { ok: false, error: "invalid_monitored_product" },
        { status: 400 }
      );
    }

    const deletedRows = await prisma.$queryRaw<Array<{ trackedProductId: string | null }>>(Prisma.sql`
      DELETE FROM "SiteUserMonitoredProduct"
      WHERE "id" = ${monitoredProductId}
        AND "userId" = ${user.id}
      RETURNING "trackedProductId"
    `);

    const trackedProductId = deletedRows[0]?.trackedProductId ?? null;
    if (trackedProductId) {
      await prisma.$executeRaw`
        UPDATE "SiteTrackedAmazonProduct"
        SET "monitorCount" = (
          SELECT COUNT(*)::int
          FROM "SiteUserMonitoredProduct"
          WHERE "trackedProductId" = ${trackedProductId}
        )
        WHERE "id" = ${trackedProductId}
      `;
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("monitored_product_delete_failed", error);
    return NextResponse.json(
      { ok: false, error: "monitored_product_delete_failed" },
      { status: 500 }
    );
  }
}
