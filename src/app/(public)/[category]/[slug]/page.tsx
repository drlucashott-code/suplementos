import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { ProductList } from "@/components/dynamic/ProductList";
import { MobileFiltersDrawer } from "@/components/dynamic/MobileFiltersDrawer";
import { DesktopFiltersSidebar } from "@/components/dynamic/DesktopFiltersSidebar";
import { Pagination } from "@/components/dynamic/Pagination";
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

const PAGE_SIZE = 32;

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
  const pageParam = Array.isArray(search.page) ? search.page[0] : search.page;
  const currentPage = Math.max(1, Number(pageParam) || 1);
  const offset = (currentPage - 1) * PAGE_SIZE;

  const catalog = await getDynamicCatalogData({
    group,
    slug,
    search,
    limit: PAGE_SIZE,
    offset,
  });

  if (!catalog) return notFound();

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

      <Suspense
        fallback={<div className="h-14 w-full border-b border-zinc-200 bg-white" />}
      >
        <FloatingFiltersBar
          sortOptions={catalog.allSortOptions as DynamicSortOption[]}
          defaultOrder={catalog.defaultOrder}
        />
      </Suspense>

      <div className="mx-auto max-w-[1400px]">
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
              <Suspense fallback={null}>
                <DesktopFiltersSidebar
                  brands={catalog.sortedBrands}
                  sellers={catalog.sortedSellers}
                  ratingOptions={catalog.ratingOptions}
                  dynamicConfigs={catalog.filterableConfigs}
                  dynamicOptions={catalog.sortedDynamicOptions}
                />
              </Suspense>
            </aside>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-x-2 px-1">
                <h2 className="text-[20px] font-bold text-[#0F1111]">Resultados</h2>
                {((search.order as string) ?? catalog.defaultOrder) === "best_value" &&
                catalog.bestValueHelperText ? (
                  <span className="text-[13px] font-normal text-zinc-600">
                    ({catalog.bestValueHelperText})
                  </span>
                ) : null}
              </div>
              <p className="mb-3 px-1 text-[13px] text-zinc-600">
                {catalog.totalProducts} produtos em {catalog.categoryName}
              </p>

              <ProductList
                products={catalog.products}
                totalProducts={catalog.totalProducts}
                hasMore={false}
                pageSize={PAGE_SIZE}
                viewEventName="view_dynamic_list"
                displayConfig={catalog.publicTableConfig}
                highlightConfig={catalog.publicHighlightConfig}
                analysisTitleTemplate={catalog.categorySettings.analysisTitleTemplate}
              />

              <Pagination
                totalItems={catalog.totalProducts}
                pageSize={PAGE_SIZE}
                currentPage={currentPage}
              />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
