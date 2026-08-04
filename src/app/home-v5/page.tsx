import { SiteHeader } from "@/components/SiteHeader";
import HomeV5Client, { type CategoryItem } from "./HomeV5Client";
import { normalizeDynamicDisplayConfig } from "@/lib/dynamicCategoryMetrics";
import { getBestDeals } from "@/lib/bestDeals";
import { prisma } from "@/lib/prisma";

export const revalidate = 600;

const fallbacks: Record<"suplementos" | "casa" | "pets", CategoryItem[]> = {
  suplementos: [
    { title: "Whey Protein", imageSrc: "https://m.media-amazon.com/images/I/51lOuKbCawL._AC_SL1000_.jpg", path: "/suplementos/whey" },
    { title: "Creatina", imageSrc: "https://m.media-amazon.com/images/I/81UashXoAxL._AC_SL1500_.jpg", path: "/suplementos/creatina" },
  ],
  casa: [
    { title: "Amaciante", imageSrc: "https://m.media-amazon.com/images/I/61NJbm2a9tL._AC_SL1200_.jpg", path: "/casa/amaciante" },
    { title: "Papel higiênico", imageSrc: "https://m.media-amazon.com/images/I/71uftHmzxQL._AC_SL1500_.jpg", path: "/casa/papel-higienico" },
  ],
  pets: [
    { title: "Areia higiênica", imageSrc: "https://m.media-amazon.com/images/I/71s11YxVgYL._AC_SL1500_.jpg", path: "/pets/areia-higienica" },
    { title: "Ração úmida", imageSrc: "https://m.media-amazon.com/images/I/71G7+8WQf0L._AC_SL1500_.jpg", path: "/pets/racao-umida" },
  ],
};

async function getCategories() {
  const rows = await prisma.dynamicCategory.findMany({
    where: { group: { in: ["suplementos", "casa", "pets"] } },
    orderBy: [{ group: "asc" }, { name: "asc" }],
    select: { group: true, name: true, slug: true, imageUrl: true, displayConfig: true },
  });

  const mapped = rows
    .filter((row) => !normalizeDynamicDisplayConfig(row.displayConfig).settings?.hideFromHome)
    .map((row) => ({
      group: row.group as "suplementos" | "casa" | "pets",
      item: {
        title: row.name,
        imageSrc: row.imageUrl || fallbacks[row.group as "suplementos" | "casa" | "pets"][0].imageSrc,
        path: `/${row.group}/${row.slug}`,
      },
    }));

  const groups = (Object.keys(fallbacks) as Array<keyof typeof fallbacks>).map((group) => {
    const items = mapped.filter((row) => row.group === group).map((row) => row.item);
    return [group, items.length > 0 ? items : fallbacks[group]] as const;
  });

  return Object.fromEntries(groups) as Record<keyof typeof fallbacks, CategoryItem[]>;
}

export default async function HomeV5Page() {
  const [categories, bestDeals, publicLists] = await Promise.all([
    getCategories(),
    getBestDeals(24),
    prisma.$queryRaw<
      Array<{
        slug: string;
        title: string;
        ownerDisplayName: string;
        ownerUsername: string | null;
        itemsCount: number;
        previewImages: string[] | null;
        createdAt: Date;
      }>
    >`
      SELECT
        l."slug",
        l."title",
        u."displayName" AS "ownerDisplayName",
        u."username" AS "ownerUsername",
        COUNT(i."id")::int AS "itemsCount",
        l."createdAt",
        ARRAY(
          SELECT COALESCE(p2."imageUrl", mp2."imageUrl", tp2."imageUrl", c2."imageUrl")
          FROM "SiteUserListItem" i2
          LEFT JOIN "DynamicProduct" p2 ON p2."id" = i2."productId"
          LEFT JOIN "SiteUserMonitoredProduct" mp2 ON mp2."id" = i2."monitoredProductId"
          LEFT JOIN "SiteTrackedAmazonProduct" tp2 ON tp2."id" = i2."trackedAmazonProductId"
          LEFT JOIN "DynamicCategory" c2 ON c2."id" = p2."categoryId"
          WHERE i2."listId" = l."id"
            AND COALESCE(p2."imageUrl", mp2."imageUrl", tp2."imageUrl", c2."imageUrl") IS NOT NULL
          ORDER BY i2."sortOrder" ASC, i2."createdAt" DESC
          LIMIT 3
        ) AS "previewImages"
      FROM "SiteUserList" l
      INNER JOIN "SiteUser" u ON u."id" = l."userId"
      LEFT JOIN "SiteUserListItem" i ON i."listId" = l."id"
      WHERE l."isPublic" = true
      GROUP BY l."id", u."displayName", u."username"
      ORDER BY l."createdAt" DESC
      LIMIT 4
    `,
  ]);

  const headerCategories = Object.values(categories).flat();

  return (
    <>
      <SiteHeader extraCategories={headerCategories} />
      <HomeV5Client
        supplementCategories={categories.suplementos}
        houseCategories={categories.casa}
        petCategories={categories.pets}
        bestDeals={bestDeals}
        publicLists={publicLists.map((list) => ({ ...list, createdAt: list.createdAt.toISOString() }))}
      />
    </>
  );
}
