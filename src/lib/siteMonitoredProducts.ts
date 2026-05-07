import { prisma } from "@/lib/prisma";
import {
  fetchAmazonPriceSnapshots,
  getAmazonItemAffiliateUrl,
  getAmazonItems,
  getAmazonItemTitle,
  type AmazonItem,
} from "@/lib/amazonApiClient";

export type MonitoredAmazonProductSnapshot = {
  asin: string;
  amazonUrl: string;
  name: string;
  imageUrl: string | null;
  ratingAverage: number | null;
  ratingCount: number | null;
  totalPrice: number;
  availabilityStatus: string;
  programAndSavePrice: number | null;
};

export function extractAmazonAsin(input: string) {
  const normalized = input.trim();
  if (!normalized) return null;

  const directAsinMatch = normalized.match(/\b([A-Z0-9]{10})\b/i);
  const dpMatch = normalized.match(/\/dp\/([A-Z0-9]{10})/i);
  const gpMatch = normalized.match(/\/gp\/product\/([A-Z0-9]{10})/i);

  const asin = dpMatch?.[1] || gpMatch?.[1] || directAsinMatch?.[1];
  return asin ? asin.toUpperCase() : null;
}

function getAmazonItemImage(item: AmazonItem) {
  return item.Images?.Primary?.Large?.URL ?? null;
}

async function getDiscoveryProductMetadataByAsin(asin: string) {
  const rows = await prisma.dynamicDiscoveryProductStatus.findMany({
    where: { asin },
    orderBy: [{ relevanceScore: "desc" }, { lastSeenAt: "desc" }],
    take: 1,
    select: {
      title: true,
      ratingAverage: true,
      reviewCount: true,
    },
  });

  return rows[0] ?? null;
}

export async function fetchMonitoredAmazonProductSnapshot(
  amazonUrlOrAsin: string
): Promise<MonitoredAmazonProductSnapshot> {
  const asin = extractAmazonAsin(amazonUrlOrAsin);
  if (!asin) {
    throw new Error("invalid_amazon_url");
  }

  const [snapshots, items, discoveryMetadata] = await Promise.all([
    fetchAmazonPriceSnapshots([asin]),
    getAmazonItems({
      itemIds: [asin],
      resources: ["ItemInfo.Title", "Images.Primary.Large", "CustomerReviews.Count", "CustomerReviews.StarRating"],
    }),
    getDiscoveryProductMetadataByAsin(asin),
  ]);

  const snapshot = snapshots[asin];
  const item = items.find((entry) => entry.ASIN === asin);
  const itemTitle = item ? getAmazonItemTitle(item) : "";
  const title =
    itemTitle && itemTitle !== "Sem titulo"
      ? itemTitle
      : discoveryMetadata?.title || `Produto Amazon ${asin}`;
  const ratingCount =
    typeof item?.CustomerReviews?.Count === "number"
      ? item.CustomerReviews.Count
      : discoveryMetadata?.reviewCount ?? null;
  const ratingAverage =
    typeof item?.CustomerReviews?.StarRating?.Value === "number"
      ? item.CustomerReviews.StarRating.Value
      : discoveryMetadata?.ratingAverage ?? null;

  return {
    asin,
    amazonUrl:
      snapshot?.affiliateUrl ||
      (item ? getAmazonItemAffiliateUrl(item) : `https://www.amazon.com.br/dp/${asin}`),
    name: title,
    imageUrl: item ? getAmazonItemImage(item) : null,
    ratingAverage,
    ratingCount,
    totalPrice: snapshot?.price ?? 0,
    availabilityStatus:
      snapshot && snapshot.price > 0 ? "IN_STOCK" : "OUT_OF_STOCK",
    programAndSavePrice: snapshot?.programAndSavePrice ?? null,
  };
}
