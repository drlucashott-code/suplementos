import { prisma } from "@/lib/prisma";
import DiscoveryWorkbenchClient from "./DiscoveryWorkbenchClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type SearchParams = Promise<{
  category?: string;
  notice?: string;
}>;

function safeDecode(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function toPreviewSummary(raw: unknown) {
  return (raw && typeof raw === "object" ? raw : null) as
      | {
        progress?: {
          phase: string;
          completedQueries: number;
          totalQueries: number;
          currentQuery: string;
          currentPage: number;
          currentUrl: string;
          currentCards: number;
          currentAsins: number;
          renderer: "http" | "browser";
        };
        queries?: Array<{
          query: string;
          url: string;
          sortBy: string;
          page: number;
          cards: number;
          validAsins: number;
          hits: number;
          renderer: "http" | "browser";
        }>;
        finalCounts?: {
          approved: number;
          rejected: number;
          existing: number;
          pendingReview: number;
        };
        counts?: {
          discovered: number;
          existing: number;
          rejected: number;
          approved: number;
          pendingReview: number;
        };
      }
    | null;
}

export default async function AdminDynamicDiscoveryPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const categories = await prisma.dynamicCategory.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, group: true, slug: true },
  });

  const selectedCategoryId = params.category?.trim() || "";
  const notice = typeof params.notice === "string" ? safeDecode(params.notice) : "";

  if (!selectedCategoryId) {
    return (
      <DiscoveryWorkbenchClient
        categories={categories}
        selectedCategoryId=""
        notice={notice}
        config={null}
        latestRun={null}
        runHistory={[]}
        brands={[]}
        products={[]}
      />
    );
  }

  const [config, latestRun, runHistory, brands, products] = await Promise.all([
    prisma.dynamicDiscoveryCategoryConfig.findUnique({
      where: { categoryId: selectedCategoryId },
    }),
    prisma.dynamicDiscoveryRun.findFirst({
      where: { categoryId: selectedCategoryId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.dynamicDiscoveryRun.findMany({
      where: { categoryId: selectedCategoryId },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    prisma.dynamicDiscoveryBrandStatus.findMany({
      where: { categoryId: selectedCategoryId },
      orderBy: [{ relevanceScore: "desc" }, { lastSeenAt: "desc" }],
      take: 400,
    }),
    prisma.dynamicDiscoveryProductStatus.findMany({
      where: { categoryId: selectedCategoryId },
      orderBy: [{ relevanceScore: "desc" }, { lastSeenAt: "desc" }],
      take: 600,
    }),
  ]);

  return (
    <DiscoveryWorkbenchClient
      categories={categories}
      selectedCategoryId={selectedCategoryId}
      notice={notice}
      config={
        config
          ? {
              mode: config.mode,
              primeOnlyDefault: config.primeOnlyDefault,
              ignoreInternationalDefault: config.ignoreInternationalDefault,
              broadDiscoveryDefault: config.broadDiscoveryDefault,
              defaultSortBy: config.defaultSortBy,
              autoMaxPages: config.autoMaxPages,
              maxPages: config.maxPages,
              autoMaxItemsPerQuery: config.autoMaxItemsPerQuery,
              maxItemsPerQuery: config.maxItemsPerQuery,
              searchTerms: config.searchTerms,
              seedBrands: config.seedBrands,
            }
          : null
      }
      latestRun={
        latestRun
          ? {
              id: latestRun.id,
              createdAt: latestRun.createdAt.toISOString(),
              updatedAt: latestRun.updatedAt.toISOString(),
              status: latestRun.status,
              queryCount: latestRun.queryCount,
              asinCount: latestRun.asinCount,
              newCount: latestRun.newCount,
              existingCount: latestRun.existingCount,
              pendingCount: latestRun.pendingCount,
              rejectedCount: latestRun.rejectedCount,
              approvedCount: latestRun.approvedCount,
              sortBy: latestRun.sortBy,
              searchTerms: latestRun.searchTerms,
              seedBrands: latestRun.seedBrands,
              exportAsins: latestRun.exportAsins,
              previewSummary: toPreviewSummary(latestRun.previewSummary),
            }
          : null
      }
      runHistory={runHistory.map((run) => ({
        id: run.id,
        createdAt: run.createdAt.toISOString(),
        updatedAt: run.updatedAt.toISOString(),
        status: run.status,
        queryCount: run.queryCount,
        asinCount: run.asinCount,
        newCount: run.newCount,
        existingCount: run.existingCount,
        pendingCount: run.pendingCount,
        rejectedCount: run.rejectedCount,
        approvedCount: run.approvedCount,
        sortBy: run.sortBy,
        searchTerms: run.searchTerms,
        seedBrands: run.seedBrands,
        exportAsins: run.exportAsins,
        previewSummary: toPreviewSummary(run.previewSummary),
      }))}
      brands={brands.map((brand) => ({
        brandName: brand.brandName,
        status: brand.status,
        relevanceScore: brand.relevanceScore,
        timesDetected: brand.timesDetected,
        firstSeenAt: brand.firstSeenAt.toISOString(),
        lastSeenAt: brand.lastSeenAt.toISOString(),
      }))}
      products={products.map((product) => ({
        asin: product.asin,
        status: product.status,
        catalogState: product.catalogState,
        reason: product.reason,
        source: product.source,
        query: product.query,
        brandName: product.brandName,
        title: product.title,
        ratingAverage: product.ratingAverage,
        reviewCount: product.reviewCount,
        searchPosition: product.searchPosition,
        sponsored: product.sponsored,
        isPrime: product.isPrime,
        isInternational: product.isInternational,
        timesDetected: product.timesDetected,
        relevanceScore: product.relevanceScore,
        queriesDetected: product.queriesDetected,
        sources: product.sources,
        lastSeenAt: product.lastSeenAt.toISOString(),
      }))}
    />
  );
}
