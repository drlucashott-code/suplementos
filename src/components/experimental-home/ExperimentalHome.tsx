"use client";

import { useEffect } from "react";
import { CategoryExplorer } from "./CategoryExplorer";
import { CommunityLists } from "./CommunityLists";
import { ExperimentalMobileFooter } from "./ExperimentalMobileFooter";
import { NextOffersSection } from "./NextOffersSection";
import type { ExperimentalHomeProps } from "./types";

export function ExperimentalHome({
  categories,
  nextOffersFeed,
  publicLists,
}: ExperimentalHomeProps) {
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
      {nextOffersFeed ? (
        <NextOffersSection initialFeed={nextOffersFeed} />
      ) : (
        <section className="bg-[#F3F4F4] px-4 py-12 text-center">
          <h1 className="text-2xl font-bold">Top ofertas indisponíveis agora</h1>
          <p className="mt-2 text-sm text-[#565959]">Tente novamente em instantes.</p>
        </section>
      )}
      <CategoryExplorer categories={categories} />
      <CommunityLists publicLists={publicLists} />
      <ExperimentalMobileFooter />
    </div>
  );
}
