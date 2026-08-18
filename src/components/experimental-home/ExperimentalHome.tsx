"use client";

import { useEffect, useState } from "react";
import { isNextOffersFeedResponse } from "@/lib/next-offers/types";
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
  const [offersFeed, setOffersFeed] = useState(nextOffersFeed);
  const [offersLoading, setOffersLoading] = useState(nextOffersFeed === null);
  const [offersError, setOffersError] = useState(false);

  useEffect(() => {
    const win = window as typeof window & { dataLayer?: object[] };
    win.dataLayer = win.dataLayer || [];
    win.dataLayer.push({
      event: "view_experimental_home",
      home_version: "experimental_amazon_mobile",
    });
  }, []);

  useEffect(() => {
    if (nextOffersFeed) return;

    const controller = new AbortController();

    async function recoverOffersFeed() {
      setOffersLoading(true);
      setOffersError(false);

      try {
        const response = await fetch("/api/next-offers/feed", {
          cache: "no-store",
          signal: controller.signal,
        });
        const payload: unknown = await response.json();
        if (!response.ok || !isNextOffersFeedResponse(payload)) {
          throw new Error("Feed de ofertas incompatível.");
        }
        setOffersFeed(payload);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setOffersError(true);
        }
      } finally {
        if (!controller.signal.aborted) setOffersLoading(false);
      }
    }

    void recoverOffersFeed();
    return () => controller.abort();
  }, [nextOffersFeed]);

  return (
    <div className="min-h-screen bg-white font-sans text-[#0F1111]">
      <CategoryExplorer categories={categories} />
      {offersFeed ? (
        <NextOffersSection initialFeed={offersFeed} />
      ) : (
        <section className="bg-[#F3F4F4] px-4 py-12 text-center">
          <h1 className="text-2xl font-bold">Top ofertas</h1>
          <p className="mt-2 text-sm text-[#565959]">
            {offersLoading
              ? "Carregando as melhores ofertas..."
              : "As ofertas estão temporariamente indisponíveis."}
          </p>
          {offersError ? (
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-4 text-sm font-semibold text-[#007185] hover:text-[#C7511F]"
            >
              Tentar novamente
            </button>
          ) : null}
        </section>
      )}
      <CommunityLists publicLists={publicLists} />
      <ExperimentalMobileFooter />
    </div>
  );
}
