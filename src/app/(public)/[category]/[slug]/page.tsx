import { Suspense } from "react";
import { notFound } from "next/navigation";
import { ProductList } from "@/components/dynamic/ProductList";
import { MobileFiltersDrawer } from "@/components/dynamic/MobileFiltersDrawer";
import {
  FloatingFiltersBar,
  type DynamicSortOption,
} from "@/components/dynamic/FloatingFiltersBar";
import { AmazonHeader } from "@/components/dynamic/AmazonHeader";
import { getDynamicCatalogData } from "@/lib/dynamicCatalog";

export const revalidate = 300;

interface PageProps {
  params: Promise<{ category: string; slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

const INITIAL_PAGE_SIZE = 12;

export default async function DynamicCategoryPage({
  params,
  searchParams,
}: PageProps) {
  const { category: group, slug } = await params;
  const search = await searchParams;

  const catalog = await getDynamicCatalogData({
    group,
    slug,
    search,
    limit: INITIAL_PAGE_SIZE,
    offset: 0,
  });

  if (!catalog) return notFound();

  const loadMoreParams = new URLSearchParams();
  loadMoreParams.set("group", group);
  loadMoreParams.set("slug", slug);

  Object.entries(search).forEach(([key, value]) => {
    if (value === undefined) return;

    if (Array.isArray(value)) {
      value.forEach((item) => loadMoreParams.append(key, item));
      return;
    }

    loadMoreParams.set(key, value);
  });

  const loadMoreUrl = `/api/dynamic-catalog?${loadMoreParams.toString()}`;

  return (
    <main className="min-h-screen bg-[#EAEDED]">
      <Suspense fallback={<div className="h-14 w-full bg-[#232f3e]" />}>
        <AmazonHeader />
      </Suspense>

      <div className="mx-auto max-w-[1200px]">
        <Suspense
          fallback={<div className="h-14 w-full border-b border-zinc-200 bg-white" />}
        >
          <FloatingFiltersBar
            sortOptions={catalog.allSortOptions as DynamicSortOption[]}
            defaultOrder={catalog.defaultOrder}
          />
        </Suspense>

        <div className="px-3">
          <Suspense fallback={null}>
            <MobileFiltersDrawer
              brands={catalog.sortedBrands}
              sellers={catalog.sortedSellers}
              ratingOptions={catalog.ratingOptions}
              dynamicConfigs={catalog.filterableConfigs}
              dynamicOptions={catalog.sortedDynamicOptions}
            />
          </Suspense>

          <div className="mt-4 w-full pb-10">
            <p className="mb-2 px-1 text-[13px] font-medium text-zinc-800">
              {catalog.totalProducts} produtos encontrados em {catalog.categoryName}
            </p>
            {catalog.fallbackEnabled ? (
              <p className="mb-2 px-1 text-[12px] text-amber-700">
                Fallback de precos ativo. Produtos elegiveis podem usar o ultimo preco
                valido de ate {catalog.fallbackMaxAgeHours}h.
              </p>
            ) : null}
            {((search.order as string) ?? catalog.defaultOrder) === "best_value" &&
            catalog.bestValueHelperText ? (
              <p className="mb-3 px-1 text-[12px] text-zinc-600">
                {catalog.bestValueHelperText}
              </p>
            ) : null}

            <div className="w-full">
              <ProductList
                products={catalog.products}
                totalProducts={catalog.totalProducts}
                hasMore={catalog.hasMore}
                loadMoreUrl={loadMoreUrl}
                pageSize={INITIAL_PAGE_SIZE}
                viewEventName="view_dynamic_list"
                displayConfig={catalog.publicTableConfig}
                highlightConfig={catalog.publicHighlightConfig}
                analysisTitleTemplate={catalog.categorySettings.analysisTitleTemplate}
              />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
