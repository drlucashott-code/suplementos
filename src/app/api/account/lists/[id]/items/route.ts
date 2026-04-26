import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentSiteUser } from "@/lib/siteAuth";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentSiteUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const body = (await request.json()) as { productId?: string; note?: string };
    const productId = body.productId?.trim() ?? "";

    if (!productId) {
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

    const existingItem = await prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
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
        "note",
        "sortOrder",
        "createdAt",
        "updatedAt"
      )
      VALUES (
        ${randomUUID()},
        ${id},
        ${productId},
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

  try {
    const { id } = await context.params;
    const body = (await request.json()) as { productId?: string };
    const productId = body.productId?.trim() ?? "";

    if (!productId) {
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

    await prisma.$executeRaw(Prisma.sql`
      DELETE FROM "SiteUserListItem"
      WHERE "listId" = ${id}
        AND "productId" = ${productId}
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

  try {
    const { id } = await context.params;
    const body = (await request.json()) as { orderedProductIds?: string[] };
    const orderedProductIds = Array.isArray(body.orderedProductIds)
      ? body.orderedProductIds.map((value) => value.trim()).filter(Boolean)
      : [];

    if (orderedProductIds.length === 0) {
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

    const currentItems = await prisma.$queryRaw<Array<{ productId: string }>>(Prisma.sql`
      SELECT "productId"
      FROM "SiteUserListItem"
      WHERE "listId" = ${id}
    `);

    if (currentItems.length !== orderedProductIds.length) {
      return NextResponse.json({ ok: false, error: "invalid_order" }, { status: 400 });
    }

    const currentIds = new Set(currentItems.map((item) => item.productId));
    const hasInvalidItem = orderedProductIds.some((productId) => !currentIds.has(productId));
    if (hasInvalidItem) {
      return NextResponse.json({ ok: false, error: "invalid_order" }, { status: 400 });
    }

    for (let index = 0; index < orderedProductIds.length; index += 1) {
      await prisma.$executeRaw(Prisma.sql`
        UPDATE "SiteUserListItem"
        SET "sortOrder" = ${index}, "updatedAt" = NOW()
        WHERE "listId" = ${id}
          AND "productId" = ${orderedProductIds[index]!}
      `);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("list_item_reorder_failed", error);
    return NextResponse.json({ ok: false, error: "list_item_reorder_failed" }, { status: 500 });
  }
}
