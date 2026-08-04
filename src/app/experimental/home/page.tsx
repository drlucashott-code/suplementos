import type { Metadata } from "next";
import { Suspense } from "react";
import HeaderClient from "@/components/HeaderClient";
import { AmazonHeader } from "@/components/dynamic/AmazonHeader";
import { ExperimentalHome } from "@/components/experimental-home/ExperimentalHome";
import type {
  ExperimentalCategory,
  ExperimentalPublicList,
  HomeHub,
} from "@/components/experimental-home/types";
import { getBestDeals, type BestDeal } from "@/lib/bestDeals";
import { normalizeDynamicDisplayConfig } from "@/lib/dynamicCategoryMetrics";
import { prisma } from "@/lib/prisma";

export const revalidate = 600;

export const metadata: Metadata = {
  title: "Homepage experimental | AmazonPicks",
  description: "Experiência experimental de descoberta de ofertas, comparadores e listas.",
  robots: { index: false, follow: false },
};

const fallbackCategories: Record<HomeHub, ExperimentalCategory[]> = {
  suplementos: [
    { title: "Creatina", imageSrc: "https://m.media-amazon.com/images/I/81UashXoAxL._AC_SL1500_.jpg", path: "/suplementos/creatina", group: "suplementos" },
    { title: "Whey Protein", imageSrc: "https://m.media-amazon.com/images/I/51lOuKbCawL._AC_SL1000_.jpg", path: "/suplementos/whey", group: "suplementos" },
    { title: "Barra de proteína", imageSrc: "https://m.media-amazon.com/images/I/61RDMRO3uCL._AC_SL1200_.jpg", path: "/suplementos/barra", group: "suplementos" },
    { title: "Pré-treino", imageSrc: "https://m.media-amazon.com/images/I/61fGbsRyDWL._AC_SL1333_.jpg", path: "/suplementos/pre-treino", group: "suplementos" },
  ],
  casa: [
    { title: "Amaciante", imageSrc: "https://m.media-amazon.com/images/I/61NJbm2a9tL._AC_SL1200_.jpg", path: "/casa/amaciante", group: "casa" },
    { title: "Papel higiênico", imageSrc: "https://m.media-amazon.com/images/I/71uftHmzxQL._AC_SL1500_.jpg", path: "/casa/papel-higienico", group: "casa" },
    { title: "Lava-roupas", imageSrc: "https://m.media-amazon.com/images/I/71bXBFl912L._AC_SL1500_.jpg", path: "/casa/lava-roupa", group: "casa" },
  ],
  pets: [
    { title: "Areia higiênica", imageSrc: "https://m.media-amazon.com/images/I/71s11YxVgYL._AC_SL1500_.jpg", path: "/pets/areia-higienica", group: "pets" },
    { title: "Antipulgas", imageSrc: "https://m.media-amazon.com/images/I/61Cd0Wt2TxL._AC_SL1000_.jpg", path: "/pets/antipulgas", group: "pets" },
    { title: "Ração úmida", imageSrc: "https://m.media-amazon.com/images/I/71G7+8WQf0L._AC_SL1500_.jpg", path: "/pets/racao-umida", group: "pets" },
  ],
};

async function loadCategories(): Promise<Record<HomeHub, ExperimentalCategory[]>> {
  try {
    const rows = await prisma.dynamicCategory.findMany({
      where: { group: { in: ["suplementos", "casa", "pets"] } },
      orderBy: [{ group: "asc" }, { name: "asc" }],
      select: { group: true, name: true, slug: true, imageUrl: true, displayConfig: true },
    });

    const result: Record<HomeHub, ExperimentalCategory[]> = {
      suplementos: [],
      casa: [],
      pets: [],
    };

    for (const row of rows) {
      if (!(row.group in result)) continue;
      if (normalizeDynamicDisplayConfig(row.displayConfig).settings?.hideFromHome) continue;
      const group = row.group as HomeHub;
      result[group].push({
        title: row.name,
        imageSrc: row.imageUrl || fallbackCategories[group][0].imageSrc,
        path: `/${group}/${row.slug}`,
        group,
      });
    }

    for (const group of Object.keys(result) as HomeHub[]) {
      if (result[group].length === 0) result[group] = fallbackCategories[group];
    }
    return result;
  } catch {
    return fallbackCategories;
  }
}

async function loadDeals(): Promise<BestDeal[]> {
  try {
    return await getBestDeals(18);
  } catch {
    return [];
  }
}

async function loadPublicLists(): Promise<ExperimentalPublicList[]> {
  try {
    const rows = await prisma.$queryRaw<
      Array<{
        slug: string;
        title: string;
        description: string | null;
        ownerDisplayName: string;
        ownerUsername: string | null;
        itemsCount: number;
        savedCount: number;
        commentsCount: number;
        previewImages: string[] | null;
        updatedAt: Date;
      }>
    >`
      SELECT
        l."slug",
        l."title",
        l."description",
        u."displayName" AS "ownerDisplayName",
        u."username" AS "ownerUsername",
        (SELECT COUNT(*)::int FROM "SiteUserListItem" i WHERE i."listId" = l."id") AS "itemsCount",
        (SELECT COUNT(*)::int FROM "SiteUserSavedList" s WHERE s."listId" = l."id") AS "savedCount",
        (SELECT COUNT(*)::int FROM "SiteUserListComment" c WHERE c."listId" = l."id" AND c."status" = 'published') AS "commentsCount",
        ARRAY(
          SELECT COALESCE(p."imageUrl", mp."imageUrl", tp."imageUrl", dc."imageUrl")
          FROM "SiteUserListItem" li
          LEFT JOIN "DynamicProduct" p ON p."id" = li."productId"
          LEFT JOIN "SiteUserMonitoredProduct" mp ON mp."id" = li."monitoredProductId"
          LEFT JOIN "SiteTrackedAmazonProduct" tp ON tp."id" = li."trackedAmazonProductId"
          LEFT JOIN "DynamicCategory" dc ON dc."id" = p."categoryId"
          WHERE li."listId" = l."id"
            AND COALESCE(p."imageUrl", mp."imageUrl", tp."imageUrl", dc."imageUrl") IS NOT NULL
          ORDER BY li."sortOrder" ASC, li."createdAt" DESC
          LIMIT 3
        ) AS "previewImages",
        l."updatedAt"
      FROM "SiteUserList" l
      INNER JOIN "SiteUser" u ON u."id" = l."userId"
      WHERE l."isPublic" = true
      ORDER BY "savedCount" DESC, l."updatedAt" DESC
      LIMIT 8
    `;

    return rows.map((row) => ({
      ...row,
      previewImages: row.previewImages || [],
      updatedAt: row.updatedAt.toISOString(),
    }));
  } catch {
    return [];
  }
}

export default async function ExperimentalHomePage() {
  const [categories, bestDeals, publicLists] = await Promise.all([
    loadCategories(),
    loadDeals(),
    loadPublicLists(),
  ]);
  const headerCategories = Object.values(categories).flat();

  return (
    <>
      <div className="lg:hidden">
        <HeaderClient extraCategories={headerCategories} />
      </div>
      <div className="hidden lg:block">
        <Suspense fallback={<div className="h-14 bg-[#131921]" />}>
          <AmazonHeader extraCategories={headerCategories} />
        </Suspense>
      </div>
      <ExperimentalHome categories={categories} bestDeals={bestDeals} publicLists={publicLists} />
    </>
  );
}
