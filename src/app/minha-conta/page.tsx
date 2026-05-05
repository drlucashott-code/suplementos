import Header from "@/app/Header";
import { Prisma } from "@prisma/client";
import SiteAccountWorkspace from "@/components/SiteAccountWorkspace";
import { prisma } from "@/lib/prisma";
import { isMissingRelationError } from "@/lib/prismaSchemaCompat";
import { requireCurrentSiteUser } from "@/lib/siteAuth";
import { findDefaultList } from "@/lib/siteDefaultList";

export default async function MyAccountPage() {
  const user = await requireCurrentSiteUser();
  const defaultList = await findDefaultList(user.id);

  const savedListsPromise = prisma
    .$queryRaw<
      Array<{
        id: string;
        slug: string;
        title: string;
        description: string | null;
        isPublic: boolean;
        isDefault: boolean;
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
        l."isDefault",
        owner."displayName" AS "ownerDisplayName",
        owner."username" AS "ownerUsername",
        COUNT(i."id")::int AS "itemsCount",
        MAX(s."createdAt") AS "savedAt"
      FROM "SiteUserSavedList" s
      INNER JOIN "SiteUserList" l ON l."id" = s."listId"
      INNER JOIN "SiteUser" owner ON owner."id" = l."userId"
      LEFT JOIN "SiteUserListItem" i ON i."listId" = l."id"
      WHERE s."userId" = ${user.id}
      GROUP BY l."id", owner."displayName", owner."username"
      ORDER BY "savedAt" DESC
    `)
    .catch((error) => {
      if (isMissingRelationError(error, "SiteUserSavedList")) {
        return [];
      }

      throw error;
    });

  const [favorites, lists, savedLists, monitoredProducts, profileStats] = await Promise.all([
    prisma.$queryRaw<
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
      WHERE f."listId" = ${defaultList?.id ?? null}
        AND f."productId" IS NOT NULL
      ORDER BY f."sortOrder" ASC, f."createdAt" DESC
    `),
    prisma.$queryRaw<
      Array<{
        id: string;
        slug: string;
        title: string;
        description: string | null;
        isPublic: boolean;
        isDefault: boolean;
        itemsCount: number;
      }>
    >(Prisma.sql`
      SELECT
        l."id",
        l."slug",
        l."title",
        l."description",
        l."isPublic",
        l."isDefault",
        COUNT(i."id")::int AS "itemsCount"
      FROM "SiteUserList" l
      LEFT JOIN "SiteUserListItem" i ON i."listId" = l."id"
      WHERE l."userId" = ${user.id}
      GROUP BY l."id"
      ORDER BY l."updatedAt" DESC
    `),
    savedListsPromise,
    prisma.$queryRaw<
      Array<{
        id: string;
        trackedProductId: string | null;
        asin: string;
        amazonUrl: string;
        name: string;
        imageUrl: string | null;
        totalPrice: number;
        averagePrice30d: number | null;
        ratingAverage: number | null;
        ratingCount: number | null;
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
        tp."ratingAverage" AS "ratingAverage",
        tp."ratingCount" AS "ratingCount",
        COALESCE(tp."availabilityStatus", mp."availabilityStatus") AS "availabilityStatus",
        COALESCE(tp."programAndSavePrice", mp."programAndSavePrice") AS "programAndSavePrice",
        mp."sortOrder",
        mp."createdAt"
      FROM "SiteUserMonitoredProduct" mp
      LEFT JOIN "SiteTrackedAmazonProduct" tp ON tp."id" = mp."trackedProductId"
      WHERE mp."userId" = ${user.id}
      ORDER BY mp."sortOrder" ASC, mp."createdAt" DESC
    `)
      .catch((error) => {
        if (isMissingRelationError(error, "SiteUserMonitoredProduct")) {
          return [];
        }

        throw error;
      }),
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
            sortOrder: favorite.sortOrder,
            product: {
              ...favorite.product,
              ratingAverage: favorite.product.ratingAverage ?? null,
              ratingCount: favorite.product.ratingCount ?? null,
            },
          }))}
          lists={lists.map((list: (typeof lists)[number]) => ({
          id: list.id,
          slug: list.slug,
          title: list.title,
          description: list.description,
          isPublic: list.isPublic,
          isDefault: list.isDefault,
          itemsCount: list.itemsCount,
        }))}
          savedLists={savedLists.map((list: (typeof savedLists)[number]) => ({
            id: list.id,
            slug: list.slug,
            title: list.title,
            description: list.description,
            isPublic: list.isPublic,
            isDefault: list.isDefault,
            itemsCount: list.itemsCount,
            ownerDisplayName: list.ownerDisplayName,
            ownerUsername: list.ownerUsername,
          }))}
          monitoredProducts={monitoredProducts.map((product) => ({
            id: product.id,
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
              ratingAverage: product.ratingAverage,
              ratingCount: product.ratingCount,
              availabilityStatus: product.availabilityStatus,
              programAndSavePrice: product.programAndSavePrice,
              category: {
                name: "Amazon",
                group: "amazon",
                slug: "monitorado",
              },
            },
          }))}
        />
      </div>
    </main>
  );
}
