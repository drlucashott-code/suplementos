import HomePageClient, { type CategoryItem } from "./HomePageClient";
import { prisma } from "@/lib/prisma";

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

    return categories.map((category: { name: string; slug: string; imageUrl?: string | null }) => ({
      title: category.name,
      imageSrc:
        category.imageUrl ||
        houseCategoryFallbackMap[category.slug]?.imageSrc ||
        "https://m.media-amazon.com/images/I/61NJbm2a9tL._AC_SL1200_.jpg",
      path: `/casa/${category.slug}`,
    }));
  } catch {
    return houseCategoryFallbacks;
  }
}

export default async function HomePage() {
  const houseCategories = await getHouseCategories();

  return <HomePageClient houseCategories={houseCategories} />;
}
