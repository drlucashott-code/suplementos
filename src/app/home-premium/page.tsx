import { Suspense } from "react";
import Header from "@/app/Header";
import { AmazonHeader } from "@/components/dynamic/AmazonHeader";
import HomePremiumClient, { type CategoryItem } from "./HomePremiumClient";
import { normalizeDynamicDisplayConfig } from "@/lib/dynamicCategoryMetrics";
import { prisma } from "@/lib/prisma";
import { getBestDeals } from "@/lib/bestDeals";

type DynamicCategoryWithImageReader = {
  findMany: (args: {
    where: { group: string };
    orderBy: { name: "asc" | "desc" };
    select: { name: true; slug: true; imageUrl: true; displayConfig: true };
  }) => Promise<
    Array<{
      name: string;
      slug: string;
      imageUrl?: string | null;
      displayConfig: unknown;
    }>
  >;
};

const supplementFallbacks: CategoryItem[] = [
  {
    title: "Barra de proteína",
    imageSrc: "https://m.media-amazon.com/images/I/61RDMRO3uCL._AC_SL1200_.jpg",
    path: "/suplementos/barra",
  },
  {
    title: "Bebida proteica",
    imageSrc: "https://m.media-amazon.com/images/I/51npzHic1NL._AC_SL1000_.jpg",
    path: "/suplementos/bebidaproteica",
  },
  {
    title: "Café funcional",
    imageSrc: "https://m.media-amazon.com/images/I/61hwrgvkjrL._AC_SL1210_.jpg",
    path: "/suplementos/cafe-funcional",
  },
  {
    title: "Creatina",
    imageSrc: "https://m.media-amazon.com/images/I/81UashXoAxL._AC_SL1500_.jpg",
    path: "/suplementos/creatina",
  },
  {
    title: "Pré-treino",
    imageSrc: "https://m.media-amazon.com/images/I/61fGbsRyDWL._AC_SL1333_.jpg",
    path: "/suplementos/pre-treino",
  },
  {
    title: "Whey Protein",
    imageSrc: "https://m.media-amazon.com/images/I/51lOuKbCawL._AC_SL1000_.jpg",
    path: "/suplementos/whey",
  },
];

const houseFallbacks: CategoryItem[] = [
  {
    title: "Amaciante",
    imageSrc: "https://m.media-amazon.com/images/I/61NJbm2a9tL._AC_SL1200_.jpg",
    path: "/casa/amaciante",
  },
  {
    title: "Creme dental",
    imageSrc: "https://m.media-amazon.com/images/I/618cxCZ8wHL._AC_SL1000_.jpg",
    path: "/casa/creme-dental",
  },
  {
    title: "Fralda",
    imageSrc: "https://m.media-amazon.com/images/I/71EGaknfKuL._AC_SL1500_.jpg",
    path: "/casa/fralda",
  },
  {
    title: "Papel higiênico",
    imageSrc: "https://m.media-amazon.com/images/I/71uftHmzxQL._AC_SL1500_.jpg",
    path: "/casa/papel-higienico",
  },
  {
    title: "Sabão para roupas",
    imageSrc: "https://m.media-amazon.com/images/I/71bXBFl912L._AC_SL1500_.jpg",
    path: "/casa/lava-roupa",
  },
  {
    title: "Sabão para louças",
    imageSrc: "https://m.media-amazon.com/images/I/71cHvPHeE7L._AC_SL1500_.jpg",
    path: "/casa/sabao-para-loucas",
  },
];

const petFallbacks: CategoryItem[] = [
  {
    title: "Areia higiênica",
    imageSrc: "https://m.media-amazon.com/images/I/71s11YxVgYL._AC_SL1500_.jpg",
    path: "/pets/areia-higienica",
  },
  {
    title: "Antipulgas",
    imageSrc: "https://m.media-amazon.com/images/I/61Cd0Wt2TxL._AC_SL1000_.jpg",
    path: "/pets/antipulgas",
  },
  {
    title: "Ração úmida",
    imageSrc: "https://m.media-amazon.com/images/I/71G7+8WQf0L._AC_SL1500_.jpg",
    path: "/pets/racao-umida",
  },
  {
    title: "Tapete higiênico",
    imageSrc: "https://m.media-amazon.com/images/I/61TLuQxY+UL._AC_SL1200_.jpg",
    path: "/pets/tapete-higienico",
  },
];

const houseFallbackMap = Object.fromEntries(
  [...houseFallbacks, ...petFallbacks].map((item) => [item.path.split("/").pop() ?? item.path, item])
);

export const revalidate = 600;

async function getCategoriesByGroup(group: string, fallbacks: CategoryItem[]): Promise<CategoryItem[]> {
  try {
    const dynamicCategoryReader =
      prisma.dynamicCategory as unknown as DynamicCategoryWithImageReader;

    const categories = await dynamicCategoryReader.findMany({
      where: { group },
      orderBy: { name: "asc" },
      select: {
        name: true,
        slug: true,
        imageUrl: true,
        displayConfig: true,
      },
    });

    const pathPrefix = `/${group}/`;

    const items = categories
      .filter((category) => {
        const settings =
          normalizeDynamicDisplayConfig(category.displayConfig).settings ?? {};
        return !settings.hideFromHome;
      })
      .map((category) => ({
        title: category.name,
        imageSrc:
          category.imageUrl ||
          houseFallbackMap[category.slug]?.imageSrc ||
          fallbacks[0]?.imageSrc ||
          "https://m.media-amazon.com/images/I/61NJbm2a9tL._AC_SL1200_.jpg",
        path: `${pathPrefix}${category.slug}`,
      }));

    return items.length > 0 ? items : fallbacks;
  } catch {
    return fallbacks;
  }
}

export default async function HomePremiumPage() {
  const [supplementCategories, houseCategories, petCategories, bestDeals, publicLists] =
    await Promise.all([
      getCategoriesByGroup("suplementos", supplementFallbacks),
      getCategoriesByGroup("casa", houseFallbacks),
      getCategoriesByGroup("pets", petFallbacks),
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

  const headerCategories = [
    ...supplementCategories,
    ...houseCategories,
    ...petCategories,
  ];

  const publicListsWithDates = publicLists.map((list) => ({
    ...list,
    createdAt: list.createdAt.toISOString(),
  }));

  return (
    <>
      <div className="lg:hidden">
        <Header extraCategories={headerCategories} />
      </div>
      <div className="hidden lg:block">
        <Suspense fallback={<div className="h-14 w-full bg-[#131921]" />}>
          <AmazonHeader />
        </Suspense>
      </div>
      <HomePremiumClient
        supplementCategories={supplementCategories}
        houseCategories={houseCategories}
        petCategories={petCategories}
        bestDeals={bestDeals}
        publicLists={publicListsWithDates}
      />
    </>
  );
}
