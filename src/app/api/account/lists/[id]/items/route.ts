import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  getCurrentSiteUser,
  isSiteUserVerified,
  verificationRequiredResponse,
} from "@/lib/siteAuth";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentSiteUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  if (!isSiteUserVerified(user)) {
    return verificationRequiredResponse();
  }

  try {
    const { id } = await context.params;
    const body = (await request.json()) as {
      productId?: string;
      monitoredProductId?: string;
      note?: string;
    };
    const productId = body.productId?.trim() ?? "";
    const monitoredProductId = body.monitoredProductId?.trim() ?? "";

    if (!productId && !monitoredProductId) {
      return NextResponse.json({ ok: false, error: "invalid_product" }, { status: 400 });
    }

    const list = await prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT "id"
      FROM "SiteUserList"
      WHERE "id" = ${id}
        AND "userId" = ${user.id}
      LIMIT 1
    `);

    if (!list[0]) {
      return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    }

    let trackedAmazonProductId: string | null = null;

    if (monitoredProductId) {
      const monitoredProduct = await prisma.$queryRaw<Array<{ id: string; trackedProductId: string | null }>>(Prisma.sql`
        SELECT "id", "trackedProductId"
        FROM "SiteUserMonitoredProduct"
        WHERE "id" = ${monitoredProductId}
          AND "userId" = ${user.id}
        LIMIT 1
      `);

      if (!monitoredProduct[0]) {
        return NextResponse.json({ ok: false, error: "monitored_product_not_found" }, { status: 404 });
      }

      trackedAmazonProductId = monitoredProduct[0].trackedProductId;
    }

    const existingItem = trackedAmazonProductId
      ? await prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
          SELECT "id"
          FROM "SiteUserListItem"
          WHERE "listId" = ${id}
            AND "trackedAmazonProductId" = ${trackedAmazonProductId}
          LIMIT 1
        `)
      : monitoredProductId
      ? await prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
          SELECT "id"
          FROM "SiteUserListItem"
          WHERE "listId" = ${id}
            AND "monitoredProductId" = ${monitoredProductId}
          LIMIT 1
        `)
      : await prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
          SELECT "id"
          FROM "SiteUserListItem"
          WHERE "listId" = ${id}
            AND "productId" = ${productId}
          LIMIT 1
        `);

    if (existingItem[0]) {
      await prisma.$executeRaw(Prisma.sql`
        UPDATE "SiteUserListItem"
        SET "note" = ${body.note?.trim() || null}, "updatedAt" = NOW()
        WHERE "id" = ${existingItem[0].id}
      `);

      return NextResponse.json({ ok: true, created: false });
    }

    const maxSortOrderRows = await prisma.$queryRaw<Array<{ maxSortOrder: number | null }>>(Prisma.sql`
      SELECT MAX("sortOrder")::int AS "maxSortOrder"
      FROM "SiteUserListItem"
      WHERE "listId" = ${id}
    `);

    await prisma.$executeRaw(Prisma.sql`
      INSERT INTO "SiteUserListItem" (
        "id",
        "listId",
        "productId",
        "monitoredProductId",
        "trackedAmazonProductId",
        "note",
        "sortOrder",
        "createdAt",
        "updatedAt"
      )
      VALUES (
        ${randomUUID()},
        ${id},
        ${productId || null},
        ${trackedAmazonProductId ? null : monitoredProductId || null},
        ${trackedAmazonProductId},
        ${body.note?.trim() || null},
        ${(maxSortOrderRows[0]?.maxSortOrder ?? -1) + 1},
        NOW(),
        NOW()
      )
    `);

    return NextResponse.json({ ok: true, created: true });
  } catch (error) {
    console.error("list_item_create_failed", error);
    return NextResponse.json({ ok: false, error: "list_item_create_failed" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentSiteUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  if (!isSiteUserVerified(user)) {
    return verificationRequiredResponse();
  }

  try {
    const { id } = await context.params;
    const body = (await request.json()) as { productId?: string; monitoredProductId?: string };
    const productId = body.productId?.trim() ?? "";
    const monitoredProductId = body.monitoredProductId?.trim() ?? "";

    if (!productId && !monitoredProductId) {
      return NextResponse.json({ ok: false, error: "invalid_product" }, { status: 400 });
    }

    const list = await prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT "id"
      FROM "SiteUserList"
      WHERE "id" = ${id}
        AND "userId" = ${user.id}
      LIMIT 1
    `);

    if (!list[0]) {
      return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    }

    let trackedAmazonProductId: string | null = null;
    if (monitoredProductId) {
      const monitoredProduct = await prisma.$queryRaw<Array<{ trackedProductId: string | null }>>(Prisma.sql`
        SELECT "trackedProductId"
        FROM "SiteUserMonitoredProduct"
        WHERE "id" = ${monitoredProductId}
          AND "userId" = ${user.id}
        LIMIT 1
      `);
      trackedAmazonProductId = monitoredProduct[0]?.trackedProductId ?? null;
    }

    await prisma.$executeRaw(Prisma.sql`
      DELETE FROM "SiteUserListItem"
      WHERE "listId" = ${id}
        AND (
          (${productId || null} IS NOT NULL AND "productId" = ${productId || null})
          OR (${trackedAmazonProductId} IS NOT NULL AND "trackedAmazonProductId" = ${trackedAmazonProductId})
          OR (${monitoredProductId || null} IS NOT NULL AND "monitoredProductId" = ${monitoredProductId || null})
        )
    `);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("list_item_delete_failed", error);
    return NextResponse.json({ ok: false, error: "list_item_delete_failed" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentSiteUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  if (!isSiteUserVerified(user)) {
    return verificationRequiredResponse();
  }

  try {
    const { id } = await context.params;
    const body = (await request.json()) as { orderedItemIds?: string[] };
    const orderedItemIds = Array.isArray(body.orderedItemIds)
      ? body.orderedItemIds.map((value) => value.trim()).filter(Boolean)
      : [];

    if (orderedItemIds.length === 0) {
      return NextResponse.json({ ok: false, error: "invalid_order" }, { status: 400 });
    }

    const list = await prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT "id"
      FROM "SiteUserList"
      WHERE "id" = ${id}
        AND "userId" = ${user.id}
      LIMIT 1
    `);

    if (!list[0]) {
      return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    }

    const currentItems = await prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT "id"
      FROM "SiteUserListItem"
      WHERE "listId" = ${id}
    `);

    if (currentItems.length !== orderedItemIds.length) {
      return NextResponse.json({ ok: false, error: "invalid_order" }, { status: 400 });
    }

    const currentIds = new Set(currentItems.map((item) => item.id));
    const hasInvalidItem = orderedItemIds.some((itemId) => !currentIds.has(itemId));
    if (hasInvalidItem) {
      return NextResponse.json({ ok: false, error: "invalid_order" }, { status: 400 });
    }

    for (let index = 0; index < orderedItemIds.length; index += 1) {
      await prisma.$executeRaw(Prisma.sql`
        UPDATE "SiteUserListItem"
        SET "sortOrder" = ${index}, "updatedAt" = NOW()
        WHERE "id" = ${orderedItemIds[index]!}
          AND "listId" = ${id}
      `);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("list_item_reorder_failed", error);
    return NextResponse.json({ ok: false, error: "list_item_reorder_failed" }, { status: 500 });
  }
}
