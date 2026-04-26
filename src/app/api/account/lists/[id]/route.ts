import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  getCurrentSiteUser,
  isSiteUserVerified,
  verificationRequiredResponse,
} from "@/lib/siteAuth";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentSiteUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  if (!isSiteUserVerified(user)) {
    return verificationRequiredResponse();
  }

  const { id } = await context.params;

  const rows = await prisma.$queryRaw<
    Array<{
      id: string;
      slug: string;
      title: string;
      description: string | null;
      isPublic: boolean;
      itemId: string | null;
      note: string | null;
      sortOrder: number | null;
      productId: string | null;
      monitoredProductId: string | null;
      productAsin: string | null;
      productName: string | null;
      productImageUrl: string | null;
      productTotalPrice: number | null;
      productAveragePrice30d: number | null;
      productUrl: string | null;
      productAvailabilityStatus: string | null;
      categoryName: string | null;
      categoryGroup: string | null;
      categorySlug: string | null;
    }>
  >(Prisma.sql`
    SELECT
      l."id",
      l."slug",
      l."title",
      l."description",
      l."isPublic",
      i."id" AS "itemId",
      i."note",
      i."sortOrder",
      p."id" AS "productId",
      mp."id" AS "monitoredProductId",
      COALESCE(p."asin", mp."asin") AS "productAsin",
      COALESCE(p."name", mp."name") AS "productName",
      COALESCE(p."imageUrl", mp."imageUrl") AS "productImageUrl",
      COALESCE(p."totalPrice", mp."totalPrice") AS "productTotalPrice",
      COALESCE(p."averagePrice30d", mp."averagePrice30d") AS "productAveragePrice30d",
      COALESCE(p."url", mp."amazonUrl") AS "productUrl",
      COALESCE(p."availabilityStatus", mp."availabilityStatus") AS "productAvailabilityStatus",
      c."name" AS "categoryName",
      c."group" AS "categoryGroup",
      c."slug" AS "categorySlug"
    FROM "SiteUserList" l
    LEFT JOIN "SiteUserListItem" i ON i."listId" = l."id"
    LEFT JOIN "DynamicProduct" p ON p."id" = i."productId"
    LEFT JOIN "SiteUserMonitoredProduct" mp ON mp."id" = i."monitoredProductId"
    LEFT JOIN "DynamicCategory" c ON c."id" = p."categoryId"
    WHERE l."id" = ${id}
      AND l."userId" = ${user.id}
    ORDER BY i."sortOrder" ASC NULLS LAST, i."createdAt" DESC NULLS LAST
  `);

  if (rows.length === 0) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  const list = {
    id: rows[0]!.id,
    slug: rows[0]!.slug,
    title: rows[0]!.title,
    description: rows[0]!.description,
    isPublic: rows[0]!.isPublic,
    items: rows
      .filter((row) => row.itemId && row.productName && row.productUrl)
      .map((row) => ({
        id: row.itemId!,
        note: row.note,
        sortOrder: row.sortOrder ?? 0,
        product: {
          id: row.productId ?? row.monitoredProductId!,
          asin: row.productAsin!,
          name: row.productName!,
          imageUrl: row.productImageUrl,
          totalPrice: row.productTotalPrice ?? 0,
          averagePrice30d: row.productAveragePrice30d,
          url: row.productUrl!,
          availabilityStatus: row.productAvailabilityStatus,
          category: {
            name: row.categoryName ?? "Amazon",
            group: row.categoryGroup ?? "amazon",
            slug: row.categorySlug ?? "monitorado",
          },
        },
        source: row.productId ? "catalog" : "monitored",
      })),
  };

  return NextResponse.json({ ok: true, list });
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

  const { id } = await context.params;

  try {
    const body = (await request.json()) as {
      isPublic?: boolean;
      title?: string;
      description?: string | null;
    };

    const title = typeof body.title === "string" ? body.title.trim() : undefined;
    const description =
      typeof body.description === "string" ? body.description.trim() || null : undefined;

    const rows = await prisma.$queryRaw<
      Array<{
        id: string;
        slug: string;
        title: string;
        description: string | null;
        isPublic: boolean;
      }>
    >(Prisma.sql`
      UPDATE "SiteUserList"
      SET
        "isPublic" = COALESCE(${typeof body.isPublic === "boolean" ? body.isPublic : null}, "isPublic"),
        "title" = COALESCE(${title ?? null}, "title"),
        "description" = COALESCE(${description ?? null}, "description"),
        "updatedAt" = NOW()
      WHERE "id" = ${id}
        AND "userId" = ${user.id}
      RETURNING "id", "slug", "title", "description", "isPublic"
    `);

    if (!rows[0]) {
      return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, list: rows[0] });
  } catch (error) {
    console.error("list_update_failed", error);
    return NextResponse.json({ ok: false, error: "list_update_failed" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentSiteUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  if (!isSiteUserVerified(user)) {
    return verificationRequiredResponse();
  }

  const { id } = await context.params;

  try {
    const deletedRows = await prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      DELETE FROM "SiteUserList"
      WHERE "id" = ${id}
        AND "userId" = ${user.id}
      RETURNING "id"
    `);

    if (!deletedRows[0]) {
      return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("list_delete_failed", error);
    return NextResponse.json({ ok: false, error: "list_delete_failed" }, { status: 500 });
  }
}
