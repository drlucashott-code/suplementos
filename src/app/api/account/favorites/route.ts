import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  getCurrentSiteUser,
  isSiteUserVerified,
  verificationRequiredResponse,
} from "@/lib/siteAuth";
import { touchDynamicProductPriority } from "@/lib/priceRefreshSignals";
import { enqueuePriorityRefresh } from "@/lib/priorityRefreshQueue";
import { ensureDefaultList } from "@/lib/siteDefaultList";

async function resolveFavoriteList(
  userId: string,
  requestedListId?: string | null,
  options?: { createIfMissing?: boolean }
) {
  const accessibleLists = await prisma.$queryRaw<
    Array<{ id: string; slug: string; title: string; isDefault: boolean }>
  >(Prisma.sql`
    SELECT "id", "slug", "title", "isDefault"
    FROM "SiteUserList"
    WHERE "userId" = ${userId}
    ORDER BY "isDefault" DESC, "createdAt" ASC
  `);

  if (requestedListId) {
    const requestedList = accessibleLists.find((list) => list.id === requestedListId);
    if (requestedList) {
      return requestedList;
    }
  }

  const defaultList = accessibleLists.find((list) => list.isDefault) ?? null;
  if (defaultList) {
    return defaultList;
  }

  const firstList = accessibleLists[0] ?? null;
  if (firstList) {
    return firstList;
  }

  if (options?.createIfMissing) {
    return ensureDefaultList(userId);
  }

  return null;
}

export async function GET(request: Request) {
  const user = await getCurrentSiteUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  if (!isSiteUserVerified(user)) {
    return verificationRequiredResponse();
  }

  const { searchParams } = new URL(request.url);
  const requestedListId = searchParams.get("listId");
  const list = await resolveFavoriteList(user.id, requestedListId, { createIfMissing: false });

  if (!list) {
    return NextResponse.json({ ok: true, list: null, favorites: [] });
  }

  const favorites = await prisma.$queryRaw<
      Array<{
        id: string;
        createdAt: Date;
        sortOrder: number;
        product: {
        id: string;
        asin: string;
        name: string;
        totalPrice: number;
        imageUrl: string | null;
        url: string;
        averagePrice30d: number | null;
        lowestPrice30d: number | null;
        highestPrice30d: number | null;
        ratingAverage: number | null;
        ratingCount: number | null;
        category: {
          name: string;
          group: string;
          slug: string;
        };
      };
    }>
  >(Prisma.sql`
    SELECT
        f."id",
        f."createdAt",
        f."sortOrder",
        json_build_object(
        'id', p."id",
        'asin', p."asin",
        'name', p."name",
        'totalPrice', p."totalPrice",
        'imageUrl', p."imageUrl",
        'url', p."url",
        'averagePrice30d', p."averagePrice30d",
        'lowestPrice30d', p."lowestPrice30d",
        'highestPrice30d', p."highestPrice30d",
        'ratingAverage', p."ratingAverage",
        'ratingCount', p."ratingCount",
        'category', json_build_object(
          'name', c."name",
          'group', c."group",
          'slug', c."slug"
        )
      ) AS "product"
    FROM "SiteUserListItem" f
    INNER JOIN "DynamicProduct" p ON p."id" = f."productId"
    INNER JOIN "DynamicCategory" c ON c."id" = p."categoryId"
    WHERE f."listId" = ${list.id}
      AND f."productId" IS NOT NULL
      ORDER BY f."sortOrder" ASC, f."createdAt" DESC
  `);

  return NextResponse.json({
    ok: true,
    list,
    favorites: favorites.map((favorite) => ({
      id: favorite.id,
      savedAt: favorite.createdAt,
      sortOrder: favorite.sortOrder,
      product: favorite.product,
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
    const body = (await request.json()) as { productId?: string; note?: string; listId?: string };
    const productId = body.productId?.trim() ?? "";
    const requestedListId = body.listId?.trim() ?? null;

    if (!productId) {
      return NextResponse.json({ ok: false, error: "invalid_product" }, { status: 400 });
    }

    const list = await resolveFavoriteList(user.id, requestedListId, { createIfMissing: true });

    if (!list) {
      return NextResponse.json({ ok: false, error: "favorite_list_resolution_failed" }, { status: 500 });
    }

    const existingItemRows = await prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT "id"
      FROM "SiteUserListItem"
      WHERE "listId" = ${list.id}
        AND "productId" = ${productId}
      LIMIT 1
    `);

    if (existingItemRows[0]) {
      await prisma.$executeRaw(Prisma.sql`
        UPDATE "SiteUserListItem"
        SET "note" = ${body.note?.trim() || null},
            "updatedAt" = NOW()
        WHERE "id" = ${existingItemRows[0].id}
      `);

      return NextResponse.json({ ok: true, list });
    }

    const maxSortOrderRows = await prisma.$queryRaw<Array<{ maxSortOrder: number | null }>>(Prisma.sql`
      SELECT MAX("sortOrder")::int AS "maxSortOrder"
      FROM "SiteUserListItem"
      WHERE "listId" = ${list.id}
    `);

    await prisma.siteUserListItem.create({
      data: {
        id: randomUUID(),
        listId: list.id,
        productId,
        note: body.note?.trim() || null,
        sortOrder: (maxSortOrderRows[0]?.maxSortOrder ?? -1) + 1,
        monitoredProductId: null,
        trackedAmazonProductId: null,
      },
    });

    try {
      const priorityTouch = await touchDynamicProductPriority({
        productId,
        signal: "favorite",
      });

      if (priorityTouch?.shouldEnqueue && priorityTouch.asin) {
        await enqueuePriorityRefresh({
          asin: priorityTouch.asin,
          reason: "favorite",
        });
      }
    } catch (priorityError) {
      console.error("favorite_priority_refresh_failed", priorityError);
    }

    return NextResponse.json({ ok: true, list });
  } catch (error) {
    const errorDetail = error instanceof Error ? error.message : String(error);
    console.error("favorite_create_failed", { errorDetail, error });
    return NextResponse.json(
      { ok: false, error: "favorite_create_failed", errorDetail },
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
    const body = (await request.json()) as { productId?: string; listId?: string };
    const productId = body.productId?.trim() ?? "";
    const requestedListId = body.listId?.trim() ?? null;

    if (!productId) {
      return NextResponse.json({ ok: false, error: "invalid_product" }, { status: 400 });
    }

    const preferredList = await resolveFavoriteList(user.id, requestedListId, {
      createIfMissing: false,
    });

    const matchingListRows = preferredList
      ? await prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
          SELECT "id"
          FROM "SiteUserListItem"
          WHERE "listId" = ${preferredList.id}
            AND "productId" = ${productId}
          LIMIT 1
        `)
      : [];

    let targetListId = matchingListRows[0]?.id ? preferredList?.id ?? null : null;

    if (!targetListId) {
      const fallbackMatchRows = await prisma.$queryRaw<Array<{ listId: string }>>(Prisma.sql`
        SELECT i."listId"
        FROM "SiteUserListItem" i
        INNER JOIN "SiteUserList" l ON l."id" = i."listId"
        WHERE l."userId" = ${user.id}
          AND i."productId" = ${productId}
        ORDER BY l."isDefault" DESC, l."createdAt" ASC
        LIMIT 1
      `);
      targetListId = fallbackMatchRows[0]?.listId ?? null;
    }

    if (!targetListId) {
      return NextResponse.json({ ok: true });
    }

    await prisma.$executeRaw(Prisma.sql`
      DELETE FROM "SiteUserListItem"
      WHERE "listId" = ${targetListId}
        AND "productId" = ${productId}
    `);

    await prisma.$executeRaw(Prisma.sql`
      DELETE FROM "SiteUserFavorite"
      WHERE "userId" = ${user.id}
        AND "productId" = ${productId}
    `);

    return NextResponse.json({ ok: true, list: preferredList ?? { id: targetListId } });
  } catch (error) {
    console.error("favorite_delete_failed", error);
    return NextResponse.json({ ok: false, error: "favorite_delete_failed" }, { status: 500 });
  }
}
