import { Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { createUniqueListSlug } from "@/lib/siteSocial";

const DEFAULT_LIST_TITLE = "Minha lista";

export type DefaultListSummary = {
  id: string;
  slug: string;
  title: string;
  isDefault: boolean;
};

export async function findDefaultList(userId: string) {
  const existing = await prisma.$queryRaw<Array<DefaultListSummary>>(Prisma.sql`
    SELECT "id", "slug", "title", "isDefault"
    FROM "SiteUserList"
    WHERE "userId" = ${userId}
      AND "isDefault" = TRUE
    LIMIT 1
  `);

  return existing[0] ?? null;
}

export async function ensureDefaultList(userId: string) {
  const existing = await findDefaultList(userId);

  if (existing) {
    return existing;
  }

  const slug = await createUniqueListSlug(userId, DEFAULT_LIST_TITLE);
  const created = await prisma.$queryRaw<Array<DefaultListSummary>>(Prisma.sql`
    INSERT INTO "SiteUserList" (
      "id",
      "userId",
      "slug",
      "title",
      "description",
      "isPublic",
      "isDefault",
      "createdAt",
      "updatedAt"
    )
    VALUES (
      ${randomUUID()}::text,
      ${userId}::text,
      ${slug}::text,
      ${DEFAULT_LIST_TITLE}::text,
      NULL,
      FALSE,
      TRUE,
      NOW(),
      NOW()
    )
    RETURNING "id", "slug", "title", "isDefault"
  `);

  return created[0]!;
}

export async function migrateLegacyFavoritesToDefaultList(userId: string) {
  const defaultList = await ensureDefaultList(userId);

  const legacyFavorites = await prisma.$queryRaw<
    Array<{
      id: string;
      productId: string;
      sortOrder: number;
    }>
  >(Prisma.sql`
    SELECT "id", "productId", "sortOrder"
    FROM "SiteUserFavorite"
    WHERE "userId" = ${userId}
    ORDER BY "sortOrder" ASC, "createdAt" ASC
  `);

  if (legacyFavorites.length === 0) {
    return defaultList;
  }

  const maxSortOrderRows = await prisma.$queryRaw<Array<{ maxSortOrder: number | null }>>(Prisma.sql`
    SELECT MAX("sortOrder")::int AS "maxSortOrder"
    FROM "SiteUserListItem"
    WHERE "listId" = ${defaultList.id}
  `);

  let nextSortOrder = (maxSortOrderRows[0]?.maxSortOrder ?? -1) + 1;
  for (const favorite of legacyFavorites) {
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
        ${randomUUID()}::text,
        ${defaultList.id}::text,
        ${favorite.productId}::text,
        NULL,
        NULL,
        NULL,
        ${nextSortOrder}::int,
        NOW(),
        NOW()
      )
      ON CONFLICT ("listId", "productId") DO NOTHING
    `);
    nextSortOrder += 1;
  }

  await prisma.$executeRaw(Prisma.sql`
    DELETE FROM "SiteUserFavorite"
    WHERE "userId" = ${userId}
  `);

  return defaultList;
}
