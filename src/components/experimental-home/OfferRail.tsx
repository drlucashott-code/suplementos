"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { ArrowRight, ChevronLeft, ChevronRight, TrendingDown } from "lucide-react";
import TrackedDealLink from "@/components/TrackedDealLink";
import amazonImageLoader from "@/lib/amazonImageLoader";
import type { BestDeal } from "@/lib/bestDeals";

type DealFilter = "all" | "suplementos" | "casa" | "pets";

const filters: Array<{ value: DealFilter; label: string }> = [
  { value: "all", label: "Todas" },
  { value: "suplementos", label: "Suplementos" },
  { value: "casa", label: "Casa" },
  { value: "pets", label: "Pets" },
];

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function track(event: string, payload: Record<string, unknown>) {
  const win = window as typeof window & { dataLayer?: object[] };
  win.dataLayer = win.dataLayer || [];
  win.dataLayer.push({ event, home_version: "experimental_amazon_mobile", ...payload });
}

function OfferCard({ deal, position }: { deal: BestDeal; position: number }) {
  return (
    <TrackedDealLink
      asin={deal.asin}
      href={deal.url}
      productId={deal.id}
      productName={deal.name}
      value={deal.totalPrice}
      category="experimental_home_top_offers"
      className="group flex h-full flex-col rounded-2xl border border-[#D5D9D9] bg-white p-3 shadow-[0_2px_8px_rgba(15,17,17,0.06)] transition hover:border-[#AAB7B8] hover:shadow-[0_8px_22px_rgba(15,17,17,0.10)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007185]"
    >
      <div className="relative aspect-square overflow-hidden rounded-xl bg-[#F7F8F8]">
        <Image
          loader={amazonImageLoader}
          src={deal.imageUrl || "/file.svg"}
          alt={deal.name}
          fill
          sizes="(max-width: 640px) 64vw, 230px"
          className="object-contain p-3 transition duration-300 group-hover:scale-[1.03]"
          priority={position < 2}
        />
        <span className="absolute left-2 top-2 rounded-md bg-[#CC0C39] px-2 py-1 text-[13px] font-bold text-white">
          -{deal.discountPercent}%
        </span>
      </div>

      <div className="flex flex-1 flex-col pt-3">
        <p className="text-[11px] font-semibold text-[#007185]">{deal.categoryName}</p>
        <h3 className="mt-1 line-clamp-2 min-h-10 text-[14px] font-medium leading-5 text-[#0F1111] group-hover:text-[#C7511F]">
          {deal.name}
        </h3>
        <div className="mt-3">
          <p className="text-[21px] font-bold tracking-[-0.02em] text-[#0F1111]">
            {formatCurrency(deal.totalPrice)}
          </p>
          <p className="mt-0.5 text-[11px] text-[#565959]">
            Média de 30 dias: <span className="line-through">{formatCurrency(deal.averagePrice30d)}</span>
          </p>
        </div>
        <span className="mt-3 flex items-center justify-between border-t border-[#EAEEEE] pt-3 text-[13px] font-bold text-[#007185]">
          Ver oferta
          <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
        </span>
      </div>
    </TrackedDealLink>
  );
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
        ? bestDeals
        : bestDeals.filter((deal) => deal.categoryGroup === activeFilter),
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
            {visibleDeals.map((deal, index) => (
              <div key={deal.id} className="w-[72vw] max-w-[238px] shrink-0 snap-start sm:w-[220px] lg:w-[232px]">
                <OfferCard deal={deal} position={index} />
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
