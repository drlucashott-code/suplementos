"use client";

import HomePremiumClient, { type CategoryItem } from "@/app/home-premium/HomePremiumClient";
import type { BestDeal } from "@/lib/bestDeals";

type PublicListItem = {
  slug: string;
  title: string;
  ownerDisplayName: string;
  ownerUsername: string | null;
  itemsCount: number;
  previewImages: string[] | null;
  createdAt: string;
};

export type { CategoryItem };

export default function HomeV5Client({
  supplementCategories,
  houseCategories,
  petCategories,
  bestDeals,
  publicLists,
}: {
  supplementCategories: CategoryItem[];
  houseCategories: CategoryItem[];
  petCategories: CategoryItem[];
  bestDeals: BestDeal[];
  publicLists: PublicListItem[];
}) {
  return (
    <HomePremiumClient
      supplementCategories={supplementCategories}
      houseCategories={houseCategories}
      petCategories={petCategories}
      bestDeals={bestDeals}
      publicLists={publicLists}
      offersFirst
      trackingPath="/home-v5"
      showHero={false}
    />
  );
}
