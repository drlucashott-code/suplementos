import type { NextOffersFeedResponse } from "@/lib/next-offers/types";

export type HomeHub = "suplementos" | "casa" | "pets";

export type ExperimentalCategory = {
  title: string;
  imageSrc: string;
  path: string;
  group: HomeHub;
};

export type ExperimentalPublicList = {
  slug: string;
  title: string;
  description: string | null;
  ownerDisplayName: string;
  ownerUsername: string | null;
  itemsCount: number;
  savedCount: number;
  commentsCount: number;
  previewImages: string[];
  updatedAt: string;
};

export type ExperimentalHomeProps = {
  categories: Record<HomeHub, ExperimentalCategory[]>;
  nextOffersFeed: NextOffersFeedResponse | null;
  publicLists: ExperimentalPublicList[];
};
