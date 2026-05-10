import Header from "@/app/Header";
import AccountProfileOverview from "@/components/account/AccountProfileOverview";
import { prisma } from "@/lib/prisma";
import { requireCurrentSiteUser } from "@/lib/siteAuth";
import { getSiteNotifications, syncFavoriteNotifications } from "@/lib/siteNotifications";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function MyAccountPage() {
  const user = await requireCurrentSiteUser();
  await syncFavoriteNotifications(user.id);

  const [profileRows, countsRows, recentLists, notifications, recentComments] = await Promise.all([
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
    prisma.$queryRaw<Array<{ listsCount: number; publicListsCount: number }>>(Prisma.sql`
      SELECT
        COUNT(*)::int AS "listsCount",
        COUNT(*) FILTER (WHERE "isPublic")::int AS "publicListsCount"
      FROM "SiteUserList"
      WHERE "userId" = ${user.id}
    `),
    prisma.$queryRaw<
      Array<{
        id: string;
        slug: string;
        title: string;
        description: string | null;
        isPublic: boolean;
        itemsCount: number;
        updatedAt: Date;
      }>
    >(Prisma.sql`
      SELECT
        l."id",
        l."slug",
        l."title",
        l."description",
        l."isPublic",
        l."updatedAt",
        COUNT(i."id")::int AS "itemsCount"
      FROM "SiteUserList" l
      LEFT JOIN "SiteUserListItem" i ON i."listId" = l."id"
      WHERE l."userId" = ${user.id}
      GROUP BY l."id"
      ORDER BY l."updatedAt" DESC
      LIMIT 6
    `),
    getSiteNotifications(user.id, 8),
    prisma.$queryRaw<
      Array<{
        id: string;
        body: string;
        createdAt: Date;
        productId: string;
        productName: string;
      }>
    >(Prisma.sql`
      SELECT
        c."id",
        c."body",
        c."createdAt",
        p."id" AS "productId",
        p."name" AS "productName"
      FROM "SiteProductComment" c
      INNER JOIN "DynamicProduct" p ON p."id" = c."productId"
      WHERE c."userId" = ${user.id}
        AND c."status" = 'published'
      ORDER BY c."createdAt" DESC
      LIMIT 6
    `),
  ]);

  const stats = profileRows[0] ?? {
    createdAt: new Date(),
    commentsCount: 0,
    commentReactionsCount: 0,
  };
  const summary = countsRows[0] ?? { listsCount: 0, publicListsCount: 0 };
  const recentNotifications = notifications.slice(0, 4);

  return (
    <main className="min-h-screen bg-[#E3E6E6] pb-10">
      <Header />

      <div className="mx-auto max-w-[1280px] px-4 py-8">
        <AccountProfileOverview
          user={user}
          profileStats={{
            memberSince: stats.createdAt.toISOString(),
            commentsCount: stats.commentsCount,
            commentReactionsCount: stats.commentReactionsCount,
            listsCount: summary.listsCount,
            publicListsCount: summary.publicListsCount,
          }}
          recentNotifications={recentNotifications}
          recentLists={recentLists.map((list) => ({
            id: list.id,
            slug: list.slug,
            title: list.title,
            description: list.description,
            isPublic: list.isPublic,
            itemsCount: list.itemsCount,
            updatedAt: list.updatedAt.toISOString(),
          }))}
          recentComments={recentComments.map((comment) => ({
            id: comment.id,
            body: comment.body,
            createdAt: comment.createdAt.toISOString(),
            productId: comment.productId,
            productName: comment.productName,
          }))}
        />
      </div>
    </main>
  );
}
