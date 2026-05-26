import { boostBestDealsMaxPriority, getBestDeals } from "@/lib/bestDeals";

const OFFER_GROUPS = ["suplementos", "casa", "pets"] as const;
const PRIORITY_OFFER_LIMIT = 100;

export type MaxPriorityRefreshSummary = {
  offersTouched: number;
  totalTouched: number;
};

export type MaxPriorityRefreshScope = "offers" | "all";

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

export async function syncOfferMaxPriorityRefreshTargets() {
  const offerTargets = await collectOfferTargets();
  const offerDynamicIds = Array.from(offerTargets.dynamicIds);

  await boostBestDealsMaxPriority(offerTargets.dealsByGroup.flatMap((entry) => entry.deals));

  return {
    offersTouched: offerDynamicIds.length,
    totalTouched: offerDynamicIds.length,
  } satisfies MaxPriorityRefreshSummary;
}

export async function syncMaxPriorityRefreshTargets(
  scope: MaxPriorityRefreshScope = "all"
): Promise<MaxPriorityRefreshSummary> {
  return syncOfferMaxPriorityRefreshTargets();
}
