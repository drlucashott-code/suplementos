import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { touchDynamicProductPriority } from "@/lib/priceRefreshSignals";
import { buildBlockedMerchantAttributesSql } from "@/lib/blockedMerchantsSql";
import { getBlockedMerchantsConfig } from "@/lib/blockedMerchantsConfig";

export type BestDeal = {
  id: string;
  asin: string;
  name: string;
  imageUrl: string | null;
  createdAt?: Date | string | null;
  url: string;
  totalPrice: number;
  averagePrice30d: number;
  discountPercent: number;
  ratingAverage: number | null;
  ratingCount: number | null;
  likeCount: number;
  dislikeCount: number;
  attributes: Record<string, string | number | boolean | null>;
  categoryName: string;
  categoryGroup: string;
  categorySlug: string;
};

type BestDealsGroup = string | undefined;

const buildBestDealsWhereClause = (
  blockedMerchantNames: readonly string[],
  group?: BestDealsGroup
) => Prisma.sql`
  WHERE p."visibilityStatus" = 'visible'
    AND p."totalPrice" > 0
    AND COALESCE(p."availabilityStatus", 'UNKNOWN') <> 'OUT_OF_STOCK'
    AND NOT ${buildBlockedMerchantAttributesSql("p", blockedMerchantNames)}
    AND p."averagePrice30d" IS NOT NULL
    AND p."averagePrice30d" > p."totalPrice"
    AND (((p."averagePrice30d" - p."totalPrice") / p."averagePrice30d") * 100) >= 5
    ${group ? Prisma.sql`AND c."group" = ${group}` : Prisma.empty}
`;

export async function getBestDeals(
  limit: number,
  group?: string,
  offset = 0
): Promise<BestDeal[]> {
  const blockedConfig = await getBlockedMerchantsConfig();
  const rows = await prisma.$queryRaw<
    Array<{
      id: string;
      asin: string;
      name: string;
      imageUrl: string | null;
      createdAt: Date;
      url: string;
      totalPrice: number;
      averagePrice30d: number;
      discountPercent: number;
      ratingAverage: number | null;
      ratingCount: number | null;
      likeCount: number;
      dislikeCount: number;
      attributes: unknown;
      categoryName: string;
      categoryGroup: string;
      categorySlug: string;
    }>
  >(Prisma.sql`
    SELECT
      p."id",
      p."asin",
      p."name",
      p."imageUrl",
      p."createdAt",
      p."url",
      p."totalPrice",
      p."averagePrice30d",
      ROUND((((p."averagePrice30d" - p."totalPrice") / p."averagePrice30d") * 100))::int AS "discountPercent",
      p."ratingAverage",
      p."ratingCount",
      COALESCE((
        SELECT COUNT(*)::int
        FROM "DynamicProductReaction" r
        WHERE r."productId" = p."id"
          AND r."reaction" = 'like'
      ), 0) AS "likeCount",
      COALESCE((
        SELECT COUNT(*)::int
        FROM "DynamicProductReaction" r
        WHERE r."productId" = p."id"
          AND r."reaction" = 'dislike'
      ), 0) AS "dislikeCount",
      p."attributes",
      c."name" AS "categoryName",
      c."group" AS "categoryGroup",
      c."slug" AS "categorySlug"
    FROM "DynamicProduct" p
    INNER JOIN "DynamicCategory" c ON c."id" = p."categoryId"
    ${buildBestDealsWhereClause(blockedConfig.allBlockedMerchants, group)}
    ORDER BY
      (((p."averagePrice30d" - p."totalPrice") / p."averagePrice30d") * 100) DESC,
      p."averagePrice30d" DESC,
      p."ratingCount" DESC NULLS LAST
    LIMIT ${limit}
    OFFSET ${offset}
  `);

  return rows.map((row) => ({
    id: row.id,
    asin: row.asin,
    name: row.name,
    imageUrl:
      row.imageUrl || "https://m.media-amazon.com/images/I/61NJbm2a9tL._AC_SL1200_.jpg",
    createdAt: row.createdAt,
    url: row.url,
    totalPrice: row.totalPrice,
    averagePrice30d: row.averagePrice30d,
    discountPercent: row.discountPercent,
    ratingAverage: row.ratingAverage,
    ratingCount: row.ratingCount,
    likeCount: row.likeCount,
    dislikeCount: row.dislikeCount,
    attributes:
      row.attributes && typeof row.attributes === "object"
        ? (row.attributes as Record<string, string | number | boolean | null>)
        : {},
    categoryName: row.categoryName,
    categoryGroup: row.categoryGroup,
    categorySlug: row.categorySlug,
  }));
}

export async function getBestDealsCount(group?: string): Promise<number> {
  const blockedConfig = await getBlockedMerchantsConfig();
  const rows = await prisma.$queryRaw<Array<{ count: bigint }>>(Prisma.sql`
    SELECT COUNT(*)::bigint AS "count"
    FROM "DynamicProduct" p
    INNER JOIN "DynamicCategory" c ON c."id" = p."categoryId"
    ${buildBestDealsWhereClause(blockedConfig.allBlockedMerchants, group)}
  `);

  const rawCount = rows[0]?.count ?? BigInt(0);
  return Number(rawCount);
}

export async function boostBestDealsPriority(
  deals: Array<Pick<BestDeal, "id">>,
  options?: { extraBoost?: number }
) {
  const extraBoost = options?.extraBoost ?? 3;

  await Promise.allSettled(
    deals.map((deal, index) => {
      const signal =
        index < 20 ? "offer_top" : index < 50 ? "offer_high" : "offer_standard";

      return touchDynamicProductPriority({
        productId: deal.id,
        signal,
        extraBoost,
      });
    })
  );
}

export async function boostBestDealsMaxPriority(
  deals: Array<Pick<BestDeal, "id">>
) {
  await boostBestDealsPriority(deals, { extraBoost: 10 });
}
