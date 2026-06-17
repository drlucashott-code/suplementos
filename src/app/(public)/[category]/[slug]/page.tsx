import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { ProductList } from "@/components/dynamic/ProductList";
import { MobileFiltersDrawer } from "@/components/dynamic/MobileFiltersDrawer";
import { DesktopFiltersSidebar } from "@/components/dynamic/DesktopFiltersSidebar";
import {
  FloatingFiltersBar,
  type DynamicSortOption,
} from "@/components/dynamic/FloatingFiltersBar";
import { AmazonHeader } from "@/components/dynamic/AmazonHeader";
import { getDynamicCatalogData } from "@/lib/dynamicCatalog";
import { buildAbsoluteUrl } from "@/lib/siteUrl";

export const revalidate = 300;

interface PageProps {
  params: Promise<{ category: string; slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

const INITIAL_PAGE_SIZE = 12;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string; slug: string }>;
}): Promise<Metadata> {
  const { category: group, slug } = await params;
  const catalog = await getDynamicCatalogData({
    group,
    slug,
    search: {},
    limit: 1,
    offset: 0,
  });

  if (!catalog) {
    return {
      title: "Categoria não encontrada | amazonpicks",
    };
  }

  const canonicalPath = `/${group}/${slug}`;
  const description = `${catalog.totalProducts} produtos em ${catalog.categoryName} com filtros inteligentes, leitura rápida de preço e comparação orientada por custo-benefício.`;

  return {
    title: `${catalog.categoryName} | amazonpicks`,
    description,
    alternates: {
      canonical: buildAbsoluteUrl(canonicalPath),
    },
    openGraph: {
      title: `${catalog.categoryName} | amazonpicks`,
      description,
      url: buildAbsoluteUrl(canonicalPath),
      type: "website",
    },
  };
}

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
  const canonicalPath = `/${group}/${slug}`;
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: catalog.categoryName,
    url: buildAbsoluteUrl(canonicalPath),
    description: `${catalog.totalProducts} produtos em ${catalog.categoryName} com filtros inteligentes e comparação rápida.`,
    breadcrumb: {
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Início",
          item: buildAbsoluteUrl("/"),
        },
        {
          "@type": "ListItem",
          position: 2,
          name: group,
          item: buildAbsoluteUrl(`/${group}`),
        },
        {
          "@type": "ListItem",
          position: 3,
          name: catalog.categoryName,
          item: buildAbsoluteUrl(canonicalPath),
        },
      ],
    },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: catalog.products.length,
      itemListElement: catalog.products.slice(0, 12).map((product, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: product.affiliateUrl,
        name: product.name,
      })),
    },
  };

  return (
    <main className="min-h-screen bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <Suspense fallback={<div className="h-14 w-full bg-[#232f3e]" />}>
        <AmazonHeader />
      </Suspense>

      <div className="mx-auto max-w-[1400px]">
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

          <div className="mt-4 flex gap-5 pb-10">
            <aside className="hidden w-[230px] shrink-0 lg:block">
              <div className="sticky top-4">
                <Suspense fallback={null}>
                  <DesktopFiltersSidebar
                    brands={catalog.sortedBrands}
                    sellers={catalog.sortedSellers}
                    ratingOptions={catalog.ratingOptions}
                    dynamicConfigs={catalog.filterableConfigs}
                    dynamicOptions={catalog.sortedDynamicOptions}
                  />
                </Suspense>
              </div>
            </aside>

            <div className="min-w-0 flex-1">
              <h2 className="px-1 text-[20px] font-bold text-[#0F1111]">Resultados</h2>
              <p className="mb-3 px-1 text-[13px] text-zinc-600">
                {catalog.totalProducts} produtos em {catalog.categoryName}
              </p>
              {((search.order as string) ?? catalog.defaultOrder) === "best_value" &&
              catalog.bestValueHelperText ? (
                <p className="mb-3 px-1 text-[12px] text-zinc-600">
                  {catalog.bestValueHelperText}
                </p>
              ) : null}

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
