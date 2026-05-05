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
  touchDynamicProductPriority,
  touchTrackedProductPriority,
} from "@/lib/priceRefreshSignals";
import { enqueuePriorityRefresh } from "@/lib/priorityRefreshQueue";

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

    await prisma.siteUserListItem.create({
      data: {
        id: randomUUID(),
        listId: id,
        productId: productId || null,
        monitoredProductId: trackedAmazonProductId ? null : monitoredProductId || null,
        trackedAmazonProductId: trackedAmazonProductId || null,
        note: body.note?.trim() || null,
        sortOrder: (maxSortOrderRows[0]?.maxSortOrder ?? -1) + 1,
      },
    });

    try {
      if (productId) {
        const priorityTouch = await touchDynamicProductPriority({
          productId,
          signal: "list",
        });
        if (priorityTouch?.shouldEnqueue && priorityTouch.asin) {
          await enqueuePriorityRefresh({
            asin: priorityTouch.asin,
            reason: "list",
          });
        }
      } else if (trackedAmazonProductId) {
        await touchTrackedProductPriority({
          trackedProductId: trackedAmazonProductId,
          signal: "list",
        });
      }
    } catch (error) {
      const errorDetail = error instanceof Error ? error.message : String(error);
      console.error("list_item_priority_touch_failed", { errorDetail, error });
    }

    return NextResponse.json({ ok: true, created: true });
  } catch (error) {
    const errorDetail = error instanceof Error ? error.message : String(error);
    console.error("list_item_create_failed", { errorDetail, error });
    return NextResponse.json(
      { ok: false, error: "list_item_create_failed", errorDetail },
      { status: 500 }
    );
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
    const body = (await request.json()) as {
      itemId?: string;
      productId?: string;
      monitoredProductId?: string;
    };
    const itemId = body.itemId?.trim() ?? "";
    const productId = body.productId?.trim() ?? "";
    const monitoredProductId = body.monitoredProductId?.trim() ?? "";

    if (!itemId && !productId && !monitoredProductId) {
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

    if (itemId) {
      const deleted = await prisma.siteUserListItem.deleteMany({
        where: {
          id: itemId,
          listId: id,
        },
      });

      return NextResponse.json({ ok: true, deleted: deleted.count });
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

    const deleteWhere: {
      listId: string;
      OR: Array<Record<string, string>>;
    } = {
      listId: id,
      OR: [],
    };

    if (productId) {
      deleteWhere.OR.push({ productId });
    }
    if (trackedAmazonProductId) {
      deleteWhere.OR.push({ trackedAmazonProductId });
    }
    if (monitoredProductId) {
      deleteWhere.OR.push({ monitoredProductId });
    }

    const deleted = await prisma.siteUserListItem.deleteMany({
      where: deleteWhere,
    });

    if (deleted.count === 0) {
      return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, deleted: deleted.count });
  } catch (error) {
    const errorDetail = error instanceof Error ? error.message : String(error);
    console.error("list_item_delete_failed", { errorDetail, error });
    return NextResponse.json(
      { ok: false, error: "list_item_delete_failed", errorDetail },
      { status: 500 }
    );
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
    const errorDetail = error instanceof Error ? error.message : String(error);
    console.error("list_item_reorder_failed", { errorDetail, error });
    return NextResponse.json(
      { ok: false, error: "list_item_reorder_failed", errorDetail },
      { status: 500 }
    );
  }
}
