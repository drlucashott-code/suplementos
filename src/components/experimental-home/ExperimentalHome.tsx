"use client";

import { useEffect } from "react";
import { ShieldCheck } from "lucide-react";
import { CategoryExplorer } from "./CategoryExplorer";
import { CommunityLists } from "./CommunityLists";
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
      <div className="border-b border-[#D5D9D9] bg-[#EAF5F6]">
        <div className="mx-auto flex max-w-[1480px] items-center justify-center gap-2 px-4 py-2 text-center text-[11px] font-semibold text-[#314E52] sm:text-[12px]">
          <ShieldCheck className="h-3.5 w-3.5 text-[#007185]" />
          O AmazonPicks compara preços e custo-benefício; a compra acontece na loja parceira.
        </div>
      </div>
      <OfferRail bestDeals={bestDeals} />
      <CategoryExplorer categories={categories} />
      <CommunityLists publicLists={publicLists} />
    </div>
  );
}
