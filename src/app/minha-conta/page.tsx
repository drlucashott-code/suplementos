import Header from "@/app/Header";
import { Prisma } from "@prisma/client";
import SiteAccountWorkspace from "@/components/SiteAccountWorkspace";
import { prisma } from "@/lib/prisma";
import { requireCurrentSiteUser } from "@/lib/siteAuth";

export default async function MyAccountPage() {
  const user = await requireCurrentSiteUser();

  const [favorites, lists, savedLists, profileStats] = await Promise.all([
    prisma.$queryRaw<
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
    `),
    prisma.$queryRaw<
      Array<{
        id: string;
        slug: string;
        title: string;
        description: string | null;
        isPublic: boolean;
        itemsCount: number;
      }>
    >(Prisma.sql`
      SELECT
        l."id",
        l."slug",
        l."title",
        l."description",
        l."isPublic",
        COUNT(i."id")::int AS "itemsCount"
      FROM "SiteUserList" l
      LEFT JOIN "SiteUserListItem" i ON i."listId" = l."id"
      WHERE l."userId" = ${user.id}
      GROUP BY l."id"
      ORDER BY l."updatedAt" DESC
    `),
    prisma.$queryRaw<
      Array<{
        id: string;
        slug: string;
        title: string;
        description: string | null;
        isPublic: boolean;
        ownerDisplayName: string;
        ownerUsername: string | null;
        itemsCount: number;
      }>
    >(Prisma.sql`
      SELECT
        l."id",
        l."slug",
        l."title",
        l."description",
        l."isPublic",
        owner."displayName" AS "ownerDisplayName",
        owner."username" AS "ownerUsername",
        COUNT(i."id")::int AS "itemsCount"
      FROM "SiteUserSavedList" s
      INNER JOIN "SiteUserList" l ON l."id" = s."listId"
      INNER JOIN "SiteUser" owner ON owner."id" = l."userId"
      LEFT JOIN "SiteUserListItem" i ON i."listId" = l."id"
      WHERE s."userId" = ${user.id}
      GROUP BY l."id", owner."displayName", owner."username"
      ORDER BY s."createdAt" DESC
    `),
    prisma.$queryRaw<
      Array<{
        createdAt: Date;
        commentsCount: number;
        commentReactionsCount: number;
      }>
    >(Prisma.sql`
      SELECT
        u."createdAt",
        (
          SELECT COUNT(*)::int
          FROM "SiteProductComment" c
          WHERE c."userId" = u."id"
            AND c."status" = 'published'
        ) AS "commentsCount",
        (
          SELECT COUNT(*)::int
          FROM "SiteProductCommentReaction" r
          INNER JOIN "SiteProductComment" c ON c."id" = r."commentId"
          WHERE c."userId" = u."id"
            AND c."status" = 'published'
        ) AS "commentReactionsCount"
      FROM "SiteUser" u
      WHERE u."id" = ${user.id}
      LIMIT 1
    `),
  ]);

  const stats = profileStats[0];

  return (
    <main className="min-h-screen bg-[#E3E6E6] pb-10">
      <Header />

      <div className="mx-auto max-w-[1280px] px-4 py-8">
        <SiteAccountWorkspace
          currentUser={user}
          profileStats={{
            memberSince: stats?.createdAt.toISOString() ?? new Date().toISOString(),
            commentsCount: stats?.commentsCount ?? 0,
            commentReactionsCount: stats?.commentReactionsCount ?? 0,
          }}
          favorites={favorites.map((favorite: (typeof favorites)[number]) => ({
            id: favorite.id,
            savedAt: favorite.createdAt.toISOString(),
            product: favorite.product,
          }))}
          lists={lists.map((list: (typeof lists)[number]) => ({
            id: list.id,
            slug: list.slug,
            title: list.title,
            description: list.description,
            isPublic: list.isPublic,
            itemsCount: list.itemsCount,
          }))}
          savedLists={savedLists.map((list: (typeof savedLists)[number]) => ({
            id: list.id,
            slug: list.slug,
            title: list.title,
            description: list.description,
            isPublic: list.isPublic,
            itemsCount: list.itemsCount,
            ownerDisplayName: list.ownerDisplayName,
            ownerUsername: list.ownerUsername,
          }))}
        />
      </div>
    </main>
  );
}
