import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  getCurrentSiteUser,
  isSiteUserVerified,
  verificationRequiredResponse,
} from "@/lib/siteAuth";

export async function GET() {
  const user = await getCurrentSiteUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  if (!isSiteUserVerified(user)) {
    return verificationRequiredResponse();
  }

  const favorites = await prisma.$queryRaw<
    Array<{
      id: string;
      createdAt: Date;
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
    FROM "SiteUserFavorite" f
    INNER JOIN "DynamicProduct" p ON p."id" = f."productId"
    INNER JOIN "DynamicCategory" c ON c."id" = p."categoryId"
    WHERE f."userId" = ${user.id}
    ORDER BY f."createdAt" DESC
  `);

  return NextResponse.json({
    ok: true,
    favorites: favorites.map((favorite) => ({
      id: favorite.id,
      savedAt: favorite.createdAt,
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
    const body = (await request.json()) as { productId?: string; note?: string };
    const productId = body.productId?.trim() ?? "";

    if (!productId) {
      return NextResponse.json({ ok: false, error: "invalid_product" }, { status: 400 });
    }

    await prisma.$executeRaw(Prisma.sql`
      INSERT INTO "SiteUserFavorite" (
        "id",
        "userId",
        "productId",
        "note",
        "createdAt",
        "updatedAt"
      )
      VALUES (
        ${randomUUID()},
        ${user.id},
        ${productId},
        ${body.note?.trim() || null},
        NOW(),
        NOW()
      )
      ON CONFLICT ("userId", "productId")
      DO UPDATE SET
        "note" = EXCLUDED."note",
        "updatedAt" = NOW()
    `);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("favorite_create_failed", error);
    return NextResponse.json({ ok: false, error: "favorite_create_failed" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const user = await getCurrentSiteUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as { productId?: string };
    const productId = body.productId?.trim() ?? "";

    if (!productId) {
      return NextResponse.json({ ok: false, error: "invalid_product" }, { status: 400 });
    }

    await prisma.$executeRaw(Prisma.sql`
      DELETE FROM "SiteUserFavorite"
      WHERE "userId" = ${user.id}
        AND "productId" = ${productId}
    `);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("favorite_delete_failed", error);
    return NextResponse.json({ ok: false, error: "favorite_delete_failed" }, { status: 500 });
  }
}
