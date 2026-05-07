import { prisma } from "@/lib/prisma";
import { fetchAmazonReviewSnapshot } from "@/lib/amazonDiscoveryScraper";

export type DiscoveryMetadataSnapshot = {
  title: string | null;
  ratingAverage: number | null;
  reviewCount: number | null;
};

export async function getDiscoveryMetadataByAsin(
  asin: string
): Promise<DiscoveryMetadataSnapshot | null> {
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

export type AmazonReviewFallbackSource = "discovery" | "amazon" | "none";

export type AmazonReviewFallbackSnapshot = {
  ratingAverage: number | null;
  ratingCount: number | null;
  source: AmazonReviewFallbackSource;
};

export async function resolveAmazonReviewDataWithDiscoveryFallback(
  asin: string
): Promise<AmazonReviewFallbackSnapshot> {
  const discoveryMetadata = await getDiscoveryMetadataByAsin(asin).catch(() => null);
  const discoveryRatingAverage = discoveryMetadata?.ratingAverage ?? null;
  const discoveryRatingCount = discoveryMetadata?.reviewCount ?? null;
  if (discoveryRatingAverage !== null || discoveryRatingCount !== null) {
    return {
      ratingAverage: discoveryRatingAverage,
      ratingCount: discoveryRatingCount,
      source: "discovery",
    };
  }

  const amazonSnapshot = await fetchAmazonReviewSnapshot(asin).catch(() => ({
    ratingAverage: null,
    reviewCount: null,
  }));

  if (amazonSnapshot.ratingAverage !== null || amazonSnapshot.reviewCount !== null) {
    return {
      ratingAverage: amazonSnapshot.ratingAverage,
      ratingCount: amazonSnapshot.reviewCount,
      source: "amazon",
    };
  }

  return {
    ratingAverage: null,
    ratingCount: null,
    source: "none",
  };
}
