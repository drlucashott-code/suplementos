import Header from "@/app/Header";
import { Prisma } from "@prisma/client";
import SiteAccountWorkspace from "@/components/SiteAccountWorkspace";
import { prisma } from "@/lib/prisma";
import { requireCurrentSiteUser } from "@/lib/siteAuth";

export default async function MyAccountPage() {
  const user = await requireCurrentSiteUser();

  const [favorites, lists] = await Promise.all([
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
  ]);

  return (
    <main className="min-h-screen bg-[#E3E6E6] pb-10">
      <Header />

      <div className="mx-auto max-w-[1280px] px-4 py-8">
        <section className="mb-6 rounded-3xl border border-[#d5d9d9] bg-white p-6 shadow-sm">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-[#CC0C39]">
            Minha conta
          </p>
          <h1 className="mt-3 text-3xl font-black text-[#0F1111]">{user.displayName}</h1>
          <p className="mt-2 text-sm text-[#565959]">
            Seu espaço para favoritos, comentários, listas e futuras notificações de preço.
          </p>
        </section>

        <SiteAccountWorkspace
          currentUser={user}
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
        />
      </div>
    </main>
  );
}
