import { SiteHeader } from "@/components/SiteHeader";
import { getBestDeals } from "@/lib/bestDeals";
import { normalizeDynamicDisplayConfig } from "@/lib/dynamicCategoryMetrics";
import { prisma } from "@/lib/prisma";
import HomeV5Client, { type HomeV5Category } from "./HomeV5Client";

export const revalidate = 600;

const fallbackImages = {
  suplementos: "https://m.media-amazon.com/images/I/61RDMRO3uCL._AC_SL1200_.jpg",
  casa: "https://m.media-amazon.com/images/I/61NJbm2a9tL._AC_SL1200_.jpg",
  pets: "https://m.media-amazon.com/images/I/71s11YxVgYL._AC_SL1200_.jpg",
} as const;

async function getHomeV5Categories(): Promise<HomeV5Category[]> {
  const rows = await prisma.dynamicCategory.findMany({
    where: { group: { in: ["suplementos", "casa", "pets"] } },
    orderBy: [{ group: "asc" }, { name: "asc" }],
    select: { group: true, name: true, slug: true, imageUrl: true, displayConfig: true },
  });

  return rows
    .filter((category) => !normalizeDynamicDisplayConfig(category.displayConfig).settings?.hideFromHome)
    .map((category) => ({
      title: category.name,
      imageSrc: category.imageUrl || fallbackImages[category.group as keyof typeof fallbackImages],
      path: `/${category.group}/${category.slug}`,
      group: category.group as HomeV5Category["group"],
    }));
}

export default async function HomeV5Page() {
  const [categories, bestDeals] = await Promise.all([getHomeV5Categories(), getBestDeals(36)]);

  return (
    <>
      <SiteHeader extraCategories={categories.map(({ title, imageSrc, path }) => ({ title, imageSrc, path }))} />
      <HomeV5Client categories={categories} bestDeals={bestDeals} />
    </>
  );
}
