"use client";

import { useEffect } from "react";
import { CategoryExplorer } from "./CategoryExplorer";
import { CommunityLists } from "./CommunityLists";
import { ExperimentalMobileFooter } from "./ExperimentalMobileFooter";
import { OfferRail } from "./OfferRail";
import type { ExperimentalHomeProps } from "./types";

export function ExperimentalHome({ categories, bestDeals, publicLists }: ExperimentalHomeProps) {
  useEffect(() => {
    const win = window as typeof window & { dataLayer?: object[] };
    win.dataLayer = win.dataLayer || [];
    win.dataLayer.push({
      event: "view_experimental_home",
      home_version: "experimental_amazon_mobile",
    });
  }, []);

  return (
    <div className="min-h-screen bg-white font-sans text-[#0F1111]">
      <OfferRail bestDeals={bestDeals} />
      <CategoryExplorer categories={categories} />
      <CommunityLists publicLists={publicLists} />
      <ExperimentalMobileFooter />
    </div>
  );
}
