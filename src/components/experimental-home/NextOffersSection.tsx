"use client";

import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { queueNextOfferImpression } from "@/lib/next-offers/analytics";
import { notifyNextOfferClick } from "@/lib/next-offers/click-alert";
import { StarRating } from "@/components/product/StarRating";
import {
  isNextOffersFeedResponse,
  type NextOfferProduct,
  type NextOffersFeedResponse,
  type NextOffersFilters,
} from "@/lib/next-offers/types";

const visibleFilterCount = 10;
const hiddenFromAllOffersCarousel = new Set(["cd-e-vinil", "dvd-e-blu-ray"]);

export function NextOffersSection({
  initialFeed,
}: {
  initialFeed: NextOffersFeedResponse;
}) {
  const [feed, setFeed] = useState(initialFeed);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const latestRequest = useRef(0);
  const railRef = useRef<HTMLDivElement>(null);
  const { catalog } = feed;
  const visibleProductCount = catalog.filters.category === "all" ? 24 : 6;
  const carouselProducts =
    catalog.filters.category === "all"
      ? catalog.products.filter(
          (product) =>
            !product.navigationCategories.some((category) =>
              hiddenFromAllOffersCarousel.has(category.slug),
            ),
        )
      : catalog.products;
  const orderedCarouselProducts = [...carouselProducts].sort(
    (left, right) =>
      right.discountPercent - left.discountPercent ||
      right.savingsAmount - left.savingsAmount ||
      left.asin.localeCompare(right.asin),
  );
  const rootCategories = catalog.categories
    .filter((category) => category.parentSlug === null)
    .sort((left, right) => left.name.localeCompare(right.name, "pt-BR"));
  const categoryFilters = [
    { slug: "all", name: "Todas" },
    ...rootCategories.slice(0, visibleFilterCount - 1),
  ];

  useEffect(() => {
    railRef.current?.scrollTo({ left: 0, behavior: "auto" });
  }, [catalog.filters.category]);

  async function selectCategory(category: string) {
    const requestId = latestRequest.current + 1;
    latestRequest.current = requestId;
    setLoading(true);
    setError(null);
    railRef.current?.scrollTo({ left: 0, behavior: "auto" });

    try {
      const params = new URLSearchParams();
      if (category !== "all") params.set("category", category);
      const response = await fetch(`/api/next-offers/feed?${params}`, {
        cache: "no-store",
      });
      const payload: unknown = await response.json();
      if (!response.ok || !isNextOffersFeedResponse(payload)) {
        throw new Error("Feed incompatível.");
      }
      if (requestId === latestRequest.current) setFeed(payload);
    } catch {
      if (requestId === latestRequest.current) {
        setError("Não foi possível atualizar esta categoria agora.");
      }
    } finally {
      if (requestId === latestRequest.current) setLoading(false);
    }
  }

  function scrollRail(direction: -1 | 1) {
    const rail = railRef.current;
    if (!rail) return;

    rail.scrollBy({
      left: direction * Math.min(rail.clientWidth * 0.82, 960),
      behavior: "smooth",
    });
  }

  return (
    <section
      id="top-ofertas"
      aria-labelledby="top-ofertas-title"
      className="scroll-mt-24 bg-[#F3F4F4]"
    >
      <div className="mx-auto max-w-[1480px] px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
        <div className="flex items-end justify-between gap-4">
          <h1
            id="top-ofertas-title"
            className="text-[27px] font-bold leading-tight tracking-[-0.025em] text-[#0F1111] sm:text-[34px]"
          >
            Top ofertas
          </h1>
          <a
            href={buildFullCatalogHref(feed)}
            className="mb-0.5 inline-flex shrink-0 items-center gap-1 text-[13px] font-bold text-[#007185] hover:text-[#C7511F] sm:text-sm lg:hidden"
          >
            Ver tudo <ChevronRight className="h-4 w-4" />
          </a>
        </div>

        <div className="mt-4">
          <nav
            className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6 lg:mx-0 lg:overflow-visible lg:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            aria-label="Filtrar ofertas por departamento"
          >
            {categoryFilters.map((category) => (
              <CategoryChip
                key={category.slug}
                active={catalog.filters.category === category.slug}
                disabled={loading}
                onClick={() => selectCategory(category.slug)}
              >
                {category.name}
              </CategoryChip>
            ))}
            <a
              href={buildFullCatalogHref(feed)}
              className="hidden shrink-0 items-center gap-1 px-1 py-2 text-[13px] font-bold text-[#007185] hover:text-[#C7511F] lg:inline-flex"
            >
              Ver tudo <ChevronRight className="h-4 w-4" />
            </a>
          </nav>
        </div>

        {error ? (
          <p className="mt-2 text-sm text-[#7A4B00]">{error}</p>
        ) : null}

        <div className="relative">
          <div
            ref={railRef}
            className={`-mx-4 mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-3 transition-opacity sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0 ${
              loading ? "opacity-50" : "opacity-100"
            } [scrollbar-width:none] [&::-webkit-scrollbar]:hidden`}
            aria-busy={loading}
          >
          {orderedCarouselProducts.slice(0, visibleProductCount).map((product, index) => (
            <div
              key={product.id}
              className="w-[calc((100%-0.75rem)/2)] shrink-0 snap-start border border-[#D5D9D9] bg-white sm:w-[220px] lg:w-[232px]"
            >
              <NextOfferCard
                product={product}
                position={index + 1}
                sortMode={catalog.filters.sort}
              />
            </div>
          ))}
          <a
            href={buildFullCatalogHref(feed)}
            className="flex w-[calc((100%-0.75rem)/2)] shrink-0 snap-start flex-col items-center justify-center rounded-lg border border-dashed border-[#AAB7B8] bg-white px-4 text-center text-[#007185] transition hover:border-[#007185] hover:bg-[#EEF6F7] sm:w-[220px] lg:w-[232px]"
          >
            <ChevronRight className="h-6 w-6" />
            <span className="mt-2 text-sm font-bold">Ver todas as ofertas</span>
          </a>
          </div>
          <button
            type="button"
            onClick={() => scrollRail(-1)}
            aria-label="Ofertas anteriores"
            className="absolute left-2 top-1/2 hidden h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-[#D5D9D9] bg-white/95 text-[#0F1111] shadow-md transition hover:bg-white lg:grid"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => scrollRail(1)}
            aria-label="Próximas ofertas"
            className="absolute right-2 top-1/2 hidden h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-[#D5D9D9] bg-white/95 text-[#0F1111] shadow-md transition hover:bg-white lg:grid"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>
    </section>
  );
}

function NextOfferCard({
  product,
  position,
  sortMode,
}: {
  product: NextOfferProduct;
  position: number;
  sortMode: NextOffersFilters["sort"];
}) {
  const cardRef = useRef<HTMLElement>(null);
  const impressionSent = useRef(false);

  useEffect(() => {
    const card = cardRef.current;
    if (!card || impressionSent.current) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
          timer ??= setTimeout(() => {
            impressionSent.current = true;
            observer.disconnect();
            queueNextOfferImpression({
              productId: product.id,
              page: "home",
              section: "top-offers-next",
              sortMode,
              position,
              currentPrice: product.currentPrice,
              discountPercent: product.discountPercent,
              isDeal: product.isDeal,
              isLowest90: product.isLowest90,
            });
          }, 800);
        } else if (timer) {
          clearTimeout(timer);
          timer = null;
        }
      },
      { threshold: 0.5 },
    );
    observer.observe(card);

    return () => {
      observer.disconnect();
      if (timer) clearTimeout(timer);
    };
  }, [position, product, sortMode]);

  const context = new URLSearchParams({
    page: "home",
    section: "top-offers-next",
    sort: sortMode,
    position: String(position),
    price: String(product.currentPrice),
    discount: String(product.discountPercent),
    deal: product.isDeal ? "1" : "0",
    lowest90: product.isLowest90 ? "1" : "0",
  });

  return (
    <article
      ref={cardRef}
      className="group h-full min-w-0 bg-white lg:border-b lg:border-r lg:border-[#D5D9D9]"
    >
      <a
        href={`/api/next-offers/go/${product.asin}?${context}`}
        target="_blank"
        rel="nofollow sponsored noopener"
        onClick={() => notifyNextOfferClick(product)}
        className="block h-full px-3 pb-5 pt-3 sm:px-4 sm:pt-4"
        aria-label={`Ver ${product.title} na Amazon`}
      >
        <div className="relative aspect-square overflow-hidden bg-white">
          <Image
            src={product.imageUrl}
            alt=""
            fill
            unoptimized
            sizes="(max-width: 640px) 46vw, (max-width: 1024px) 220px, 190px"
            className="object-contain p-1 transition duration-200 group-hover:scale-[1.025]"
            loading={position <= 4 ? "eager" : "lazy"}
          />
        </div>
        <div className="pt-3">
          {product.discountPercent > 0 ? (
            <span className="inline-flex rounded-sm bg-[#CC0C39] px-2 py-1 text-[11px] font-bold text-white sm:text-xs">
              -{formatPercent(product.discountPercent)}
            </span>
          ) : null}
          <strong className="mt-2 block text-[20px] leading-none text-[#0F1111] sm:text-[22px]">
            {formatMoney(product.currentPrice)}
          </strong>
          {product.discountPercent > 0 && product.averagePrice90d !== null ? (
            <p className="mt-1 text-[11px] text-[#565959] sm:text-xs">
              Média 90 dias: <s>{formatMoney(product.averagePrice90d)}</s>
            </p>
          ) : (
            <div className="h-[17px]" />
          )}
          <h2 className="mt-2 line-clamp-3 text-[13px] font-medium leading-[1.35] text-[#0F1111] group-hover:text-[#C7511F] sm:text-[14px]">
            {product.title}
          </h2>
          {product.ratingAverage !== null && product.ratingAverage > 0 ? (
            <div className="mt-2 flex flex-wrap items-center gap-1 text-[11px] text-[#565959] sm:text-xs">
              <span>{product.ratingAverage.toFixed(1)}</span>
              <StarRating rating={product.ratingAverage} size={12} />
              {product.reviewCount !== null ? (
                <span>({formatCompactNumber(product.reviewCount)})</span>
              ) : null}
            </div>
          ) : null}
        </div>
      </a>
    </article>
  );
}

function CategoryChip({
  active,
  children,
  disabled,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-pressed={active}
      className={`shrink-0 rounded-full border px-4 py-2 text-[13px] font-semibold transition disabled:cursor-wait lg:px-3 ${
        active
          ? "border-[#0F1111] bg-[#0F1111] text-white"
          : "border-[#AAB7B8] bg-white text-[#0F1111] hover:border-[#007185]"
      }`}
    >
      {children}
    </button>
  );
}

function buildFullCatalogHref(feed: NextOffersFeedResponse) {
  const params = new URLSearchParams();
  if (feed.catalog.filters.category !== "all") {
    params.set("category", feed.catalog.filters.category);
  }
  const query = params.toString();
  return query ? `/ofertas?${query}` : "/ofertas";
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatPercent(value: number) {
  return `${new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 1,
  }).format(value)}%`;
}

function formatCompactNumber(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}
