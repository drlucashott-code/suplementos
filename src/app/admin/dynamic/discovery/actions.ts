"use server";

import { prisma } from "@/lib/prisma";
import {
  runAmazonDiscoveryPlan,
  type AmazonDiscoveryProgress,
  type AmazonDiscoveryAggregate,
  type AmazonDiscoveryMode,
  type AmazonDiscoverySortBy,
} from "@/lib/amazonDiscoveryScraper";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect-error";

const DISCOVERY_PATH = "/admin/dynamic/discovery";

type DiscoveryProductStatus = "approved" | "rejected" | "existing" | "pending_review";
type DiscoveryBrandStatus = "approved" | "pending" | "rejected";

function encodeNotice(message: string) {
  return encodeURIComponent(message);
}

function buildRedirectUrl(params: { categoryId?: string; notice?: string }) {
  const query = new URLSearchParams();
  if (params.categoryId) {
    query.set("category", params.categoryId);
  }
  if (params.notice) {
    query.set("notice", params.notice);
  }
  const suffix = query.toString();
  return `${DISCOVERY_PATH}${suffix ? `?${suffix}` : ""}`;
}

function redirectWithNotice(params: { categoryId?: string; notice: string }) {
  redirect(buildRedirectUrl({ categoryId: params.categoryId, notice: encodeNotice(params.notice) }));
}

function finishDiscoveryFlow(categoryId: string, notice: string) {
  revalidatePath(DISCOVERY_PATH);
  redirectWithNotice({ categoryId, notice });
}

function parseString(formData: FormData, name: string, fallback = "") {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : fallback;
}

function parseBoolean(formData: FormData, name: string, fallback = false) {
  const values = formData.getAll(name);
  if (values.length === 0) return fallback;

  return values.some((value) => {
    const normalized = String(value).trim().toLowerCase();
    return ["1", "true", "on", "yes", "sim"].includes(normalized);
  });
}

function parseInteger(formData: FormData, name: string, fallback: number, min: number, max: number) {
  const raw = parseString(formData, name, "");
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}

function normalizeList(values: string[]) {
  return Array.from(
    new Set(values.map((value) => value.trim()).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b, "pt-BR"));
}

function parseListFromFormData(formData: FormData, fieldName: string) {
  const values = formData.getAll(fieldName);
  return normalizeList(
    values.flatMap((value) =>
      String(value)
        .split(/[\r\n,]+/g)
        .map((item) => item.trim())
    )
  );
}

function normalizeMode(value: string, fallback: AmazonDiscoveryMode = "individual") {
  return value === "multi_brand" ? "multi_brand" : fallback;
}

function normalizeSortBy(value: string, fallback: AmazonDiscoverySortBy = "best_sellers") {
  return value === "newest" || value === "top_rated" || value === "featured" ? value : fallback;
}

function parseSortModes(formData: FormData, fallback: AmazonDiscoverySortBy) {
  const selected = parseListFromFormData(formData, "sortModes");
  const allowed: AmazonDiscoverySortBy[] = ["best_sellers", "newest", "top_rated", "featured"];
  const filtered = selected.filter((mode): mode is AmazonDiscoverySortBy =>
    allowed.includes(mode as AmazonDiscoverySortBy)
  );

  return filtered.length > 0 ? filtered : [fallback];
}

function normalizeDiscoveryProductStatus(value: string | null | undefined): DiscoveryProductStatus | null {
  if (!value) return null;
  switch (value) {
    case "approved":
    case "rejected":
    case "existing":
    case "pending_review":
      return value;
    case "pending":
      return "pending_review";
    default:
      return null;
  }
}

function resolveProductStatus(
  storedStatus: string | null | undefined,
  isExistingInCatalog: boolean
): DiscoveryProductStatus {
  const normalizedStored = normalizeDiscoveryProductStatus(storedStatus);

  if (
    normalizedStored === "approved" ||
    normalizedStored === "rejected" ||
    normalizedStored === "existing"
  ) {
    return normalizedStored;
  }

  return isExistingInCatalog ? "existing" : "pending_review";
}

function scorePersistedProduct(input: {
  aggregate: AmazonDiscoveryAggregate;
  previousTimesDetected: number;
}) {
  const repeatBonus = Math.max(0, input.previousTimesDetected + input.aggregate.timesDetected - 1) * 4;
  return Math.max(0, Math.round(input.aggregate.relevanceScore + repeatBonus));
}

function mergeUniqueStrings(...groups: Array<string[] | null | undefined>) {
  return normalizeList(groups.flatMap((group) => group ?? []));
}

function normalizeBrandName(value: unknown) {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (value && typeof value === "object") {
    const candidate = value as Record<string, unknown>;
    const nested = [
      candidate.displayValue,
      candidate.name,
      candidate.value,
      candidate.title,
    ];

    for (const nestedValue of nested) {
      if (typeof nestedValue === "string" && nestedValue.trim().length > 0) {
        return nestedValue.trim();
      }
    }
  }

  return null;
}

function extractProductBrand(attributes: unknown) {
  if (!attributes || typeof attributes !== "object") {
    return null;
  }

  const candidate = attributes as Record<string, unknown>;
  const possibleValues = [candidate.brand, candidate.Brand, candidate.brandName, candidate.brand_name];

  for (const value of possibleValues) {
    const normalized = normalizeBrandName(value);
    if (normalized) return normalized;
  }

  return null;
}

function buildReasonFromStatus(status: DiscoveryProductStatus, existingReason: string | null) {
  if (status === "rejected") {
    return existingReason?.trim() || null;
  }

  return null;
}

async function loadCategoryOrRedirect(categoryId: string) {
  const category = await prisma.dynamicCategory.findUnique({
    where: { id: categoryId },
    select: { id: true, name: true },
  });

  if (!category) {
    redirectWithNotice({
      notice: "Categoria nao encontrada.",
    });
  }

  return category;
}

export async function saveDiscoveryCategoryConfig(formData: FormData) {
  const categoryId = parseString(formData, "categoryId");
  if (!categoryId) {
    redirectWithNotice({
      notice: "Selecione uma categoria antes de salvar a configuracao.",
    });
  }

  await loadCategoryOrRedirect(categoryId);

  const existingConfig = await prisma.dynamicDiscoveryCategoryConfig.findUnique({
    where: { categoryId },
  });

  const searchTerms = parseListFromFormData(formData, "searchTerms");
  const seedBrands = parseListFromFormData(formData, "seedBrands");
  const mode = normalizeMode(
    parseString(formData, "mode", existingConfig?.mode ?? "individual"),
    existingConfig?.mode === "multi_brand" ? "multi_brand" : "individual"
  );
  const defaultSortBy = normalizeSortBy(
    parseString(formData, "defaultSortBy", existingConfig?.defaultSortBy ?? "featured"),
    "featured"
  );
  const autoMaxPages = parseBoolean(formData, "autoMaxPages", existingConfig?.autoMaxPages ?? true);
  const maxPages = parseInteger(formData, "maxPages", existingConfig?.maxPages ?? 2, 1, 10);
  const autoMaxItemsPerQuery = parseBoolean(
    formData,
    "autoMaxItemsPerQuery",
    existingConfig?.autoMaxItemsPerQuery ?? true
  );
  const maxItemsPerQuery = parseInteger(
    formData,
    "maxItemsPerQuery",
    existingConfig?.maxItemsPerQuery ?? 30,
    1,
    100
  );

  await prisma.dynamicDiscoveryCategoryConfig.upsert({
    where: { categoryId },
    create: {
      categoryId,
      mode,
      primeOnlyDefault: parseBoolean(
        formData,
        "primeOnlyDefault",
        existingConfig?.primeOnlyDefault ?? false
      ),
      ignoreInternationalDefault: parseBoolean(
        formData,
        "ignoreInternationalDefault",
        existingConfig?.ignoreInternationalDefault ?? true
      ),
      broadDiscoveryDefault: parseBoolean(
        formData,
        "broadDiscoveryDefault",
        existingConfig?.broadDiscoveryDefault ?? false
      ),
      defaultSortBy,
      autoMaxPages,
      maxPages,
      autoMaxItemsPerQuery,
      maxItemsPerQuery,
      searchTerms,
      seedBrands,
    },
    update: {
      mode,
      primeOnlyDefault: parseBoolean(
        formData,
        "primeOnlyDefault",
        existingConfig?.primeOnlyDefault ?? false
      ),
      ignoreInternationalDefault: parseBoolean(
        formData,
        "ignoreInternationalDefault",
        existingConfig?.ignoreInternationalDefault ?? true
      ),
      broadDiscoveryDefault: parseBoolean(
        formData,
        "broadDiscoveryDefault",
        existingConfig?.broadDiscoveryDefault ?? false
      ),
      defaultSortBy,
      autoMaxPages,
      maxPages,
      autoMaxItemsPerQuery,
      maxItemsPerQuery,
      searchTerms,
      seedBrands,
    },
  });

  if (seedBrands.length > 0) {
    await prisma.dynamicDiscoveryBrandStatus.createMany({
      data: seedBrands.map((brandName) => ({
        categoryId,
        brandName,
        status: "pending",
        relevanceScore: 0,
        timesDetected: 1,
        firstSeenAt: new Date(),
        lastSeenAt: new Date(),
      })),
      skipDuplicates: true,
    });
  }

  finishDiscoveryFlow(categoryId, "Configuracao salva com sucesso.");
}

export async function syncDiscoveryBrandsFromCatalog(formData: FormData) {
  const categoryId = parseString(formData, "categoryId");
  if (!categoryId) {
    redirectWithNotice({
      notice: "Selecione uma categoria antes de buscar marcas do banco.",
    });
  }

  await loadCategoryOrRedirect(categoryId);

  const [catalogProducts, discoveryDecisions, existingBrands] = await Promise.all([
    prisma.dynamicProduct.findMany({
      where: { categoryId },
      select: { attributes: true },
    }),
    prisma.dynamicCategoryAsinDecision.findMany({
      where: {
        categoryId,
        brand: { not: null },
      },
      select: { brand: true },
    }),
    prisma.dynamicDiscoveryBrandStatus.findMany({
      where: { categoryId },
      select: { brandName: true, status: true, relevanceScore: true, timesDetected: true, firstSeenAt: true },
    }),
  ]);

  const discoveredBrands = new Map<string, number>();

  for (const product of catalogProducts) {
    const brandName = extractProductBrand(product.attributes);
    if (!brandName) continue;
    discoveredBrands.set(brandName, (discoveredBrands.get(brandName) ?? 0) + 1);
  }

  for (const decision of discoveryDecisions) {
    const brandName = normalizeBrandName(decision.brand);
    if (!brandName) continue;
    discoveredBrands.set(brandName, (discoveredBrands.get(brandName) ?? 0) + 1);
  }

  if (discoveredBrands.size === 0) {
    redirectWithNotice({
      categoryId,
      notice: "Nenhuma marca foi encontrada no banco para esta categoria.",
    });
  }

  const existingMap = new Map(existingBrands.map((row) => [row.brandName, row]));
  let createdCount = 0;
  let promotedCount = 0;

  for (const [brandName, detectedCount] of discoveredBrands.entries()) {
    const current = existingMap.get(brandName);
    const isRejected = current?.status === "rejected";
    const nextStatus = isRejected ? "rejected" : "approved";
    const nextTimesDetected = Math.max(current?.timesDetected ?? 0, detectedCount);
    const nextRelevanceScore = Math.max(current?.relevanceScore ?? 0, detectedCount * 10);
    const firstSeenAt = current?.firstSeenAt ?? new Date();

    if (!current) {
      createdCount += 1;
    } else if (current.status !== nextStatus) {
      promotedCount += 1;
    }

    await prisma.dynamicDiscoveryBrandStatus.upsert({
      where: {
        categoryId_brandName: {
          categoryId,
          brandName,
        },
      },
      create: {
        categoryId,
        brandName,
        status: nextStatus,
        relevanceScore: nextRelevanceScore,
        timesDetected: nextTimesDetected,
        firstSeenAt,
        lastSeenAt: new Date(),
      },
      update: {
        status: nextStatus,
        relevanceScore: nextRelevanceScore,
        timesDetected: nextTimesDetected,
        lastSeenAt: new Date(),
      },
    });
  }

  finishDiscoveryFlow(
    categoryId,
    `Marcas sincronizadas do banco: ${discoveredBrands.size} encontradas, ${createdCount} novas${promotedCount > 0 ? `, ${promotedCount} promovidas` : ""}.`
  );
}

export async function runDiscoveryForCategory(formData: FormData) {
  const categoryId = parseString(formData, "categoryId");
  if (!categoryId) {
    redirectWithNotice({
      notice: "Selecione uma categoria antes de executar a descoberta.",
    });
  }

  const category = await loadCategoryOrRedirect(categoryId);
  const existingConfig = await prisma.dynamicDiscoveryCategoryConfig.findUnique({
    where: { categoryId },
  });

  const formSearchTerms = parseListFromFormData(formData, "searchTerms");
  const formSeedBrands = parseListFromFormData(formData, "seedBrands");
  const searchTerms =
    formSearchTerms.length > 0 ? formSearchTerms : existingConfig?.searchTerms ?? [];
  const seedBrands =
    formSeedBrands.length > 0 ? formSeedBrands : existingConfig?.seedBrands ?? [];

  if (searchTerms.length === 0) {
    redirectWithNotice({
      categoryId,
      notice: "Adicione ao menos um search term para executar a descoberta.",
    });
  }

  const mode = normalizeMode(
    parseString(formData, "mode", existingConfig?.mode ?? "individual"),
    existingConfig?.mode === "multi_brand" ? "multi_brand" : "individual"
  );
  const multiBrand = mode === "multi_brand";
  const primeOnly = parseBoolean(
    formData,
    "primeOnlyDefault",
    existingConfig?.primeOnlyDefault ?? false
  );
  const ignoreInternational = parseBoolean(
    formData,
    "ignoreInternationalDefault",
    existingConfig?.ignoreInternationalDefault ?? true
  );
  const broadDiscovery = parseBoolean(
    formData,
    "broadDiscoveryDefault",
    existingConfig?.broadDiscoveryDefault ?? false
  );
  const defaultSortBy = normalizeSortBy(
    parseString(formData, "defaultSortBy", existingConfig?.defaultSortBy ?? "featured"),
    "featured"
  );
  const sortModes = parseSortModes(formData, defaultSortBy);
  const autoMaxPages = parseBoolean(formData, "autoMaxPages", existingConfig?.autoMaxPages ?? true);
  const maxPages = parseInteger(formData, "maxPages", existingConfig?.maxPages ?? 2, 1, 10);
  const autoMaxItemsPerQuery = parseBoolean(
    formData,
    "autoMaxItemsPerQuery",
    existingConfig?.autoMaxItemsPerQuery ?? true
  );
  const maxItemsPerQuery = parseInteger(
    formData,
    "maxItemsPerQuery",
    existingConfig?.maxItemsPerQuery ?? 30,
    1,
    100
  );

  const knownBrands = await prisma.dynamicDiscoveryBrandStatus.findMany({
    where: {
      categoryId,
      status: { not: "rejected" },
    },
    select: { brandName: true },
  });

  const totalQueriesEstimate = searchTerms.reduce((sum, _term) => sum + sortModes.length * (autoMaxPages ? 10 : maxPages), 0);
  const run = await prisma.dynamicDiscoveryRun.create({
    data: {
      categoryId,
      mode,
      primeOnly,
      ignoreInternational,
      multiBrand,
      broadDiscovery,
      sortBy: sortModes,
      searchTerms,
      seedBrands,
      status: "running",
      queryCount: 0,
      asinCount: 0,
      newCount: 0,
      existingCount: 0,
      pendingCount: 0,
      rejectedCount: 0,
      approvedCount: 0,
      exportAsins: [],
      previewSummary: {
        progress: {
          phase: "searching",
          completedQueries: 0,
          totalQueries: totalQueriesEstimate,
          currentQuery: "Preparando descoberta",
          currentPage: 0,
          currentUrl: "",
          currentCards: 0,
          currentAsins: 0,
          renderer: "browser",
        },
        counts: {
          discovered: 0,
          existing: 0,
          rejected: 0,
          approved: 0,
          pendingReview: 0,
        },
      },
    },
  });

  const updateProgress = async (progress: AmazonDiscoveryProgress) => {
    await prisma.dynamicDiscoveryRun.update({
      where: { id: run.id },
      data: {
        status: "running",
        queryCount: progress.completedQueries,
        asinCount: progress.currentAsins,
        previewSummary: {
          progress,
        },
      },
    });
  };

  try {
    const discovery = await runAmazonDiscoveryPlan({
      searchTerms,
      brands: seedBrands,
      mode,
      broadDiscovery,
      primeOnly,
      ignoreInternational,
      sortModes,
      autoMaxPages,
      maxPages,
      autoMaxItemsPerQuery,
      maxItemsPerQuery,
      knownBrands: knownBrands.map((brand) => brand.brandName),
      onProgress: updateProgress,
    });

    const aggregatedHits = discovery.aggregated;
    const discoveredAsins = aggregatedHits.map((hit) => hit.asin);
    const siteCatalogProducts = discoveredAsins.length
      ? await prisma.dynamicProduct.findMany({
          where: { asin: { in: discoveredAsins } },
          select: { asin: true },
        })
      : [];
    const siteCatalogAsins = new Set(siteCatalogProducts.map((product) => product.asin));

    const existingProductRows = discoveredAsins.length
      ? await prisma.dynamicDiscoveryProductStatus.findMany({
          where: { categoryId, asin: { in: discoveredAsins } },
        })
      : [];
    const existingProductMap = new Map(existingProductRows.map((row) => [row.asin, row]));

    const brandAggregateMap = new Map<
      string,
      {
        timesDetected: number;
        bestScore: number;
        queries: Set<string>;
        sources: Set<string>;
      }
    >();

    for (const hit of aggregatedHits) {
      if (!hit.brandGuess) continue;
      const current = brandAggregateMap.get(hit.brandGuess) ?? {
        timesDetected: 0,
        bestScore: 0,
        queries: new Set<string>(),
        sources: new Set<string>(),
      };

      current.timesDetected += hit.timesDetected;
      current.bestScore = Math.max(current.bestScore, hit.relevanceScore);
      hit.queries.forEach((query) => current.queries.add(query));
      hit.sources.forEach((source) => current.sources.add(source));
      brandAggregateMap.set(hit.brandGuess, current);
    }

    const pendingSeedBrandRows = seedBrands.filter((brandName) => {
      const current = knownBrands.find((row) => row.brandName === brandName);
      return !current;
    });

    if (pendingSeedBrandRows.length > 0) {
      await prisma.dynamicDiscoveryBrandStatus.createMany({
        data: pendingSeedBrandRows.map((brandName) => ({
          categoryId,
          brandName,
          status: "pending",
          relevanceScore: 0,
          timesDetected: 1,
          firstSeenAt: new Date(),
          lastSeenAt: new Date(),
        })),
        skipDuplicates: true,
      });
    }

    for (const [brandName, aggregate] of brandAggregateMap.entries()) {
      await prisma.dynamicDiscoveryBrandStatus.upsert({
        where: {
          categoryId_brandName: {
            categoryId,
            brandName,
          },
        },
        create: {
          categoryId,
          brandName,
          status: "pending",
          relevanceScore: aggregate.bestScore,
          timesDetected: aggregate.timesDetected,
          firstSeenAt: new Date(),
          lastSeenAt: new Date(),
        },
        update: {
          relevanceScore: aggregate.bestScore,
          timesDetected: { increment: aggregate.timesDetected },
          lastSeenAt: new Date(),
        },
      });
    }

    const runPreview = {
      queryStats: discovery.queryStats,
      counts: {
        discovered: 0,
        existing: 0,
        rejected: 0,
        approved: 0,
        pendingReview: 0,
      },
    };

    const upserts = aggregatedHits.map((hit) => {
    const currentRow = existingProductMap.get(hit.asin);
    const storedStatus = currentRow?.status ?? null;
    const resolvedStatus = resolveProductStatus(storedStatus, siteCatalogAsins.has(hit.asin));
    const nextTimesDetected = (currentRow?.timesDetected ?? 0) + hit.timesDetected;
    const nextQueriesDetected = mergeUniqueStrings(currentRow?.queriesDetected, hit.queries);
    const nextSources = mergeUniqueStrings(currentRow?.sources, hit.sources);
    const nextReason = buildReasonFromStatus(resolvedStatus, currentRow?.reason ?? null);
    const nextScore = Math.max(
      currentRow?.relevanceScore ?? 0,
      scorePersistedProduct({
        aggregate: hit,
        previousTimesDetected: currentRow?.timesDetected ?? 0,
      })
    );

    if (resolvedStatus === "existing") {
      runPreview.counts.existing += 1;
    } else if (resolvedStatus === "rejected") {
      runPreview.counts.rejected += 1;
    } else if (resolvedStatus === "approved") {
      runPreview.counts.approved += 1;
    } else {
      runPreview.counts.pendingReview += 1;
    }

    return prisma.dynamicDiscoveryProductStatus.upsert({
      where: {
        categoryId_asin: {
          categoryId,
          asin: hit.asin,
        },
      },
        create: {
          categoryId,
          asin: hit.asin,
          title: hit.title,
          status: resolvedStatus,
          catalogState: siteCatalogAsins.has(hit.asin) ? "existing" : "new",
        reason: nextReason,
        source: hit.sources[0] ?? "relevance",
        query: hit.queries[0] ?? hit.asin,
        brandName: hit.brandGuess,
        ratingAverage: hit.ratingAverage,
        reviewCount: hit.reviewCount,
        searchPosition: hit.position,
        sponsored: hit.sponsored,
        isPrime: hit.isPrime,
        isInternational: hit.isInternational,
        timesDetected: hit.timesDetected,
        relevanceScore: nextScore,
        queriesDetected: hit.queries,
        sources: hit.sources,
        firstSeenAt: new Date(),
        lastSeenAt: new Date(),
      },
        update: {
        title: hit.title ?? currentRow?.title ?? null,
        status: resolvedStatus,
        catalogState: siteCatalogAsins.has(hit.asin) ? "existing" : "new",
        reason: nextReason,
        source: hit.sources[0] ?? currentRow?.source ?? "relevance",
        query: hit.queries[0] ?? currentRow?.query ?? hit.asin,
        brandName: hit.brandGuess ?? currentRow?.brandName ?? null,
        ratingAverage: hit.ratingAverage ?? currentRow?.ratingAverage ?? null,
        reviewCount: hit.reviewCount ?? currentRow?.reviewCount ?? null,
        searchPosition: hit.position ?? currentRow?.searchPosition ?? null,
        sponsored: currentRow?.sponsored || hit.sponsored,
        isPrime: currentRow?.isPrime || hit.isPrime,
        isInternational: currentRow?.isInternational || hit.isInternational,
        timesDetected: nextTimesDetected,
        relevanceScore: nextScore,
        queriesDetected: nextQueriesDetected,
        sources: nextSources,
        lastSeenAt: new Date(),
      },
    });
  });

    await Promise.all(upserts);
    runPreview.counts.discovered = aggregatedHits.length;

    const approvedRows = await prisma.dynamicDiscoveryProductStatus.findMany({
    where: {
      categoryId,
      status: "approved",
    },
    orderBy: [{ relevanceScore: "desc" }, { lastSeenAt: "desc" }],
    select: { asin: true },
  });

    const finalRows = await prisma.dynamicDiscoveryProductStatus.findMany({
    where: { categoryId },
    orderBy: [{ relevanceScore: "desc" }, { lastSeenAt: "desc" }],
    select: { status: true },
  });

    const finalCounts = finalRows.reduce(
    (acc, row) => {
      if (row.status === "approved") acc.approved += 1;
      else if (row.status === "rejected") acc.rejected += 1;
      else if (row.status === "existing") acc.existing += 1;
      else acc.pendingReview += 1;
      return acc;
    },
    { approved: 0, rejected: 0, existing: 0, pendingReview: 0 }
  );

    await prisma.dynamicDiscoveryRun.update({
      where: { id: run.id },
      data: {
        status: "done",
        queryCount: discovery.queryStats.length,
        asinCount: aggregatedHits.length,
        newCount: runPreview.counts.pendingReview,
        existingCount: runPreview.counts.existing,
        pendingCount: runPreview.counts.pendingReview,
        rejectedCount: runPreview.counts.rejected,
        approvedCount: runPreview.counts.approved,
        exportAsins: approvedRows.map((row) => row.asin),
        previewSummary: {
          ...runPreview,
          finalCounts,
          approvedAsins: approvedRows.map((row) => row.asin),
          queries: discovery.queryStats,
          progress: {
            phase: "finalizing",
            completedQueries: discovery.queryStats.length,
            totalQueries: discovery.queryStats.length,
            currentQuery: "Concluído",
            currentPage: 0,
            currentUrl: "",
            currentCards: 0,
            currentAsins: 0,
            renderer: "browser",
          },
        },
      },
    });

    revalidatePath(DISCOVERY_PATH);
    redirectWithNotice({
      categoryId,
      notice: `Descoberta concluida com ${discovery.queryStats.length} queries e ${approvedRows.length} ASINs aprovados.`,
    });
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    await prisma.dynamicDiscoveryRun.update({
      where: { id: run.id },
      data: {
        status: "error",
        previewSummary: {
          progress: {
            phase: "finalizing",
            completedQueries: 0,
            totalQueries: totalQueriesEstimate,
            currentQuery: "Erro na execução",
            currentPage: 0,
            currentUrl: "",
            currentCards: 0,
            currentAsins: 0,
            renderer: "browser",
          },
        },
      },
    });
    throw error;
  }
}

export async function updateDiscoveryProductStatus(formData: FormData) {
  const categoryId = parseString(formData, "categoryId");
  if (!categoryId) {
    redirectWithNotice({
      notice: "Selecione uma categoria antes de atualizar um produto.",
    });
  }

  await loadCategoryOrRedirect(categoryId);

  const asinValues = normalizeList([
    ...parseListFromFormData(formData, "asin"),
    parseString(formData, "asin"),
  ]);
  if (asinValues.length === 0) {
    redirectWithNotice({
      categoryId,
      notice: "Nenhum ASIN foi informado para atualizar.",
    });
  }

  const status =
    normalizeDiscoveryProductStatus(parseString(formData, "status", "pending_review")) ??
    "pending_review";

  const reason = parseString(formData, "reason");
  const currentRows = await prisma.dynamicDiscoveryProductStatus.findMany({
    where: { categoryId, asin: { in: asinValues } },
  });
  const currentMap = new Map(currentRows.map((row) => [row.asin, row]));

  await Promise.all(
    asinValues.map((asin) => {
      const current = currentMap.get(asin);
      const nextStatus = status;
      const nextReason = buildReasonFromStatus(nextStatus, reason || current?.reason || null);
      const nextTimesDetected = current?.timesDetected ?? 0;
      const nextScore = current?.relevanceScore ?? 0;

      return prisma.dynamicDiscoveryProductStatus.upsert({
        where: {
          categoryId_asin: {
            categoryId,
            asin,
          },
        },
        create: {
          categoryId,
          asin,
          status: nextStatus,
            catalogState: current?.catalogState ?? "new",
            title: current?.title ?? null,
            reason: nextReason,
          source: current?.source ?? "manual",
          query: current?.query ?? asin,
          brandName: current?.brandName ?? null,
          ratingAverage: current?.ratingAverage ?? null,
          reviewCount: current?.reviewCount ?? null,
          searchPosition: current?.searchPosition ?? null,
          sponsored: current?.sponsored ?? false,
          isPrime: current?.isPrime ?? false,
          isInternational: current?.isInternational ?? false,
          timesDetected: nextTimesDetected,
          relevanceScore: nextScore,
          queriesDetected: current?.queriesDetected ?? [],
          sources: current?.sources ?? [],
          firstSeenAt: current?.firstSeenAt ?? new Date(),
          lastSeenAt: new Date(),
        },
        update: {
          status: nextStatus,
            catalogState: current?.catalogState ?? "new",
            title: current?.title ?? null,
            reason: nextReason,
          source: current?.source ?? "manual",
          query: current?.query ?? asin,
          brandName: current?.brandName ?? null,
          ratingAverage: current?.ratingAverage ?? null,
          reviewCount: current?.reviewCount ?? null,
          searchPosition: current?.searchPosition ?? null,
          sponsored: current?.sponsored ?? false,
          isPrime: current?.isPrime ?? false,
          isInternational: current?.isInternational ?? false,
          timesDetected: nextTimesDetected,
          relevanceScore: nextScore,
          queriesDetected: current?.queriesDetected ?? [],
          sources: current?.sources ?? [],
          lastSeenAt: new Date(),
        },
      });
    })
  );

  finishDiscoveryFlow(categoryId, "Status atualizado com sucesso.");
}

export async function clearDiscoveryPendingProducts(formData: FormData) {
  const categoryId = parseString(formData, "categoryId");
  if (!categoryId) {
    redirectWithNotice({
      notice: "Selecione uma categoria antes de limpar a fila pendente.",
    });
  }

  await loadCategoryOrRedirect(categoryId);

  const deleted = await prisma.dynamicDiscoveryProductStatus.deleteMany({
    where: {
      categoryId,
      status: {
        in: ["pending_review", "pending"],
      },
    },
  });

  finishDiscoveryFlow(categoryId, `Fila pendente limpa (${deleted.count} item(ns) removido(s)).`);
}

export async function updateDiscoveryBrandStatus(formData: FormData) {
  const categoryId = parseString(formData, "categoryId");
  if (!categoryId) {
    redirectWithNotice({
      notice: "Selecione uma categoria antes de atualizar uma marca.",
    });
  }

  await loadCategoryOrRedirect(categoryId);

  const brandName = parseString(formData, "brandName");
  if (!brandName) {
    redirectWithNotice({
      categoryId,
      notice: "Informe o nome da marca.",
    });
  }

  const status = parseString(formData, "status", "pending");
  const normalizedStatus: DiscoveryBrandStatus =
    status === "approved" || status === "rejected" ? status : "pending";

  const current = await prisma.dynamicDiscoveryBrandStatus.findUnique({
    where: {
      categoryId_brandName: {
        categoryId,
        brandName,
      },
    },
  });

  await prisma.dynamicDiscoveryBrandStatus.upsert({
    where: {
      categoryId_brandName: {
        categoryId,
        brandName,
      },
    },
    create: {
      categoryId,
      brandName,
      status: normalizedStatus,
      relevanceScore: current?.relevanceScore ?? 0,
      timesDetected: current?.timesDetected ?? 1,
      firstSeenAt: current?.firstSeenAt ?? new Date(),
      lastSeenAt: new Date(),
    },
    update: {
      status: normalizedStatus,
      lastSeenAt: new Date(),
    },
  });

  finishDiscoveryFlow(categoryId, "Marca atualizada com sucesso.");
}
