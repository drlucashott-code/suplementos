"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, TrendingDown } from "lucide-react";
import BestDealProductCard from "@/components/BestDealProductCard";
import type { BestDeal } from "@/lib/bestDeals";

type DealFilter = "all" | "suplementos" | "casa" | "pets";

const filters: Array<{ value: DealFilter; label: string }> = [
  { value: "all", label: "Todas" },
  { value: "suplementos", label: "Suplementos" },
  { value: "casa", label: "Casa" },
  { value: "pets", label: "Pets" },
];

function track(event: string, payload: Record<string, unknown>) {
  const win = window as typeof window & { dataLayer?: object[] };
  win.dataLayer = win.dataLayer || [];
  win.dataLayer.push({ event, home_version: "experimental_amazon_mobile", ...payload });
}

export function OfferRail({ bestDeals }: { bestDeals: BestDeal[] }) {
  const [activeFilter, setActiveFilter] = useState<DealFilter>("all");
  const railRef = useRef<HTMLDivElement>(null);
  const availableFilters = filters.filter(
    (filter) => filter.value === "all" || bestDeals.some((deal) => deal.categoryGroup === filter.value)
  );
  const visibleDeals = useMemo(
    () =>
      activeFilter === "all"
        ? bestDeals.slice(0, 8)
        : bestDeals.filter((deal) => deal.categoryGroup === activeFilter).slice(0, 8),
    [activeFilter, bestDeals]
  );

  function selectFilter(filter: DealFilter) {
    setActiveFilter(filter);
    railRef.current?.scrollTo({ left: 0, behavior: "smooth" });
    track("filter_experimental_home_offers", { filter });
  }

  function scrollRail(direction: -1 | 1) {
    railRef.current?.scrollBy({
      left: direction * Math.min(railRef.current.clientWidth * 0.82, 720),
      behavior: "smooth",
    });
  }

  return (
    <section id="top-ofertas" aria-labelledby="top-ofertas-title" className="bg-white">
      <div className="mx-auto max-w-[1480px] px-4 pb-7 pt-5 sm:px-6 lg:px-10 lg:pb-10 lg:pt-8">
        <div className="flex items-start justify-between gap-4">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 text-[#CC0C39]">
              <TrendingDown className="h-4 w-4" />
              <p className="text-[11px] font-bold uppercase tracking-[0.16em]">Ofertas reais</p>
            </div>
            <h1 id="top-ofertas-title" className="mt-2 text-[27px] font-bold leading-[1.08] tracking-[-0.02em] text-[#0F1111] sm:text-[34px] lg:text-[40px]">
              Top ofertas de hoje
            </h1>
          </div>
          <Link href="/ofertas" className="hidden shrink-0 items-center gap-1 text-[14px] font-bold text-[#007185] hover:text-[#C7511F] sm:flex">
            Ver todas <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-5 flex items-center justify-between gap-3">
          <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="group" aria-label="Filtrar ofertas por categoria">
            {availableFilters.map((filter) => {
              const active = activeFilter === filter.value;
              return (
                <button
                  key={filter.value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => selectFilter(filter.value)}
                  className={`shrink-0 rounded-full border px-4 py-2 text-[13px] font-semibold transition ${
                    active
                      ? "border-[#0F1111] bg-[#0F1111] text-white"
                      : "border-[#D5D9D9] bg-white text-[#0F1111] hover:bg-[#F7F8F8]"
                  }`}
                >
                  {filter.label}
                </button>
              );
            })}
          </div>
          <div className="hidden gap-2 lg:flex">
            <button type="button" onClick={() => scrollRail(-1)} aria-label="Ofertas anteriores" className="grid h-9 w-9 place-items-center rounded-full border border-[#D5D9D9] bg-white hover:bg-[#F7F8F8]">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button type="button" onClick={() => scrollRail(1)} aria-label="Próximas ofertas" className="grid h-9 w-9 place-items-center rounded-full border border-[#D5D9D9] bg-white hover:bg-[#F7F8F8]">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {visibleDeals.length > 0 ? (
          <div ref={railRef} className="-mx-4 mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-3 sm:-mx-6 sm:px-6 lg:-mx-2 lg:px-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {visibleDeals.map((deal) => (
              <div
                key={deal.id}
                className="w-[calc((100%-0.75rem)/2)] shrink-0 snap-start sm:w-[220px] lg:w-[232px]"
              >
                <BestDealProductCard
                  item={deal}
                  category="experimental_home_top_offers"
                  showActions={false}
                  uniformHeight
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-5 rounded-xl border border-dashed border-[#D5D9D9] bg-[#F7F8F8] px-5 py-10 text-center text-sm text-[#565959]">
            Nenhuma queda de preço válida foi encontrada agora.
          </div>
        )}

        <Link href="/ofertas" className="mt-2 flex items-center justify-center gap-1 rounded-full border border-[#D5D9D9] py-2.5 text-[14px] font-bold text-[#007185] sm:hidden">
          Ver todas as ofertas <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}
