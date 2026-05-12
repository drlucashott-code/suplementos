import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { boostBestDealsMaxPriority, getBestDeals } from "@/lib/bestDeals";
import {
  touchDynamicProductMaxPriority,
  touchTrackedProductMaxPriority,
} from "@/lib/priceRefreshSignals";

const OFFER_GROUPS = ["suplementos", "casa", "pets"] as const;
const PRIORITY_OFFER_LIMIT = 100;

export type MaxPriorityRefreshSummary = {
  offersTouched: number;
  listDynamicTouched: number;
  listTrackedTouched: number;
  totalTouched: number;
};

async function collectOfferTargets() {
  const dealsByGroup = await Promise.all(
    OFFER_GROUPS.map(async (group) => ({
      group,
      deals: await getBestDeals(PRIORITY_OFFER_LIMIT, group),
    }))
  );

  const dynamicIds = new Set<string>();
  for (const { deals } of dealsByGroup) {
    for (const deal of deals) {
      dynamicIds.add(deal.id);
    }
  }

  return {
    dealsByGroup,
    dynamicIds,
  };
}

async function collectListTargets() {
  const rows = await prisma.$queryRaw<
    Array<{
      dynamicProductId: string | null;
      trackedProductId: string | null;
    }>
  >(Prisma.sql`
    SELECT DISTINCT
      i."productId" AS "dynamicProductId",
      COALESCE(i."trackedAmazonProductId", mp."trackedProductId", tp."id") AS "trackedProductId"
    FROM "SiteUserListItem" i
    LEFT JOIN "SiteUserMonitoredProduct" mp ON mp."id" = i."monitoredProductId"
    LEFT JOIN "SiteTrackedAmazonProduct" tp ON tp."asin" = mp."asin"
    WHERE i."productId" IS NOT NULL
      OR COALESCE(i."trackedAmazonProductId", mp."trackedProductId", tp."id") IS NOT NULL
  `);

  const dynamicIds = new Set<string>();
  const trackedIds = new Set<string>();

  for (const row of rows) {
    if (row.dynamicProductId) {
      dynamicIds.add(row.dynamicProductId);
    }
    if (row.trackedProductId) {
      trackedIds.add(row.trackedProductId);
    }
  }

  return { dynamicIds, trackedIds };
}

export async function syncMaxPriorityRefreshTargets(): Promise<MaxPriorityRefreshSummary> {
  const [offerTargets, listTargets] = await Promise.all([
    collectOfferTargets(),
    collectListTargets(),
  ]);

  const offerDynamicIds = Array.from(offerTargets.dynamicIds);
  const listDynamicIds = Array.from(listTargets.dynamicIds);
  const listTrackedIds = Array.from(listTargets.trackedIds);

  await Promise.allSettled([
    boostBestDealsMaxPriority(
      offerTargets.dealsByGroup.flatMap((entry) => entry.deals)
    ),
    ...listDynamicIds.map((productId) => touchDynamicProductMaxPriority(productId)),
    ...listTrackedIds.map((trackedProductId) =>
      touchTrackedProductMaxPriority(trackedProductId)
    ),
  ]);

  return {
    offersTouched: offerDynamicIds.length,
    listDynamicTouched: listDynamicIds.length,
    listTrackedTouched: listTrackedIds.length,
    totalTouched: offerDynamicIds.length + listDynamicIds.length + listTrackedIds.length,
  };
}
