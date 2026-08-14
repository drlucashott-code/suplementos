"use client";

import Image from "next/image";
import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { StarRating } from "@/components/product/StarRating";
import { queueNextOfferImpression } from "@/lib/next-offers/analytics";
import { notifyNextOfferClick } from "@/lib/next-offers/click-alert";
import type {
  NextOfferProduct,
  NextOffersCatalog as NextOffersCatalogData,
  NextOffersFilters,
} from "@/lib/next-offers/types";

const priceRanges = [
  { value: "all", label: "Todos os preços" },
  { value: "under-100", label: "Até R$ 100" },
  { value: "100-300", label: "R$ 100 a R$ 300" },
  { value: "over-300", label: "Acima de R$ 300" },
] as const;

const ratingFilters = [
  { value: "all", label: "Todas" },
  { value: "4.5", label: "4,5 ou mais" },
  { value: "4", label: "4,0 ou mais" },
] as const;

export function NextOffersCatalog({ catalog }: { catalog: NextOffersCatalogData }) {
  const { filters } = catalog;
  const [brandsExpanded, setBrandsExpanded] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [showCategoryBackArrow, setShowCategoryBackArrow] = useState(false);
  const [showCategoryNextArrow, setShowCategoryNextArrow] = useState(true);
  const categoryRailRef = useRef<HTMLElement>(null);
  const categories = getNavigationCategories(catalog.categories);
  const rootCategories = categories.filter((item) => item.depth === 0);
  const visibleCategories = getVisibleCategoryOptions(categories, filters.category);
  const hasActiveFilters =
    filters.query !== "" ||
    filters.category !== "all" ||
    filters.priceRange !== "all" ||
    filters.rating !== "all" ||
    filters.brand !== "all";
  const firstResult =
    catalog.totalProducts === 0 ? 0 : (catalog.page - 1) * catalog.pageSize + 1;
  const lastResult = Math.min(catalog.page * catalog.pageSize, catalog.totalProducts);
  const closeMobileFilters = () => setMobileFiltersOpen(false);

  function updateCategoryArrows() {
    const rail = categoryRailRef.current;
    if (!rail) return;
    setShowCategoryBackArrow(rail.scrollLeft > 4);
    setShowCategoryNextArrow(
      rail.scrollLeft < rail.scrollWidth - rail.clientWidth - 4,
    );
  }

  function scrollCategories(direction: -1 | 1) {
    const rail = categoryRailRef.current;
    if (!rail) return;
    rail.scrollBy({
      left: direction * Math.min(Math.max(360, rail.clientWidth * 0.68), 760),
      behavior: "smooth",
    });
  }

  useEffect(() => {
    updateCategoryArrows();
    window.addEventListener("resize", updateCategoryArrows);
    return () => window.removeEventListener("resize", updateCategoryArrows);
  }, [catalog.categories]);

  const filtersPanel = (
    <>
      <FilterGroup title="Departamento">
        <FilterLink
          href={buildCatalogHref(filters, { category: "all", brand: "all" })}
          active={filters.category === "all"}
          onNavigate={closeMobileFilters}
        >
          Todos <FacetCount count={catalog.eligibleProducts} />
        </FilterLink>
        {(filters.category === "all" ? rootCategories : visibleCategories).map(
          (item) => (
            <FilterLink
              key={item.slug}
              href={buildCatalogHref(filters, {
                category: item.slug,
                brand: "all",
              })}
              active={filters.category === item.slug}
              depth={item.depth}
              onNavigate={closeMobileFilters}
            >
              {item.name} <FacetCount count={item.count} />
            </FilterLink>
          ),
        )}
      </FilterGroup>

      <FilterGroup title="Marcas">
        <FilterLink
          href={buildCatalogHref(filters, { brand: "all" })}
          active={filters.brand === "all"}
          marker="checkbox"
          onNavigate={closeMobileFilters}
        >
          Todas as marcas
        </FilterLink>
        {(brandsExpanded ? catalog.brands : catalog.brands.slice(0, 8)).map(
          (item) => (
            <FilterLink
              key={item.value}
              href={buildCatalogHref(filters, { brand: item.value })}
              active={normalizeBrand(filters.brand) === normalizeBrand(item.value)}
              marker="checkbox"
              onNavigate={closeMobileFilters}
            >
              {item.label} <FacetCount count={item.count} />
            </FilterLink>
          ),
        )}
        {catalog.brands.length > 8 ? (
          <button
            type="button"
            className="mt-2 text-left text-[12px] font-semibold text-[#007185] hover:text-[#C45500] hover:underline"
            onClick={() => setBrandsExpanded((current) => !current)}
          >
            {brandsExpanded ? "Ver menos" : `Ver mais (${catalog.brands.length - 8})`}
          </button>
        ) : null}
      </FilterGroup>

      <FilterGroup title="Avaliação dos clientes">
        {ratingFilters.map((item) => (
          <FilterLink
            key={item.value}
            href={buildCatalogHref(filters, { rating: item.value })}
            active={filters.rating === item.value}
            onNavigate={closeMobileFilters}
          >
            {item.value === "all" ? null : (
              <span className="mr-1 tracking-[-0.12em] text-[#DE7921]">★★★★☆</span>
            )}
            {item.label}
          </FilterLink>
        ))}
      </FilterGroup>

      <FilterGroup title="Preço">
        {priceRanges.map((item) => (
          <FilterLink
            key={item.value}
            href={buildCatalogHref(filters, { priceRange: item.value })}
            active={filters.priceRange === item.value}
            onNavigate={closeMobileFilters}
          >
            {item.label}
          </FilterLink>
        ))}
      </FilterGroup>

      {hasActiveFilters ? (
        <Link
          href="/ofertas"
          className="block rounded-lg border border-[#888C8C] px-3 py-2 text-center text-[12px]"
          onClick={closeMobileFilters}
        >
          Limpar filtros
        </Link>
      ) : null}
    </>
  );

  return (
    <div className="min-h-screen bg-white text-[#0F1111]">
      <div className="mx-auto max-w-[1600px] overflow-hidden bg-white">
        <div className="relative border-b border-[#E7E7E7]">
          <nav
            ref={categoryRailRef}
            onScroll={updateCategoryArrows}
            className="flex snap-x gap-2 overflow-x-auto px-3 py-3 [scrollbar-width:none] lg:px-[70px] lg:py-[18px] [&::-webkit-scrollbar]:hidden"
            aria-label="Categorias em destaque"
          >
            <CategoryTile
              href={buildCatalogHref(filters, { category: "all", brand: "all" })}
              active={filters.category === "all"}
              symbol="✦"
            >
              Todas as ofertas
            </CategoryTile>
            {rootCategories.map((item) => (
              <CategoryTile
                key={item.slug}
                href={buildCatalogHref(filters, {
                  category: item.slug,
                  brand: "all",
                })}
                active={filters.category === item.slug}
                symbol={getCategorySymbol(item.slug)}
              >
                {item.name}
              </CategoryTile>
            ))}
          </nav>
          <div className="absolute left-0 top-0 hidden h-full items-center bg-gradient-to-r from-white via-white to-transparent pl-[22px] pr-10 lg:flex">
            <button
              type="button"
              onClick={() => scrollCategories(-1)}
              disabled={!showCategoryBackArrow}
              aria-label="Mostrar categorias anteriores"
              className="grid h-9 w-9 place-items-center rounded-full border border-[#D5D9D9] bg-white text-[#0F1111] shadow-sm transition hover:bg-[#F7F8F8] disabled:cursor-default disabled:opacity-35"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          </div>
          <div className="absolute right-0 top-0 hidden h-full items-center bg-gradient-to-l from-white via-white to-transparent pl-10 pr-[22px] lg:flex">
            <button
              type="button"
              onClick={() => scrollCategories(1)}
              disabled={!showCategoryNextArrow}
              aria-label="Mostrar mais categorias"
              className="grid h-9 w-9 place-items-center rounded-full border border-[#D5D9D9] bg-white text-[#0F1111] shadow-sm transition hover:bg-[#F7F8F8] disabled:cursor-default disabled:opacity-35"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="border-t-[9px] border-[#F3F3F3] lg:grid lg:min-h-[760px] lg:grid-cols-[226px_minmax(0,1fr)] lg:border-t-[14px]">
          <aside
            className={`fixed inset-y-0 right-0 z-[100] w-[min(88vw,360px)] overflow-y-auto bg-white p-5 shadow-[-8px_0_28px_rgba(15,17,17,0.3)] transition-transform lg:static lg:block lg:w-auto lg:translate-x-0 lg:border-r lg:border-[#E3E6E6] lg:px-[22px] lg:py-6 lg:shadow-none ${
              mobileFiltersOpen ? "translate-x-0" : "translate-x-[110%]"
            }`}
            aria-label="Filtros dos produtos"
          >
            <div className="mb-5 flex items-center justify-between border-b border-[#D5D9D9] pb-3 lg:hidden">
              <strong>Filtros</strong>
              <button type="button" className="text-[#007185]" onClick={closeMobileFilters}>
                Fechar
              </button>
            </div>
            {filtersPanel}
          </aside>
          {mobileFiltersOpen ? (
            <button
              type="button"
              className="fixed inset-0 z-[99] bg-[rgb(15_17_17/48%)] lg:hidden"
              aria-label="Fechar filtros"
              onClick={closeMobileFilters}
            />
          ) : null}

          <section className="min-w-0 bg-white px-3 pb-10 pt-5 lg:px-[22px] lg:pb-[50px] lg:pt-6">
            <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-[#D5D9D9] bg-white px-2.5 py-2 shadow-[0_0_10px_rgb(15_17_17/5%)]">
              <span className="whitespace-nowrap text-[12px] text-[#565959]">
                {firstResult}–{lastResult} de {catalog.totalProducts} resultados
              </span>
              <div className="ml-auto flex items-center gap-2">
                <button
                  type="button"
                  className="px-1 py-1 text-[12px] font-bold lg:hidden"
                  onClick={() => setMobileFiltersOpen(true)}
                  aria-expanded={mobileFiltersOpen}
                >
                  Filtros {hasActiveFilters ? "•" : ""}
                </button>
                <form action="/ofertas" method="get" className="flex items-center gap-1 text-[12px]">
                  <CatalogHiddenInputs filters={filters} omit={["sort", "page"]} />
                  <label className="hidden lg:inline" htmlFor="catalog-sort">
                    Ordenar por:
                  </label>
                  <select
                    id="catalog-sort"
                    name="sort"
                    value={filters.sort}
                    className="max-w-[155px] bg-white py-1 font-semibold outline-none"
                    onChange={(event) => event.currentTarget.form?.requestSubmit()}
                  >
                    <option value="discount">Maiores descontos</option>
                    <option value="popular">Mais populares</option>
                  </select>
                </form>
              </div>
            </div>

            {catalog.products.length ? (
              <>
                <div className="grid grid-cols-2 items-stretch gap-x-2.5 gap-y-6 sm:grid-cols-[repeat(auto-fill,minmax(205px,1fr))] lg:gap-x-3 lg:gap-y-7">
                  {catalog.products.map((product, index) => (
                    <CatalogProductCard
                      key={product.id}
                      product={product}
                      position={(catalog.page - 1) * catalog.pageSize + index + 1}
                      sortMode={filters.sort}
                    />
                  ))}
                </div>
                <Pagination catalog={catalog} />
              </>
            ) : (
              <div className="mt-5 border border-dashed border-[#D5D9D9] bg-[#F7F8F8] px-6 py-14 text-center">
                <h1 className="text-lg font-bold">Nenhum produto neste filtro</h1>
                <p className="mt-2 text-[13px] text-[#565959]">
                  Tente outra categoria, marca ou faixa de preço.
                </p>
                <Link href="/ofertas" className="mt-4 inline-block rounded-lg border border-[#888C8C] bg-white px-4 py-2 text-sm">
                  Limpar filtros
                </Link>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function CatalogProductCard({
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
              page: "offers",
              section: "offers-catalog",
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
    page: "offers",
    section: "offers-catalog",
    sort: sortMode,
    position: String(position),
    price: String(product.currentPrice),
    discount: String(product.discountPercent),
    deal: product.isDeal ? "1" : "0",
    lowest90: product.isLowest90 ? "1" : "0",
  });

  return (
    <article ref={cardRef} className="group min-w-0 bg-white">
      <a
        href={`/api/next-offers/go/${product.asin}?${context}`}
        target="_blank"
        rel="nofollow sponsored noopener"
        onClick={() => notifyNextOfferClick(product)}
        className="block h-full outline-offset-2"
        aria-label={`Ver ${product.title} na Amazon`}
      >
        <div className="relative aspect-square overflow-hidden bg-[#F7F8F8]">
          <Image
            src={product.imageUrl}
            alt=""
            fill
            unoptimized
            sizes="(max-width: 640px) 46vw, 220px"
            className="object-contain p-2 transition duration-200 group-hover:scale-[1.025]"
            loading={position <= 5 ? "eager" : "lazy"}
          />
        </div>
        <div className="px-0.5 pt-2">
          {product.discountPercent > 0 ? (
            <span className="inline-flex rounded-sm bg-[#CC0C39] px-1.5 py-1 text-[10px] font-bold text-white sm:text-[11px]">
              -{formatPercent(product.discountPercent)}
            </span>
          ) : null}
          <strong className="mt-1 block text-[18px] font-medium leading-tight tracking-[-0.03em] sm:text-[21px]">
            {formatMoney(product.currentPrice)}
          </strong>
          {product.discountPercent > 0 && product.averagePrice90d !== null ? (
            <p className="mt-1 min-h-3.5 truncate text-[10px] text-[#565959]">
              Média 90 dias: <s>{formatMoney(product.averagePrice90d)}</s>
            </p>
          ) : (
            <div className="min-h-3.5" />
          )}
          <h2 className="mt-1.5 line-clamp-3 min-h-[54px] text-[12.5px] font-normal leading-[1.45] group-hover:text-[#C45500] sm:text-[13px]">
            {product.title}
          </h2>
          {product.ratingAverage !== null && product.ratingAverage > 0 ? (
            <div className="mt-1 flex min-h-4 items-center gap-1 text-[11px] text-[#007185]">
              <span className="text-[#0F1111]">{product.ratingAverage.toFixed(1)}</span>
              <StarRating rating={product.ratingAverage} size={12} />
              {product.reviewCount !== null ? <span>({formatCompactNumber(product.reviewCount)})</span> : null}
            </div>
          ) : null}
        </div>
      </a>
    </article>
  );
}

function FilterGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-5 border-b border-[#EAEDED] pb-5 last:border-0">
      <h2 className="mb-2 text-[14px] font-bold">{title}</h2>
      <div className="grid gap-0.5">{children}</div>
    </section>
  );
}

function FilterLink({
  active,
  children,
  href,
  onNavigate,
  depth = 0,
  marker = "radio",
}: {
  active: boolean;
  children: ReactNode;
  href: string;
  onNavigate?: () => void;
  depth?: number;
  marker?: "radio" | "checkbox";
}) {
  return (
    <Link
      href={href}
      className={`flex items-start gap-2 py-1 text-left text-[13px] leading-tight ${active ? "text-[#C45500] underline" : "hover:text-[#C45500] hover:underline"}`}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      style={{ paddingLeft: `${Math.min(depth, 2) * 12}px` }}
      scroll={false}
    >
      <span
        className={`mt-0.5 h-[13px] w-[13px] shrink-0 border border-[#879596] bg-white ${marker === "checkbox" ? "rounded-sm" : "rounded-full"} ${active ? (marker === "checkbox" ? "border-2 border-[#007185] bg-[#007185] shadow-[inset_0_0_0_2px_white]" : "border-4 border-[#007185]") : ""}`}
        aria-hidden="true"
      />
      <span>{children}</span>
    </Link>
  );
}

function FacetCount({ count }: { count: number }) {
  return <span className="text-[11px] text-[#565959]">({count})</span>;
}

function CategoryTile({
  active,
  children,
  href,
  symbol,
}: {
  active: boolean;
  children: ReactNode;
  href: string;
  symbol: string;
}) {
  return (
    <Link
      href={href}
      className={`grid min-h-[76px] w-[116px] shrink-0 snap-start place-content-center gap-1.5 rounded-[5px] border p-2 text-center text-[12px] font-semibold ${active ? "border-[#232F3E] shadow-[inset_0_0_0_1px_#232F3E]" : "border-[#E3E6E6] hover:border-[#232F3E]"}`}
    >
      <span
        className={`mx-auto grid h-[31px] w-[31px] place-items-center rounded-full ${active ? "bg-[#FEBD69] text-[#0F1111]" : "bg-[#232F3E] text-white"}`}
        aria-hidden="true"
      >
        {symbol}
      </span>
      {children}
    </Link>
  );
}

function CatalogHiddenInputs({
  filters,
  omit,
}: {
  filters: NextOffersFilters;
  omit: Array<keyof NextOffersFilters>;
}) {
  const values: Array<[keyof NextOffersFilters, string, string | number]> = [
    ["query", "q", filters.query],
    ["category", "category", filters.category],
    ["priceRange", "price", filters.priceRange],
    ["rating", "rating", filters.rating],
    ["brand", "brand", filters.brand],
    ["sort", "sort", filters.sort],
    ["page", "page", filters.page],
  ];

  return values
    .filter(([key, , value]) => !omit.includes(key) && !isDefaultFilter(key, value))
    .map(([key, name, value]) => (
      <input key={key} type="hidden" name={name} value={String(value)} />
    ));
}

function Pagination({ catalog }: { catalog: NextOffersCatalogData }) {
  if (catalog.totalPages <= 1) return null;
  const pages = getPaginationPages(catalog.page, catalog.totalPages);

  return (
    <nav className="mt-10 flex items-center justify-center gap-1" aria-label="Paginação dos produtos">
      {catalog.page > 1 ? (
        <Link className="grid h-9 place-items-center rounded-lg border border-[#D5D9D9] px-3 text-[13px]" href={buildCatalogHref(catalog.filters, { page: catalog.page - 1 })}>
          Anterior
        </Link>
      ) : (
        <span className="grid h-9 place-items-center rounded-lg border border-[#D5D9D9] bg-[#F7FAFA] px-3 text-[13px] text-[#879596]">Anterior</span>
      )}
      {pages.map((page, index) =>
        page === null ? (
          <span key={`ellipsis-${index}`} className="px-1">…</span>
        ) : (
          <Link
            key={page}
            href={buildCatalogHref(catalog.filters, { page })}
            className={`grid h-9 min-w-9 place-items-center rounded-lg border px-2 text-[13px] ${page === catalog.page ? "border-[#232F3E] shadow-[inset_0_0_0_1px_#232F3E]" : "border-[#D5D9D9]"}`}
            aria-current={page === catalog.page ? "page" : undefined}
          >
            {page}
          </Link>
        ),
      )}
      {catalog.page < catalog.totalPages ? (
        <Link className="grid h-9 place-items-center rounded-lg border border-[#D5D9D9] px-3 text-[13px]" href={buildCatalogHref(catalog.filters, { page: catalog.page + 1 })}>
          Próxima
        </Link>
      ) : (
        <span className="grid h-9 place-items-center rounded-lg border border-[#D5D9D9] bg-[#F7FAFA] px-3 text-[13px] text-[#879596]">Próxima</span>
      )}
    </nav>
  );
}

function buildCatalogHref(filters: NextOffersFilters, updates: Partial<NextOffersFilters>) {
  const next = { ...filters, ...updates };
  if (updates.page === undefined) next.page = 1;
  const params = new URLSearchParams();
  if (next.query) params.set("q", next.query);
  if (next.category !== "all") params.set("category", next.category);
  if (next.priceRange !== "all") params.set("price", next.priceRange);
  if (next.rating !== "all") params.set("rating", next.rating);
  if (next.brand !== "all") params.set("brand", next.brand);
  if (next.sort !== "discount") params.set("sort", next.sort);
  if (next.page > 1) params.set("page", String(next.page));
  const query = params.toString();
  return query ? `/ofertas?${query}` : "/ofertas";
}

function isDefaultFilter(key: keyof NextOffersFilters, value: string | number) {
  return (
    value === "" ||
    ((key === "category" || key === "priceRange" || key === "rating" || key === "brand") && value === "all") ||
    (key === "sort" && value === "discount") ||
    (key === "page" && value === 1)
  );
}

function getNavigationCategories(categories: NextOffersCatalogData["categories"]) {
  const bySlug = new Map(categories.map((category) => [category.slug, category]));
  return categories
    .map((category) => ({
      ...category,
      depth: getCategoryDepth(category, bySlug),
      path: getCategoryPath(category, bySlug),
    }))
    .sort((left, right) => left.depth - right.depth || left.path.localeCompare(right.path, "pt-BR"));
}

type CategoryOption = ReturnType<typeof getNavigationCategories>[number];

function getVisibleCategoryOptions(categories: CategoryOption[], selectedSlug: string) {
  const bySlug = new Map(categories.map((category) => [category.slug, category]));
  const selected = bySlug.get(selectedSlug);
  if (!selected) return categories.filter((category) => category.depth === 0);
  const ancestors: CategoryOption[] = [];
  let parentSlug = selected.parentSlug;
  while (parentSlug && ancestors.length < 10) {
    const parent = bySlug.get(parentSlug);
    if (!parent) break;
    ancestors.unshift(parent);
    parentSlug = parent.parentSlug;
  }
  return [
    ...ancestors,
    selected,
    ...categories.filter((category) => category.parentSlug === selected.slug),
  ];
}

function getCategoryDepth(
  category: { parentSlug: string | null },
  bySlug: Map<string, { parentSlug: string | null }>,
) {
  let depth = 0;
  let parentSlug = category.parentSlug;
  while (parentSlug && depth < 10) {
    depth += 1;
    parentSlug = bySlug.get(parentSlug)?.parentSlug ?? null;
  }
  return depth;
}

function getCategoryPath(
  category: { name: string; parentSlug: string | null },
  bySlug: Map<string, { name: string; parentSlug: string | null }>,
) {
  const path = [category.name];
  let parentSlug = category.parentSlug;
  while (parentSlug && path.length < 10) {
    const parent = bySlug.get(parentSlug);
    if (!parent) break;
    path.unshift(parent.name);
    parentSlug = parent.parentSlug;
  }
  return path.join(" › ");
}

function getPaginationPages(current: number, total: number) {
  const candidates = new Set([1, total, current - 1, current, current + 1]);
  const valid = [...candidates].filter((page) => page >= 1 && page <= total).sort((a, b) => a - b);
  const result: Array<number | null> = [];
  for (const page of valid) {
    const previous = result.at(-1);
    if (typeof previous === "number" && page - previous > 1) result.push(null);
    result.push(page);
  }
  return result;
}

function normalizeBrand(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "").trim();
}

function getCategorySymbol(slug: string) {
  if (slug.includes("saude")) return "+";
  if (slug.includes("beleza")) return "✦";
  if (slug.includes("livro")) return "▤";
  if (slug.includes("casa")) return "⌂";
  if (slug.includes("pet")) return "●";
  if (slug.includes("eletron")) return "▣";
  if (slug.includes("esporte")) return "◆";
  return "•";
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function formatPercent(value: number) {
  return `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(value)}%`;
}

function formatCompactNumber(value: number) {
  return new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}
