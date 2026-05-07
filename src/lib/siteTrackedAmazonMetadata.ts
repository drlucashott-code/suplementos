import { prisma } from "@/lib/prisma";
import { fetchMonitoredAmazonProductSnapshot } from "@/lib/siteMonitoredProducts";

type TrackedAmazonProductRow = {
  id: string;
  asin: string;
  name: string | null;
  imageUrl: string | null;
  ratingAverage: number | null;
  ratingCount: number | null;
  amazonUrl: string | null;
  totalPrice: number | null;
  availabilityStatus: string | null;
  programAndSavePrice: number | null;
};

function needsMetadataRepair(row: TrackedAmazonProductRow) {
  const fallbackName = `Produto Amazon ${row.asin}`;
  const hasRatings = typeof row.ratingAverage === "number" && typeof row.ratingCount === "number";
  return !row.name || row.name === fallbackName || !row.imageUrl || !hasRatings;
}

export async function repairTrackedAmazonProductMetadataIfNeeded(trackedProductId: string) {
  const rows = await prisma.$queryRaw<TrackedAmazonProductRow[]>`
    SELECT
      tp."id",
      tp."asin",
      tp."name",
      tp."imageUrl",
      tp."ratingAverage",
      tp."ratingCount",
      tp."amazonUrl",
      tp."totalPrice",
      tp."availabilityStatus",
      tp."programAndSavePrice"
    FROM "SiteTrackedAmazonProduct" tp
    WHERE tp."id" = ${trackedProductId}
    LIMIT 1
  `;

  const row = rows[0];
  if (!row || !needsMetadataRepair(row)) {
    return row ?? null;
  }

  try {
    const snapshot = await fetchMonitoredAmazonProductSnapshot(row.asin);

    await prisma.siteTrackedAmazonProduct.update({
      where: { id: trackedProductId },
      data: {
        amazonUrl: snapshot.amazonUrl,
        name: snapshot.name,
        imageUrl: snapshot.imageUrl,
        ratingAverage: snapshot.ratingAverage,
        ratingCount: snapshot.ratingCount,
        totalPrice: snapshot.totalPrice,
        availabilityStatus: snapshot.availabilityStatus,
        programAndSavePrice: snapshot.programAndSavePrice,
        lastSyncedAt: new Date(),
      },
    });

    return {
      ...row,
      amazonUrl: snapshot.amazonUrl,
      name: snapshot.name,
      imageUrl: snapshot.imageUrl,
      ratingAverage: snapshot.ratingAverage,
      ratingCount: snapshot.ratingCount,
      totalPrice: snapshot.totalPrice,
      availabilityStatus: snapshot.availabilityStatus,
      programAndSavePrice: snapshot.programAndSavePrice,
    };
  } catch (error) {
    const errorDetail = error instanceof Error ? error.message : String(error);
    console.error("tracked_amazon_metadata_repair_failed", {
      trackedProductId,
      asin: row.asin,
      errorDetail,
      error,
    });
    return row;
  }
}
