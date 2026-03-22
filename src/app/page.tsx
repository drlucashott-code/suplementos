import HomePageClient, { type CategoryItem, type FeaturedDeal } from "./HomePageClient";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

type DynamicCategoryWithImageReader = {
  findMany: (args: {
    where: { group: string };
    orderBy: { name: "asc" | "desc" };
    select: { name: true; slug: true; imageUrl: true };
  }) => Promise<Array<{ name: string; slug: string; imageUrl?: string | null }>>;
};

const houseCategoryFallbacks: CategoryItem[] = [
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
    title: "Papel higienico",
    imageSrc: "https://m.media-amazon.com/images/I/71uftHmzxQL._AC_SL1500_.jpg",
    path: "/casa/papel-higienico",
  },
  {
    title: "Sabao para roupas",
    imageSrc: "https://m.media-amazon.com/images/I/71bXBFl912L._AC_SL1500_.jpg",
    path: "/casa/lava-roupa",
  },
  {
    title: "Sabao para loucas",
    imageSrc: "https://m.media-amazon.com/images/I/71cHvPHeE7L._AC_SL1500_.jpg",
    path: "/casa/sabao-para-loucas",
  },
  {
    title: "Saco de lixo",
    imageSrc: "https://m.media-amazon.com/images/I/51QDIzZJCgL._AC_SL1000_.jpg",
    path: "/casa/saco-de-lixo",
  },
];

const houseCategoryFallbackMap = Object.fromEntries(
  houseCategoryFallbacks.map((item) => [item.path.replace("/casa/", ""), item])
);

export const revalidate = 600;

async function getHouseCategories(): Promise<CategoryItem[]> {
  try {
    const dynamicCategoryReader =
      prisma.dynamicCategory as unknown as DynamicCategoryWithImageReader;

    const categories = await dynamicCategoryReader.findMany({
      where: { group: "casa" },
      orderBy: { name: "asc" },
      select: {
        name: true,
        slug: true,
        imageUrl: true,
      },
    });

    return categories.map(
      (category: { name: string; slug: string; imageUrl?: string | null }) => ({
        title: category.name,
        imageSrc:
          category.imageUrl ||
          houseCategoryFallbackMap[category.slug]?.imageSrc ||
          "https://m.media-amazon.com/images/I/61NJbm2a9tL._AC_SL1200_.jpg",
        path: `/casa/${category.slug}`,
      })
    );
  } catch {
    return houseCategoryFallbacks;
  }
}

async function getFeaturedDeals(group: string): Promise<FeaturedDeal[]> {
  const rows = await prisma.$queryRaw<
    Array<{
      id: string;
      name: string;
      imageUrl: string | null;
      url: string;
      totalPrice: number;
      averagePrice30d: number;
      discountPercent: number;
      categoryName: string;
    }>
  >(Prisma.sql`
    SELECT
      p."id",
      p."name",
      p."imageUrl",
      p."url",
      p."totalPrice",
      p."averagePrice30d",
      ROUND((((p."averagePrice30d" - p."totalPrice") / p."averagePrice30d") * 100))::int AS "discountPercent",
      c."name" AS "categoryName"
    FROM "DynamicProduct" p
    INNER JOIN "DynamicCategory" c ON c."id" = p."categoryId"
    WHERE c."group" = ${group}
      AND p."totalPrice" > 0
      AND p."averagePrice30d" IS NOT NULL
      AND p."averagePrice30d" > p."totalPrice"
      AND (((p."averagePrice30d" - p."totalPrice") / p."averagePrice30d") * 100) >= 5
    ORDER BY (((p."averagePrice30d" - p."totalPrice") / p."averagePrice30d") * 100) DESC,
             p."averagePrice30d" DESC
    LIMIT 4
  `);

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    imageUrl:
      row.imageUrl || "https://m.media-amazon.com/images/I/61NJbm2a9tL._AC_SL1200_.jpg",
    url: row.url,
    totalPrice: row.totalPrice,
    averagePrice30d: row.averagePrice30d,
    discountPercent: row.discountPercent,
    categoryName: row.categoryName,
  }));
}

export default async function HomePage() {
  const [houseCategories, supplementsDeals, houseDeals] = await Promise.all([
    getHouseCategories(),
    getFeaturedDeals("suplementos"),
    getFeaturedDeals("casa"),
  ]);

  return (
    <HomePageClient
      houseCategories={houseCategories}
      supplementsDeals={supplementsDeals}
      houseDeals={houseDeals}
    />
  );
}
