'use server';

import { createHash } from 'crypto';
import fs from 'fs';
import path from 'path';
import { enrichDynamicAttributesForCategory } from '@/lib/dynamicCategoryMetrics';
import { prisma } from '@/lib/prisma';
import {
  getAmazonItemAffiliateUrl,
  getAmazonItemMerchantName,
  getAmazonItemPrice,
  getAmazonItemProgramAndSavePrice,
  getAmazonItems,
  getAmazonItemsRaw,
  searchAmazonItems as searchAmazonCatalogItems,
  type AmazonItem,
  type AmazonSearchPriceRange,
} from '@/lib/amazonApiClient';
import { getDynamicVisibilityBoolean } from '@/lib/dynamicVisibility';
import { Prisma } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { revalidateDynamicCatalogCategoryRefs } from '@/lib/dynamicCatalogRevalidation';
import { dedupeDynamicCatalogCategoryRefs, type DynamicCatalogCategoryRef } from '@/lib/dynamicCatalogCache';

/* ======================
ENV
====================== */

const AMAZON_PARTNER_TAG = process.env.AMAZON_PARTNER_TAG!;
const IMPORT_DEFAULT_VISIBILITY = 'pending' as const;

type PriceResult = {
  price: number;
  programAndSavePrice: number | null;
  merchantName: string;
  item?: AmazonItem;
};

type ImportFilters = {
  requiredTitleRaw?: string;
  forbiddenTitleRaw?: string;
  enableImportValidation?: boolean;
  saveRawData?: boolean;
  autoFillAttributes?: boolean;
};

type ImportFilterMatchResult =
  | { ok: true }
  | {
      ok: false;
      reason: string;
      reasonCode?:
        | 'TITLE_REQUIRED_MISMATCH'
        | 'TITLE_FORBIDDEN_MATCH';
    };

type ImportDiscoveryContextItem = {
  asin: string;
  title: string;
  brand: string;
  imageUrl?: string;
  price?: number | null;
  displayPrice?: string;
};

type AsinDecisionStatus = 'imported' | 'rejected_soft' | 'rejected_hard' | 'discovered';

type ImportRunState = {
  id: string;
  status: string;
  totalItems: number;
  processedItems: number;
  importedItems: number;
  skippedItems: number;
  errorItems: number;
  cancelRequested: boolean;
  logs: string[];
  categoryId: string;
  filters: ImportFilters | null;
  startedAt: Date;
  finishedAt: Date | null;
};

type DiscoveryItem = {
  asin: string;
  title: string;
  brand: string;
  imageUrl: string;
  price: number | null;
  displayPrice: string;
};

type DiscoveryRunState = {
  id: string;
  status: string;
  totalSearches: number;
  processedSearches: number;
  foundItems: number;
  cancelRequested: boolean;
  inputs: {
    keywordsRaw?: string;
    brandsRaw?: string;
    maxPages?: number;
    priceRangesRaw?: string;
  } | null;
  items: DiscoveryItem[];
  logs: string[];
  startedAt: Date;
  finishedAt: Date | null;
};

type ImportRunProgressState = {
  id: string;
  status: string;
  totalItems: number;
  processedItems: number;
  importedItems: number;
  skippedItems: number;
  errorItems: number;
  cancelRequested: boolean;
};

type DiscoveryRunProgressState = {
  id: string;
  status: string;
  totalSearches: number;
  processedSearches: number;
  foundItems: number;
  cancelRequested: boolean;
};

const MAX_IMPORT_LOG_ENTRIES = 400;
const MAX_DISCOVERY_LOG_ENTRIES = 400;

type SearchPriceRange = AmazonSearchPriceRange;

type DiscoverySearchTask = {
  keyword: string;
  brandFilter: string;
  range: SearchPriceRange | null;
  depth: number;
};

const DISCOVERY_PRICE_RANGES: SearchPriceRange[] = [
  { min: 1, max: 15, label: "R$1-15" },
  { min: 16, max: 30, label: "R$16-30" },
  { min: 31, max: 50, label: "R$31-50" },
  { min: 51, max: 80, label: "R$51-80" },
  { min: 81, max: 120, label: "R$81-120" },
  { min: 121, max: 200, label: "R$121-200" },
  { min: 201, max: 400, label: "R$201-400" },
];

function parseDiscoveryPriceRanges(value?: string): SearchPriceRange[] {
  const raw = (value ?? "").trim();
  if (!raw) {
    return DISCOVERY_PRICE_RANGES;
  }

  const parts = raw
    .split(/[,\n;]+/)
    .map((item) => item.trim())
    .filter(Boolean);

  const parsedRanges = parts
    .map((part) => {
      const normalized = part
        .toLowerCase()
        .replace(/r\$/g, "")
        .replace(/\s+/g, "")
        .replace(/ate/g, "-")
        .replace(/a/g, "-");

      const match = normalized.match(/^(\d+(?:[.,]\d+)?)\-(\d+(?:[.,]\d+)?)$/);
      if (!match) return null;

      const min = Number(match[1].replace(",", "."));
      const max = Number(match[2].replace(",", "."));

      if (!Number.isFinite(min) || !Number.isFinite(max) || min <= 0 || max <= min) {
        return null;
      }

      return {
        min: Math.round(min),
        max: Math.round(max),
        label: `R$${Math.round(min)}-${Math.round(max)}`,
      } satisfies SearchPriceRange;
    })
    .filter((range): range is SearchPriceRange => range !== null);

  return parsedRanges.length > 0 ? parsedRanges : DISCOVERY_PRICE_RANGES;
}

function formatDiscoveryRangeLabel(range: SearchPriceRange | null) {
  return range ? range.label : "sem faixa";
}

function splitDiscoveryRangeByMedian(
  range: SearchPriceRange | null,
  observedPrices: number[]
): SearchPriceRange[] {
  const validPrices = observedPrices
    .filter((price) => Number.isFinite(price) && price > 0)
    .sort((a, b) => a - b);

  if (validPrices.length < 2) {
    return [];
  }

  const safeMin = Math.floor(validPrices[0]);
  const safeMax = Math.ceil(validPrices[validPrices.length - 1]);

  const midIndex = Math.floor(validPrices.length / 2);
  const medianSource =
    validPrices.length % 2 === 0
      ? (validPrices[midIndex - 1] + validPrices[midIndex]) / 2
      : validPrices[midIndex];
  const median = Math.floor(medianSource);

  if (!Number.isFinite(safeMin) || !Number.isFinite(safeMax) || safeMax - safeMin < 10) {
    return [];
  }

  if (!Number.isFinite(median) || median <= safeMin || median >= safeMax) {
    return [];
  }

  const left: SearchPriceRange = {
    min: safeMin,
    max: median,
    label: `R$${safeMin}-${median}`,
  };
  const right: SearchPriceRange = {
    min: median + 1,
    max: safeMax,
    label: `R$${median + 1}-${safeMax}`,
  };

  if (range) {
    left.min = Math.max(left.min, range.min);
    left.max = Math.min(left.max, range.max);
    right.min = Math.max(right.min, range.min);
    right.max = Math.min(right.max, range.max);
    left.label = `R$${left.min}-${left.max}`;
    right.label = `R$${right.min}-${right.max}`;
  }

  return [left, right].filter((item) => item.max - item.min >= 5);
}

function splitDiscoveryRangeByQuantilesCore(
  range: SearchPriceRange | null,
  observedPrices: number[]
): { ranges: SearchPriceRange[]; bucketSummary: string[] } {
  const validPrices = observedPrices
    .filter((price) => Number.isFinite(price) && price > 0)
    .sort((a, b) => a - b);

  if (validPrices.length < 2) {
    return { ranges: [], bucketSummary: [] };
  }

  const safeMin = Math.max(1, Math.floor(range?.min ?? validPrices[0]));
  const safeMax = Math.ceil(range?.max ?? validPrices[validPrices.length - 1]);
  const span = safeMax - safeMin;

  if (!Number.isFinite(safeMin) || !Number.isFinite(safeMax) || span < 10) {
    return { ranges: [], bucketSummary: [] };
  }

  const targetItemsPerRange = 25;
  const desiredRangeCount = Math.max(
    2,
    Math.min(5, Math.ceil(validPrices.length / targetItemsPerRange))
  );

  const boundaries = new Set<number>();
  boundaries.add(safeMin);

  for (let i = 1; i < desiredRangeCount; i++) {
    const rawIndex = Math.floor((validPrices.length * i) / desiredRangeCount);
    const clampedIndex = Math.min(validPrices.length - 1, Math.max(0, rawIndex));
    const boundary = Math.floor(validPrices[clampedIndex]);

    if (boundary > safeMin && boundary < safeMax) {
      boundaries.add(boundary);
    }
  }

  const sortedBoundaries = [...boundaries].sort((a, b) => a - b);
  const ranges: SearchPriceRange[] = [];
  let currentMin = safeMin;

  for (let index = 1; index < sortedBoundaries.length; index++) {
    const currentBoundary = sortedBoundaries[index];
    const currentMax = currentBoundary - 1;

    if (currentMax - currentMin >= 5) {
      ranges.push({
        min: currentMin,
        max: currentMax,
        label: `R$${currentMin}-${currentMax}`,
      });
    }

    currentMin = currentBoundary;
  }

  if (safeMax - currentMin >= 5) {
    ranges.push({
      min: currentMin,
      max: safeMax,
      label: `R$${currentMin}-${safeMax}`,
    });
  }

  const bucketSummary = ranges.map((bucket) => {
    const count = validPrices.filter(
      (price) => price >= bucket.min && price <= bucket.max
    ).length;
    return `${bucket.label} (${count})`;
  });

  if (ranges.length > 1) {
    return { ranges, bucketSummary };
  }

  return {
    ranges: splitDiscoveryRangeByMedian(range, validPrices),
    bucketSummary,
  };
}

function getPercentileValue(sortedValues: number[], percentile: number) {
  if (sortedValues.length === 0) return null;
  const index = Math.min(
    sortedValues.length - 1,
    Math.max(0, Math.floor((sortedValues.length - 1) * percentile))
  );
  return sortedValues[index] ?? null;
}

function chooseNicePriceStep(rawStep: number) {
  if (rawStep <= 25) return 25;
  if (rawStep <= 50) return 50;
  if (rawStep <= 150) return 100;
  if (rawStep <= 225) return 200;
  if (rawStep <= 300) return 250;
  if (rawStep <= 500) return 500;
  return Math.ceil(rawStep / 500) * 500;
}

function splitDiscoveryRangeByAdaptiveBands(
  range: SearchPriceRange | null,
  observedPrices: number[]
): { ranges: SearchPriceRange[]; bucketSummary: string[] } {
  const validPrices = observedPrices
    .filter((price) => Number.isFinite(price) && price > 0)
    .sort((a, b) => a - b);

  if (validPrices.length < 2) {
    return { ranges: [], bucketSummary: [] };
  }

  const safeMin = Math.max(1, Math.floor(range?.min ?? validPrices[0]));
  const safeMax = Math.ceil(range?.max ?? validPrices[validPrices.length - 1]);
  const span = safeMax - safeMin;

  if (!Number.isFinite(safeMin) || !Number.isFinite(safeMax) || span < 10) {
    return { ranges: [], bucketSummary: [] };
  }

  const q1 = getPercentileValue(validPrices, 0.25);
  const q3 = getPercentileValue(validPrices, 0.75);
  const p85 = getPercentileValue(validPrices, 0.85);

  if (!q1 || !q3 || !p85) {
    return splitDiscoveryRangeByQuantilesCore(range, validPrices);
  }

  const iqr = Math.max(1, q3 - q1);
  const denseUpperBase = Math.min(
    safeMax,
    Math.ceil(Math.max(p85, q3 + iqr * 0.5))
  );

  const hasHeavyTail = safeMax > denseUpperBase + Math.max(100, iqr * 0.8);
  if (!hasHeavyTail) {
    return splitDiscoveryRangeByQuantilesCore(range, validPrices);
  }

  const denseZoneSpan = Math.max(1, denseUpperBase - safeMin);
  const denseStep =
    validPrices.length >= 80 && denseZoneSpan <= 700
      ? 100
      : chooseNicePriceStep(
          Math.max(
            50,
            denseZoneSpan /
              Math.max(4, Math.min(6, Math.ceil(validPrices.length / 20)))
          )
        );

  const alignedDenseUpper = range
    ? Math.min(safeMax, Math.ceil(denseUpperBase / denseStep) * denseStep)
    : Math.min(safeMax, Math.ceil(denseUpperBase / denseStep) * denseStep);

  const startMin = range
    ? safeMin
    : Math.max(1, Math.floor((safeMin - 1) / denseStep) * denseStep + 1);

  const ranges: SearchPriceRange[] = [];
  let currentMin = startMin;

  while (currentMin <= alignedDenseUpper) {
    const currentMax = Math.min(alignedDenseUpper, currentMin + denseStep - 1);
    if (currentMax - currentMin >= 5) {
      ranges.push({
        min: currentMin,
        max: currentMax,
        label: `R$${currentMin}-${currentMax}`,
      });
    }
    currentMin = currentMax + 1;
  }

  if (safeMax > alignedDenseUpper && safeMax - (alignedDenseUpper + 1) >= 5) {
    ranges.push({
      min: alignedDenseUpper + 1,
      max: safeMax,
      label: `R$${alignedDenseUpper + 1}-${safeMax}`,
    });
  }

  const bucketSummary = ranges.map((bucket) => {
    const count = validPrices.filter(
      (price) => price >= bucket.min && price <= bucket.max
    ).length;
    return `${bucket.label} (${count})`;
  });

  if (ranges.length > 1) {
    return { ranges, bucketSummary };
  }

  return splitDiscoveryRangeByQuantilesCore(range, validPrices);
}

function parseFilterList(value?: string): string[] {
  return (value ?? "")
    .split(/[,\n;]+/)
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

function buildImportPolicyHash(filters: ImportFilters) {
  const payload = {
    requiredTitleRaw: filters.requiredTitleRaw?.trim().toLowerCase() ?? "",
    forbiddenTitleRaw: filters.forbiddenTitleRaw?.trim().toLowerCase() ?? "",
    enableImportValidation: filters.enableImportValidation !== false,
    version: 1,
  };

  return createHash("sha1").update(JSON.stringify(payload)).digest("hex");
}

async function upsertCategoryAsinDecision(params: {
  categoryId: string;
  asin: string;
  status: AsinDecisionStatus;
  reasonCode?: string | null;
  reasonText?: string | null;
  policyHash?: string | null;
  title?: string | null;
  brand?: string | null;
  imageUrl?: string | null;
  observedPrice?: number | null;
  productId?: string | null;
}) {
  await prisma.dynamicCategoryAsinDecision.upsert({
    where: {
      categoryId_asin: {
        categoryId: params.categoryId,
        asin: params.asin,
      },
    },
    update: {
      status: params.status,
      reasonCode: params.reasonCode ?? null,
      reasonText: params.reasonText ?? null,
      policyHash: params.policyHash ?? null,
      title: params.title ?? null,
      brand: params.brand ?? null,
      imageUrl: params.imageUrl ?? null,
      observedPrice:
        typeof params.observedPrice === "number" ? params.observedPrice : null,
      productId: params.productId ?? null,
      lastSeenAt: new Date(),
      reviewedAt: new Date(),
    },
    create: {
      categoryId: params.categoryId,
      asin: params.asin,
      status: params.status,
      reasonCode: params.reasonCode ?? null,
      reasonText: params.reasonText ?? null,
      policyHash: params.policyHash ?? null,
      title: params.title ?? null,
      brand: params.brand ?? null,
      imageUrl: params.imageUrl ?? null,
      observedPrice:
        typeof params.observedPrice === "number" ? params.observedPrice : null,
      productId: params.productId ?? null,
      firstSeenAt: new Date(),
      lastSeenAt: new Date(),
      reviewedAt: new Date(),
    },
  });
}

function normalizeImportRun(run: {
  id: string;
  status: string;
  totalItems: number;
  processedItems: number;
  importedItems: number;
  skippedItems: number;
  errorItems: number;
  cancelRequested: boolean;
  logs: unknown;
  categoryId: string;
  filters: unknown;
  startedAt: Date;
  finishedAt: Date | null;
}): ImportRunState {
  return {
    ...run,
    logs: Array.isArray(run.logs) ? run.logs.map((log) => String(log)) : [],
    filters:
      run.filters && typeof run.filters === "object"
        ? (run.filters as ImportFilters)
        : null,
  };
}

function normalizeDiscoveryRun(run: {
  id: string;
  status: string;
  totalSearches: number;
  processedSearches: number;
  foundItems: number;
  cancelRequested: boolean;
  inputs: unknown;
  items: unknown;
  logs: unknown;
  startedAt: Date;
  finishedAt: Date | null;
}): DiscoveryRunState {
  return {
    ...run,
    inputs:
      run.inputs && typeof run.inputs === "object"
        ? (run.inputs as DiscoveryRunState["inputs"])
        : null,
    items: Array.isArray(run.items)
      ? run.items.map((item) => item as DiscoveryItem)
      : [],
    logs: Array.isArray(run.logs) ? run.logs.map((log) => String(log)) : [],
  };
}

async function findDynamicImportRunById(runId: string) {
  const rows = await prisma.$queryRaw<
    Array<{
      id: string;
      status: string;
      totalItems: number;
      processedItems: number;
      importedItems: number;
      skippedItems: number;
      errorItems: number;
      cancelRequested: boolean;
      logs: unknown;
      categoryId: string;
      filters: unknown;
      startedAt: Date;
      finishedAt: Date | null;
    }>
  >`SELECT "id", "status", "totalItems", "processedItems", "importedItems", "skippedItems", "errorItems", "cancelRequested", "logs", "categoryId", "filters", "startedAt", "finishedAt"
    FROM "DynamicImportRun"
    WHERE "id" = ${runId}
    LIMIT 1`;

  return rows[0] ?? null;
}

async function findDynamicImportRunProgressById(runId: string) {
  const rows = await prisma.$queryRaw<
    Array<{
      id: string;
      status: string;
      totalItems: number;
      processedItems: number;
      importedItems: number;
      skippedItems: number;
      errorItems: number;
      cancelRequested: boolean;
    }>
  >`SELECT "id", "status", "totalItems", "processedItems", "importedItems", "skippedItems", "errorItems", "cancelRequested"
    FROM "DynamicImportRun"
    WHERE "id" = ${runId}
    LIMIT 1`;

  return rows[0] ?? null;
}

async function findLatestDynamicImportRunByStatuses(statuses: string[]) {
  if (statuses.length === 0) return null;

  const rows = await prisma.$queryRaw<
    Array<{
      id: string;
      status: string;
      totalItems: number;
      processedItems: number;
      importedItems: number;
      skippedItems: number;
      errorItems: number;
      cancelRequested: boolean;
      logs: unknown;
      categoryId: string;
      filters: unknown;
      startedAt: Date;
      finishedAt: Date | null;
    }>
  >(Prisma.sql`SELECT "id", "status", "totalItems", "processedItems", "importedItems", "skippedItems", "errorItems", "cancelRequested", "logs", "categoryId", "filters", "startedAt", "finishedAt"
    FROM "DynamicImportRun"
    WHERE "status" IN (${Prisma.join(statuses)})
    ORDER BY "startedAt" DESC
    LIMIT 1`);

  return rows[0] ?? null;
}

async function createDynamicImportRun(params: {
  status: string;
  categoryId: string;
  totalItems: number;
  filters: ImportFilters;
  logs: string[];
}) {
  const rows = await prisma.$queryRaw<
    Array<{
      id: string;
      status: string;
      totalItems: number;
      processedItems: number;
      importedItems: number;
      skippedItems: number;
      errorItems: number;
      cancelRequested: boolean;
      logs: unknown;
      categoryId: string;
      filters: unknown;
      startedAt: Date;
      finishedAt: Date | null;
    }>
  >(Prisma.sql`INSERT INTO "DynamicImportRun" (
      "id",
      "status",
      "categoryId",
      "totalItems",
      "filters",
      "logs",
      "startedAt",
      "createdAt",
      "updatedAt"
    ) VALUES (
      ${crypto.randomUUID()},
      ${params.status},
      ${params.categoryId},
      ${params.totalItems},
      ${JSON.stringify(params.filters)}::jsonb,
      ${JSON.stringify(params.logs)}::jsonb,
      NOW(),
      NOW(),
      NOW()
    )
    RETURNING "id", "status", "totalItems", "processedItems", "importedItems", "skippedItems", "errorItems", "cancelRequested", "logs", "categoryId", "filters", "startedAt", "finishedAt"`);

  return rows[0];
}

async function findDynamicDiscoveryRunById(runId: string) {
  const rows = await prisma.$queryRaw<
    Array<{
      id: string;
      status: string;
      totalSearches: number;
      processedSearches: number;
      foundItems: number;
      cancelRequested: boolean;
      inputs: unknown;
      items: unknown;
      logs: unknown;
      startedAt: Date;
      finishedAt: Date | null;
    }>
  >`SELECT "id", "status", "totalSearches", "processedSearches", "foundItems", "cancelRequested", "inputs", "items", "logs", "startedAt", "finishedAt"
    FROM "DynamicDiscoveryRun"
    WHERE "id" = ${runId}
    LIMIT 1`;

  return rows[0] ?? null;
}

async function findDynamicDiscoveryRunProgressById(runId: string) {
  const rows = await prisma.$queryRaw<
    Array<{
      id: string;
      status: string;
      totalSearches: number;
      processedSearches: number;
      foundItems: number;
      cancelRequested: boolean;
    }>
  >`SELECT "id", "status", "totalSearches", "processedSearches", "foundItems", "cancelRequested"
    FROM "DynamicDiscoveryRun"
    WHERE "id" = ${runId}
    LIMIT 1`;

  return rows[0] ?? null;
}

async function findLatestDynamicDiscoveryRunByStatuses(statuses: string[]) {
  if (statuses.length === 0) return null;

  const rows = await prisma.$queryRaw<
    Array<{
      id: string;
      status: string;
      totalSearches: number;
      processedSearches: number;
      foundItems: number;
      cancelRequested: boolean;
      inputs: unknown;
      items: unknown;
      logs: unknown;
      startedAt: Date;
      finishedAt: Date | null;
    }>
  >(Prisma.sql`SELECT "id", "status", "totalSearches", "processedSearches", "foundItems", "cancelRequested", "inputs", "items", "logs", "startedAt", "finishedAt"
    FROM "DynamicDiscoveryRun"
    WHERE "status" IN (${Prisma.join(statuses)})
    ORDER BY "startedAt" DESC
    LIMIT 1`);

  return rows[0] ?? null;
}

async function createDynamicDiscoveryRun(params: {
  status: string;
  totalSearches: number;
  inputs: {
    keywordsRaw?: string;
    brandsRaw?: string;
    maxPages?: number;
    priceRangesRaw?: string;
  };
  logs: string[];
}) {
  const rows = await prisma.$queryRaw<
    Array<{
      id: string;
      status: string;
      totalSearches: number;
      processedSearches: number;
      foundItems: number;
      cancelRequested: boolean;
      inputs: unknown;
      items: unknown;
      logs: unknown;
      startedAt: Date;
      finishedAt: Date | null;
    }>
  >(Prisma.sql`INSERT INTO "DynamicDiscoveryRun" (
      "id",
      "status",
      "totalSearches",
      "inputs",
      "items",
      "logs",
      "startedAt",
      "createdAt",
      "updatedAt"
    ) VALUES (
      ${crypto.randomUUID()},
      ${params.status},
      ${params.totalSearches},
      ${JSON.stringify(params.inputs)}::jsonb,
      ${JSON.stringify([])}::jsonb,
      ${JSON.stringify(params.logs)}::jsonb,
      NOW(),
      NOW(),
      NOW()
    )
    RETURNING "id", "status", "totalSearches", "processedSearches", "foundItems", "cancelRequested", "inputs", "items", "logs", "startedAt", "finishedAt"`);

  return rows[0];
}

function matchesImportFilters(params: {
  name: string;
  brand: string;
  filters: ImportFilters;
}): ImportFilterMatchResult {
  const normalizedTitle = params.name.toLowerCase();
  const requiredTitleTerms = parseFilterList(params.filters.requiredTitleRaw);
  const forbiddenTitleTerms = parseFilterList(params.filters.forbiddenTitleRaw);

  if (
    requiredTitleTerms.length > 0 &&
    !requiredTitleTerms.some((term) => normalizedTitle.includes(term))
  ) {
    return {
      ok: false,
      reason: `Ignorado: titulo nao contem ${requiredTitleTerms.join(", ")}`,
    };
  }

  if (
    forbiddenTitleTerms.length > 0 &&
    forbiddenTitleTerms.some((term) => normalizedTitle.includes(term))
  ) {
    return {
      ok: false,
      reason: `Ignorado: titulo contem termo proibido (${forbiddenTitleTerms.join(", ")})`,
    };
  }

  return { ok: true as const };
}

function getImportFilterReasonCode(params: {
  name: string;
  filters: ImportFilters;
}): 'TITLE_REQUIRED_MISMATCH' | 'TITLE_FORBIDDEN_MATCH' | null {
  const normalizedTitle = params.name.toLowerCase();
  const requiredTitleTerms = parseFilterList(params.filters.requiredTitleRaw);
  const forbiddenTitleTerms = parseFilterList(params.filters.forbiddenTitleRaw);

  if (
    requiredTitleTerms.length > 0 &&
    !requiredTitleTerms.some((term) => normalizedTitle.includes(term))
  ) {
    return 'TITLE_REQUIRED_MISMATCH';
  }

  if (
    forbiddenTitleTerms.length > 0 &&
    forbiddenTitleTerms.some((term) => normalizedTitle.includes(term))
  ) {
    return 'TITLE_FORBIDDEN_MATCH';
  }

  return null;
}

function getItemTitle(item: AmazonItem) {
  return item.ItemInfo?.Title?.DisplayValue?.trim() || "Sem titulo";
}

function getItemBrand(item: AmazonItem) {
  return (
    item.ItemInfo?.ByLineInfo?.Brand?.DisplayValue?.trim() ||
    item.ItemInfo?.ByLineInfo?.Manufacturer?.DisplayValue?.trim() ||
    "Sem marca"
  );
}

function getItemDisplayPrice(item: AmazonItem) {
  const offersV2 = item.OffersV2?.Listings?.[0]?.Price?.Money;
  if (offersV2?.Amount) {
    return {
      price: offersV2.Amount,
      displayPrice: `R$ ${offersV2.Amount.toFixed(2)}`,
    };
  }

  const offers = item.Offers?.Listings?.[0]?.Price?.Amount;
  if (offers) {
    return {
      price: offers > 1000 ? offers / 100 : offers,
      displayPrice: `R$ ${(offers > 1000 ? offers / 100 : offers).toFixed(2)}`,
    };
  }

  return {
    price: null,
    displayPrice: "Sem preco",
  };
}

async function updateImportRun(
  runId: string,
  data: {
    status?: string;
    processedItems?: number;
    importedItems?: number;
    skippedItems?: number;
    errorItems?: number;
    cancelRequested?: boolean;
    finishedAt?: Date | null;
    logs?: string[];
  }
) {
  const updates: Prisma.Sql[] = [];

  if (data.status !== undefined) {
    updates.push(Prisma.sql`"status" = ${data.status}`);
  }

  if (data.processedItems !== undefined) {
    updates.push(Prisma.sql`"processedItems" = ${data.processedItems}`);
  }

  if (data.importedItems !== undefined) {
    updates.push(Prisma.sql`"importedItems" = ${data.importedItems}`);
  }

  if (data.skippedItems !== undefined) {
    updates.push(Prisma.sql`"skippedItems" = ${data.skippedItems}`);
  }

  if (data.errorItems !== undefined) {
    updates.push(Prisma.sql`"errorItems" = ${data.errorItems}`);
  }

  if (data.cancelRequested !== undefined) {
    updates.push(Prisma.sql`"cancelRequested" = ${data.cancelRequested}`);
  }

  if (data.finishedAt !== undefined) {
    updates.push(Prisma.sql`"finishedAt" = ${data.finishedAt}`);
  }

  if (data.logs !== undefined) {
    const trimmedLogs =
      data.logs.length > MAX_IMPORT_LOG_ENTRIES
        ? data.logs.slice(-MAX_IMPORT_LOG_ENTRIES)
        : data.logs;
    updates.push(Prisma.sql`"logs" = ${JSON.stringify(trimmedLogs)}::jsonb`);
  }

  updates.push(Prisma.sql`"updatedAt" = NOW()`);

  await (prisma as unknown as {
    $queryRaw: (query: Prisma.Sql) => Promise<unknown>;
  }).$queryRaw(
    Prisma.sql`UPDATE "DynamicImportRun"
      SET ${Prisma.join(updates)}
      WHERE "id" = ${runId}`
  );
}

async function updateDiscoveryRun(
  runId: string,
  data: {
    status?: string;
    totalSearches?: number;
    processedSearches?: number;
    foundItems?: number;
    cancelRequested?: boolean;
    finishedAt?: Date | null;
    items?: DiscoveryItem[];
    logs?: string[];
  }
) {
  const updates: Prisma.Sql[] = [];

  if (data.status !== undefined) {
    updates.push(Prisma.sql`"status" = ${data.status}`);
  }

  if (data.totalSearches !== undefined) {
    updates.push(Prisma.sql`"totalSearches" = ${data.totalSearches}`);
  }

  if (data.processedSearches !== undefined) {
    updates.push(Prisma.sql`"processedSearches" = ${data.processedSearches}`);
  }

  if (data.foundItems !== undefined) {
    updates.push(Prisma.sql`"foundItems" = ${data.foundItems}`);
  }

  if (data.cancelRequested !== undefined) {
    updates.push(Prisma.sql`"cancelRequested" = ${data.cancelRequested}`);
  }

  if (data.finishedAt !== undefined) {
    updates.push(Prisma.sql`"finishedAt" = ${data.finishedAt}`);
  }

  if (data.items !== undefined) {
    updates.push(Prisma.sql`"items" = ${JSON.stringify(data.items)}::jsonb`);
  }

  if (data.logs !== undefined) {
    const trimmedLogs =
      data.logs.length > MAX_DISCOVERY_LOG_ENTRIES
        ? data.logs.slice(-MAX_DISCOVERY_LOG_ENTRIES)
        : data.logs;
    updates.push(Prisma.sql`"logs" = ${JSON.stringify(trimmedLogs)}::jsonb`);
  }

  updates.push(Prisma.sql`"updatedAt" = NOW()`);

  await (prisma as unknown as {
    $queryRaw: (query: Prisma.Sql) => Promise<unknown>;
  }).$queryRaw(
    Prisma.sql`UPDATE "DynamicDiscoveryRun"
      SET ${Prisma.join(updates)}
      WHERE "id" = ${runId}`
  );
}

const delay = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

/* ======================
FETCH AMAZON
====================== */

async function fetchAmazonPrice(
  asin: string
): Promise<PriceResult | null> {
  const items = await getAmazonItems({
    itemIds: [asin],
    resources: [
      "ItemInfo.Title",
      "ItemInfo.ByLineInfo",
      "Images.Primary.Large",
      "Offers.Listings.Type",
      "OffersV2.Listings.Type",
      "Offers.Listings.IsBuyBoxWinner",
      "OffersV2.Listings.IsBuyBoxWinner",
      "Offers.Listings.Price",
      "OffersV2.Listings.Price",
      "Offers.Listings.MerchantInfo",
      "OffersV2.Listings.MerchantInfo",
    ],
  });

  const item = items[0];
  if (!item) {
    return null;
  }

  return {
    price: getAmazonItemPrice(item),
    programAndSavePrice: getAmazonItemProgramAndSavePrice(item),
    merchantName: getAmazonItemMerchantName(item) ?? "Desconhecido",
    item,
  };
}

const RAW_RESOURCE_SETS: string[][] = [
  [
    "ItemInfo.Title",
    "ItemInfo.ByLineInfo",
    "ItemInfo.Features",
    "ItemInfo.ProductInfo",
    "ItemInfo.Classifications",
    "BrowseNodeInfo.BrowseNodes",
    "Offers.Listings.Price",
    "Offers.Listings.Savings",
    "Offers.Listings.Price.PerUnitPrice",
    "Images.Primary.Large",
    "Images.Variants.Large",
  ],
  [
    "ItemInfo.Title",
    "ItemInfo.ByLineInfo",
    "ItemInfo.Features",
    "ItemInfo.ProductInfo",
    "ItemInfo.Classifications",
    "BrowseNodeInfo.BrowseNodes",
    "Offers.Listings.Price",
    "Offers.Listings.SavingBasis",
    "Images.Primary.Large",
    "Images.Variants.Large",
  ],
  [
    "ItemInfo.Title",
    "ItemInfo.ByLineInfo",
    "ItemInfo.Features",
    "ItemInfo.ProductInfo",
    "ItemInfo.Classifications",
    "BrowseNodeInfo.BrowseNodes",
    "Offers.Listings.Price",
    "Images.Primary.Large",
    "Images.Variants.Large",
  ],
  ["ItemInfo.Title", "ItemInfo.ByLineInfo", "Offers.Listings.Price", "Images.Primary.Large"],
];

function hasInvalidResourcesError(raw: unknown) {
  const maybeErrors = (raw as any)?.Errors;
  if (!Array.isArray(maybeErrors)) {
    return false;
  }
  return maybeErrors.some((err) => err?.Code === "InvalidParameterValue");
}

function hasTooManyRequestsError(raw: unknown) {
  const maybeErrors = (raw as any)?.Errors;
  if (!Array.isArray(maybeErrors)) {
    return false;
  }
  return maybeErrors.some((err) => err?.Code === "TooManyRequests");
}

const RAW_BATCH_DELAY_MS = Number(process.env.AMAZON_RAW_BATCH_DELAY_MS ?? 600);
const RAW_RETRY_LIMIT = Number(process.env.AMAZON_RAW_RETRY_LIMIT ?? 3);
const RAW_RETRY_DELAY_MS = Number(process.env.AMAZON_RAW_RETRY_DELAY_MS ?? 1500);
const IMPORT_PRICE_DELAY_MS = Number(process.env.AMAZON_IMPORT_PRICE_DELAY_MS ?? 250);

async function fetchRawItemsForAsins(asins: string[]) {
  let attempt = 0;
  let lastResult:
    | { items: AmazonItem[]; raw: unknown; resourcesUsed?: string[] }
    | null = null;

  while (attempt < RAW_RETRY_LIMIT) {
    for (const resources of RAW_RESOURCE_SETS) {
      const result = await getAmazonItemsRaw({
        itemIds: asins,
        resources,
      });
      lastResult = { items: result.items, raw: result.raw, resourcesUsed: resources };
      if (hasTooManyRequestsError(result.raw)) {
        continue;
      }
      if (!hasInvalidResourcesError(result.raw)) {
        return { items: result.items, raw: result.raw, resourcesUsed: resources };
      }
    }

    attempt += 1;
    if (attempt < RAW_RETRY_LIMIT) {
      await delay(RAW_RETRY_DELAY_MS);
    }
  }

  const fallbackResources = RAW_RESOURCE_SETS[RAW_RESOURCE_SETS.length - 1] ?? [];
  if (lastResult) {
    return lastResult;
  }
  const result = await getAmazonItemsRaw({
    itemIds: asins,
    resources: fallbackResources,
  });
  return { items: result.items, raw: result.raw, resourcesUsed: fallbackResources };
}

async function persistRawImportSnapshot(asins: string[], runId: string) {
  const batchSize = 5;
  const chunkLimit = 100;
  const rawItems: unknown[] = [];
  const returnedAsins = new Set<string>();
  const debugBatches: Array<{
    asins: string[];
    returned: string[];
    errors?: Array<{ Code?: string; Message?: string }>;
    resourcesUsed?: string[];
  }> = [];

  for (let i = 0; i < asins.length; i += batchSize) {
    const batch = asins.slice(i, i + batchSize);
    const result = await fetchRawItemsForAsins(batch);
    const items = result.items;
    rawItems.push(...items);
    items.forEach((item: any) => {
      if (item?.ASIN) {
        returnedAsins.add(String(item.ASIN));
      }
    });

    const returnedInBatch = items
      .map((item: any) => String(item?.ASIN ?? ""))
      .filter(Boolean);
    const errors = Array.isArray((result.raw as any)?.Errors)
      ? ((result.raw as any).Errors as Array<{ Code?: string; Message?: string }>)
      : undefined;

    if (errors?.length || returnedInBatch.length < batch.length) {
      debugBatches.push({
        asins: batch,
        returned: returnedInBatch,
        errors,
        resourcesUsed: result.resourcesUsed,
      });
    }

    if (RAW_BATCH_DELAY_MS > 0) {
      await delay(RAW_BATCH_DELAY_MS);
    }
  }

  const dir = path.resolve(process.cwd(), "data", "imports");
  fs.mkdirSync(dir, { recursive: true });

  const outputPaths: string[] = [];
  const exportItems = rawItems.map((item: any) => {
    const features = Array.isArray(item?.ItemInfo?.Features?.DisplayValues)
      ? item.ItemInfo.Features.DisplayValues.join("; ")
      : "";
    return {
      ASIN: String(item?.ASIN ?? ""),
      Title: String(item?.ItemInfo?.Title?.DisplayValue ?? ""),
      Brand: String(item?.ItemInfo?.ByLineInfo?.Brand?.DisplayValue ?? ""),
      BrowseNode: String(item?.BrowseNodeInfo?.BrowseNodes?.[0]?.DisplayName ?? ""),
      Features: features,
    };
  });

  const chunks =
    exportItems.length > chunkLimit
      ? Math.ceil(exportItems.length / chunkLimit)
      : 1;

  for (let i = 0; i < chunks; i += 1) {
    const start = i * chunkLimit;
    const end = start + chunkLimit;
    const slice = exportItems.slice(start, end);
    const suffix = chunks > 1 ? `_part${i + 1}` : "";
    const outputPath = path.resolve(
      dir,
      `raw_import_${runId}${suffix}.json`
    );
    fs.writeFileSync(outputPath, JSON.stringify(slice, null, 2));
    outputPaths.push(outputPath);
  }

  const missingAsins = asins.filter((asin) => !returnedAsins.has(asin));
  if (missingAsins.length > 0) {
    const missingPath = path.resolve(dir, `raw_import_${runId}_missing.json`);
    fs.writeFileSync(missingPath, JSON.stringify(missingAsins, null, 2));
  }

  if (debugBatches.length > 0) {
    const debugPath = path.resolve(dir, `raw_import_${runId}_debug.json`);
    fs.writeFileSync(debugPath, JSON.stringify(debugBatches, null, 2));
  }

  return {
    outputPaths,
    requested: asins.length,
    returned: returnedAsins.size,
    missing: missingAsins.length,
  };
}

export async function downloadDynamicRawSnapshot(input: { asinsRaw: string }) {
  const asinList = input.asinsRaw
    .split(/[\s,]+/)
    .map((a) => a.trim().toUpperCase())
    .filter(Boolean);

  if (asinList.length === 0) {
    return { error: "Cole ao menos um ASIN para baixar o JSON completo." };
  }

  const runId = crypto.randomUUID();
  const snapshot = await persistRawImportSnapshot(asinList, runId);

  return {
    success: true,
    runId,
    ...snapshot,
  };
}

async function searchAmazonItems(
  keyword: string,
  page: number,
  brand?: string,
  range?: SearchPriceRange
): Promise<AmazonItem[]> {
  return searchAmazonCatalogItems({
    keywords: keyword,
    page,
    brand,
    range,
    itemCount: 10,
    resources: [
      "ItemInfo.Title",
      "ItemInfo.ByLineInfo",
      "Images.Primary.Large",
      "Offers.Listings.Price",
      "OffersV2.Listings.Price",
    ],
  });
}

/* ======================
ACTION IMPORT
====================== */

export async function importDynamicViaAPI(
  asinsRaw: string,
  categoryId: string
) {
  return startDynamicImportViaAPI({ asinsRaw, categoryId });
}

async function runDynamicImportJob(
  runId: string,
  asinsRaw: string,
  categoryId: string,
  filters: ImportFilters,
  discoveredItems: ImportDiscoveryContextItem[] = []
) {
  const asinList = asinsRaw
    .split(/[\s,]+/)
    .map((a) => a.trim())
    .filter(Boolean);

  const category = await prisma.dynamicCategory.findUnique({
    where: { id: categoryId },
    select: { id: true, name: true, slug: true, displayConfig: true },
  });

  if (!category) {
    await updateImportRun(runId, {
      status: "failed",
      finishedAt: new Date(),
      logs: ["Categoria nao encontrada."],
    });
    return;
  }

  const logs: string[] = [
    "Conectando com Amazon em modo hibrido: Creators para itens e PA-API para buscas com faixa...",
  ];
  const importPolicyHash = buildImportPolicyHash(filters);
  let processedItems = 0;
  let importedItems = 0;
  let skippedItems = 0;
  let errorItems = 0;
  const errorAsins: string[] = [];

  await updateImportRun(runId, { logs });

  const selectedAsins = new Set(asinList);

  if (discoveredItems.length > 0) {
    for (const item of discoveredItems) {
      if (selectedAsins.has(item.asin)) {
        continue;
      }

      const filterResult = matchesImportFilters({
        name: item.title,
        brand: item.brand,
        filters,
      });

      if (!filterResult.ok) {
        await upsertCategoryAsinDecision({
          categoryId,
          asin: item.asin,
          status: 'rejected_soft',
          reasonCode:
            filterResult.reasonCode ??
            getImportFilterReasonCode({ name: item.title, filters }),
          reasonText: filterResult.reason,
          policyHash: importPolicyHash,
          title: item.title,
          brand: item.brand,
          imageUrl: item.imageUrl ?? null,
          observedPrice: item.price ?? null,
        });
        continue;
      }

      await upsertCategoryAsinDecision({
        categoryId,
        asin: item.asin,
        status: 'discovered',
        reasonCode: 'DISCOVERED_NOT_SELECTED',
        reasonText: 'ASIN descoberto na expansao, mas nao incluido na lista final de importacao',
        policyHash: importPolicyHash,
        title: item.title,
        brand: item.brand,
        imageUrl: item.imageUrl ?? null,
        observedPrice: item.price ?? null,
      });
    }
  }

  const existingDecisions = await prisma.dynamicCategoryAsinDecision.findMany({
    where: {
      categoryId,
      asin: { in: asinList },
    },
  });
  const decisionMap = new Map(existingDecisions.map((decision) => [decision.asin, decision]));

  for (const asin of asinList) {
    if (processedItems > 0 && processedItems % 50 === 0) {
      const runState = await findDynamicImportRunById(runId);

      if (runState?.cancelRequested) {
        logs.push("Importacao interrompida pelo usuario.");
        await updateImportRun(runId, {
          status: "cancelled",
          processedItems,
          importedItems,
          skippedItems,
          errorItems,
          finishedAt: new Date(),
          logs,
        });
        revalidatePath("/admin/dynamic/produtos");
        revalidatePath("/admin/dynamic/rejeitados");
        return;
      }
    }

    try {
      if (IMPORT_PRICE_DELAY_MS > 0) {
        await delay(IMPORT_PRICE_DELAY_MS);
      }

      const previousDecision = decisionMap.get(asin);

      if (
        previousDecision?.status === 'rejected_hard' ||
        (previousDecision?.status === 'rejected_soft' &&
          previousDecision.policyHash &&
          previousDecision.policyHash === importPolicyHash)
      ) {
        skippedItems += 1;
        processedItems += 1;
        logs.push(
          previousDecision.status === 'rejected_hard'
            ? `⏭️ ${asin}: Ja rejeitado de forma definitiva nesta categoria`
            : `⏭️ ${asin}: Ja rejeitado nesta categoria pelos filtros atuais`
        );
        await updateImportRun(runId, {
          processedItems,
          importedItems,
          skippedItems,
          errorItems,
          logs,
        });
        continue;
      }

      const existing = await prisma.dynamicProduct.findUnique({
        where: { asin },
        select: {
          id: true,
          categoryId: true,
        },
      });

      if (existing) {
        if (existing.categoryId === categoryId) {
          await upsertCategoryAsinDecision({
            categoryId,
            asin,
            status: 'imported',
            policyHash: importPolicyHash,
            productId: existing.id,
          });
        }
        skippedItems += 1;
        processedItems += 1;
        logs.push(`- ${asin}: Ja existe no banco de dados`);
        await updateImportRun(runId, {
          processedItems,
          importedItems,
          skippedItems,
          errorItems,
          logs,
        });
        continue;
      }

      const result = await fetchAmazonPrice(asin);

      if (!result) {
        errorItems += 1;
        errorAsins.push(asin);
        processedItems += 1;
        logs.push(`X ${asin}: Nao encontrado na API`);
        await updateImportRun(runId, {
          processedItems,
          importedItems,
          skippedItems,
          errorItems,
          logs,
        });
        continue;
      }

      const { price, programAndSavePrice, merchantName, item } = result;

      if (merchantName === "Loja Suplemento") {
        await upsertCategoryAsinDecision({
          categoryId,
          asin,
          status: 'rejected_soft',
          reasonCode: 'MERCHANT_EXCLUDED',
          reasonText: 'Oferta atual excluida pelo seller Loja Suplemento',
          policyHash: importPolicyHash,
          title: item?.ItemInfo?.Title?.DisplayValue ?? null,
          brand:
            item?.ItemInfo?.ByLineInfo?.Brand?.DisplayValue ??
            item?.ItemInfo?.ByLineInfo?.Manufacturer?.DisplayValue ??
            null,
          imageUrl: item?.Images?.Primary?.Large?.URL ?? null,
          observedPrice: price,
        });
        skippedItems += 1;
        processedItems += 1;
        logs.push(`! ${asin}: Excluido (Loja Suplemento)`);
        await updateImportRun(runId, {
          processedItems,
          importedItems,
          skippedItems,
          errorItems,
          logs,
        });
        continue;
      }

      const name = item?.ItemInfo?.Title?.DisplayValue ?? "Produto Amazon";
      const brand =
        item?.ItemInfo?.ByLineInfo?.Brand?.DisplayValue ??
        item?.ItemInfo?.ByLineInfo?.Manufacturer?.DisplayValue ??
        "Amazon";

      if (filters.enableImportValidation !== false) {
        const filterResult = matchesImportFilters({
          name,
          brand,
          filters,
        });

        if (!filterResult.ok) {
          await upsertCategoryAsinDecision({
            categoryId,
            asin,
            status: 'rejected_soft',
            reasonCode:
              filterResult.reasonCode ??
              getImportFilterReasonCode({ name, filters }),
            reasonText: filterResult.reason,
            policyHash: importPolicyHash,
            title: name,
            brand,
            imageUrl: item?.Images?.Primary?.Large?.URL ?? null,
            observedPrice: price,
          });
          skippedItems += 1;
          processedItems += 1;
          logs.push(`- ${asin}: ${filterResult.reason}`);
          await updateImportRun(runId, {
            processedItems,
            importedItems,
            skippedItems,
            errorItems,
            logs,
          });
          continue;
        }
      }

      const imageUrl = item?.Images?.Primary?.Large?.URL ?? "";
      const url =
        (item ? getAmazonItemAffiliateUrl(item) : "") ||
        `https://www.amazon.com.br/dp/${asin}?tag=${AMAZON_PARTNER_TAG}`;

      const baseAttributes: Record<string, string | number> = {
        brand,
        seller: merchantName,
        asin,
      };
      if (
        typeof programAndSavePrice === "number" &&
        Number.isFinite(programAndSavePrice) &&
        programAndSavePrice > 0
      ) {
        baseAttributes.precoProgramaPoupe = Number(programAndSavePrice.toFixed(2));
      }
      const attributes =
        filters.autoFillAttributes === false
          ? baseAttributes
          : (enrichDynamicAttributesForCategory({
              category,
              rawDisplayConfig: category.displayConfig,
              productName: name,
              totalPrice: price,
              attributes: baseAttributes,
            }) as Record<string, string | number>);

      const createdProduct = await prisma.dynamicProduct.create({
        data: {
          asin,
          name,
          imageUrl,
          url,
          totalPrice: price,
          categoryId,
          visibilityStatus: IMPORT_DEFAULT_VISIBILITY,
          isVisibleOnSite: getDynamicVisibilityBoolean(IMPORT_DEFAULT_VISIBILITY),
          attributes,
        },
      });

      await upsertCategoryAsinDecision({
        categoryId,
        asin,
        status: 'imported',
        policyHash: importPolicyHash,
        title: name,
        brand,
        imageUrl,
        observedPrice: price,
        productId: createdProduct.id,
      });

      importedItems += 1;
      processedItems += 1;
      if (price === 0) {
        logs.push(`! ${asin}: Importado sem preco`);
      } else if (
        typeof programAndSavePrice === "number" &&
        Number.isFinite(programAndSavePrice) &&
        programAndSavePrice > 0
      ) {
        logs.push(
          `OK R$ ${price.toFixed(2)} | P&P R$ ${programAndSavePrice.toFixed(2)} | ${asin} | ${merchantName}`
        );
      } else {
        logs.push(`OK R$ ${price.toFixed(2)} | ${asin} | ${merchantName}`);
      }

      await updateImportRun(runId, {
        processedItems,
        importedItems,
        skippedItems,
        errorItems,
        logs,
      });
    } catch (error) {
      console.error(error);
      errorItems += 1;
      errorAsins.push(asin);
      processedItems += 1;
      logs.push(`X ${asin}: erro na importacao`);
      await updateImportRun(runId, {
        processedItems,
        importedItems,
        skippedItems,
        errorItems,
        logs,
      });
    }
  }

  if (errorAsins.length > 0) {
    logs.push(`ASINs com erro: ${errorAsins.join(", ")}`);
  }

  await updateImportRun(runId, {
    status: "completed",
    processedItems,
    importedItems,
    skippedItems,
    errorItems,
    finishedAt: new Date(),
    logs,
  });

  revalidatePath("/admin/dynamic/produtos");
  revalidatePath("/admin/dynamic/rejeitados");
}

export async function startDynamicImportViaAPI(input: {
  asinsRaw: string;
  categoryId: string;
  requiredTitleRaw?: string;
  forbiddenTitleRaw?: string;
  enableImportValidation?: boolean;
  saveRawData?: boolean;
  autoFillAttributes?: boolean;
  discoveredItems?: ImportDiscoveryContextItem[];
}) {
  const asinList = input.asinsRaw
    .split(/[\s,]+/)
    .map((a) => a.trim())
    .filter(Boolean);

  if (asinList.length === 0) {
    return { error: "Cole ao menos um ASIN para iniciar a importacao." };
  }

  const activeRun = await findLatestDynamicImportRunByStatuses(["running"]);

  if (activeRun) {
    return { error: "Ja existe uma importacao em andamento." };
  }

  const run = await createDynamicImportRun({
    status: "running",
    categoryId: input.categoryId,
    totalItems: asinList.length,
      filters: {
        requiredTitleRaw: input.requiredTitleRaw ?? "",
        forbiddenTitleRaw: input.forbiddenTitleRaw ?? "",
        enableImportValidation: input.enableImportValidation === true,
        saveRawData: input.saveRawData === true,
        autoFillAttributes: input.autoFillAttributes === true,
      },
      logs: ["Fila criada. Preparando importacao..."],
    });

  void runDynamicImportJob(run.id, input.asinsRaw, input.categoryId, {
    requiredTitleRaw: input.requiredTitleRaw ?? "",
    forbiddenTitleRaw: input.forbiddenTitleRaw ?? "",
    enableImportValidation: input.enableImportValidation === true,
    saveRawData: input.saveRawData === true,
    autoFillAttributes: input.autoFillAttributes === true,
  }, input.discoveredItems ?? []);

  return { success: true, runId: run.id };
}

export async function getDynamicImportRun(runId: string) {
  const run = await findDynamicImportRunById(runId);

  return run ? normalizeImportRun(run) : null;
}

export async function getDynamicImportRunProgress(runId: string) {
  const run = await findDynamicImportRunProgressById(runId);
  return (run ?? null) as ImportRunProgressState | null;
}

export async function getLatestDynamicImportRun() {
  const run = await findLatestDynamicImportRunByStatuses([
    "running",
    "cancelled",
    "completed",
    "failed",
  ]);

  return run ? normalizeImportRun(run) : null;
}

function parseAttributeListEntries(raw: string) {
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const entries: Array<{ asin: string; value: string }> = [];

  for (const line of lines) {
    const match = line.match(/([A-Z0-9]{10})\s*[-,;:\t|]\s*(.+)$/i);
    if (match) {
      entries.push({ asin: match[1].toUpperCase(), value: match[2].trim() });
      continue;
    }

    const parts = line.split(/\s+/).filter(Boolean);
    if (parts.length >= 2 && /^[A-Z0-9]{10}$/i.test(parts[0])) {
      entries.push({ asin: parts[0].toUpperCase(), value: parts.slice(1).join(" ") });
    }
  }

  return entries;
}

function parseAttributeValue(rawValue: string) {
  const normalized = rawValue.replace(",", ".").trim();
  const numericValue = Number(normalized);
  if (Number.isFinite(numericValue)) {
    return numericValue;
  }
  return rawValue.trim();
}

export async function applyDynamicAttributesFromList(input: {
  categoryId?: string;
  attributeKey: string;
  listRaw: string;
}) {
  const attributeKey = input.attributeKey.trim();
  if (!attributeKey) {
    return { error: "Informe a chave do atributo." };
  }

  const entries = parseAttributeListEntries(input.listRaw);
  if (entries.length === 0) {
    return { error: "Nenhum ASIN valido encontrado na lista." };
  }

  const refs: DynamicCatalogCategoryRef[] = [];
  const missing: string[] = [];
  let updated = 0;

  for (const entry of entries) {
    const product = await prisma.dynamicProduct.findFirst({
      where: {
        asin: entry.asin,
        ...(input.categoryId ? { categoryId: input.categoryId } : {}),
      },
      select: {
        id: true,
        attributes: true,
        category: { select: { group: true, slug: true } },
      },
    });

    if (!product) {
      missing.push(entry.asin);
      continue;
    }

    const currentAttrs = (product.attributes as Record<string, unknown>) || {};
    const nextAttrs = {
      ...currentAttrs,
      [attributeKey]: parseAttributeValue(entry.value),
    };

    await prisma.dynamicProduct.update({
      where: { id: product.id },
      data: { attributes: nextAttrs as Prisma.InputJsonValue },
    });

    if (product.category?.group && product.category.slug) {
      refs.push({ group: product.category.group, slug: product.category.slug });
    }
    updated += 1;
  }

  if (refs.length > 0) {
    revalidateDynamicCatalogCategoryRefs(dedupeDynamicCatalogCategoryRefs(refs));
  }

  revalidatePath("/admin/dynamic/produtos");

  return {
    updated,
    missing,
    total: entries.length,
  };
}

export async function cancelDynamicImport(runId: string) {
  const run = await findDynamicImportRunById(runId);

  if (!run) {
    return { error: "Importacao nao encontrada." };
  }

  if (run.status !== "running") {
    return { error: "Essa importacao nao esta mais em andamento." };
  }

  await updateImportRun(runId, {
    cancelRequested: true,
  });

  return { success: true };
}

async function runDynamicDiscoveryJob(input: {
  keywordsRaw: string;
  brandsRaw?: string;
  maxPages?: number;
  priceRangesRaw?: string;
  runId: string;
}) {
  const logs: string[] = [];

  try {
    const keywords = parseFilterList(input.keywordsRaw);
    const brands = parseFilterList(input.brandsRaw);
    const maxPages = Math.min(Math.max(input.maxPages ?? 10, 1), 10);
    const hasManualRanges = (input.priceRangesRaw ?? "").trim().length > 0;
    const initialPriceRanges = hasManualRanges
      ? parseDiscoveryPriceRanges(input.priceRangesRaw)
      : [null];
    const foundMap = new Map<string, DiscoveryItem>();
    const brandMatrix = brands.length > 0 ? brands : [""];
    const tasks: DiscoverySearchTask[] = [];

    for (const keyword of keywords) {
      for (const brandFilter of brandMatrix) {
        for (const range of initialPriceRanges) {
          tasks.push({
            keyword,
            brandFilter,
            range,
            depth: 0,
          });
        }
      }
    }

    let totalSearches = tasks.length;
    logs.push(
      `Iniciando descoberta com ${keywords.length} palavra(s)-chave e ${brandMatrix.length} marca(s).`,
      hasManualRanges
        ? `${totalSearches} buscas-base previstas com faixas manuais.`
        : `${totalSearches} buscas-base previstas com divisao automatica de faixas.`
    );
    let processedSearches = 0;

    await updateDiscoveryRun(input.runId, { logs, totalSearches });

    while (tasks.length > 0) {
      const task = tasks.shift()!;
      const currentSearchNumber = processedSearches + 1;

      if (processedSearches > 0 && processedSearches % 5 === 0) {
        const runState = await findDynamicDiscoveryRunById(input.runId);

        if (runState?.cancelRequested) {
          logs.push("Descoberta interrompida pelo usuario.");
          await updateDiscoveryRun(input.runId, {
            status: "cancelled",
            totalSearches,
            processedSearches,
            foundItems: foundMap.size,
            items: [...foundMap.values()],
            finishedAt: new Date(),
            logs,
          });
          return;
        }
      }

      const searchTerm = task.keyword.trim();
      const rangeLabel = formatDiscoveryRangeLabel(task.range);

      logs.push(
        `Buscando: ${searchTerm}${task.brandFilter ? ` | marca: ${task.brandFilter}` : ""} | ${rangeLabel} | lote ${currentSearchNumber}/${totalSearches}`
      );
      await updateDiscoveryRun(input.runId, {
        totalSearches,
        processedSearches,
        foundItems: foundMap.size,
        items: [...foundMap.values()],
        logs,
      });

      let saturated = true;
      let observedMin = Number.POSITIVE_INFINITY;
      let observedMax = 0;
      const observedPrices: number[] = [];
      let newItemsInTask = 0;
      let consultedPages = 0;
      const taskReturnedAsins = new Set<string>();

      for (let page = 1; page <= maxPages; page++) {
        const runState = await findDynamicDiscoveryRunById(input.runId);
        if (runState?.cancelRequested) {
          logs.push(
            `Descoberta interrompida pelo usuario durante ${rangeLabel}, antes da pagina ${page}.`
          );
          await updateDiscoveryRun(input.runId, {
            status: "cancelled",
            totalSearches,
            processedSearches,
            foundItems: foundMap.size,
            items: [...foundMap.values()],
            finishedAt: new Date(),
            logs,
          });
          return;
        }

        consultedPages += 1;
        const items = await searchAmazonItems(
          searchTerm,
          page,
          task.brandFilter || undefined,
          task.range ?? undefined
        );

        if (items.length < 10) {
          saturated = false;
        }

        if (items.length === 0) {
          logs.push(
            consultedPages === 1
              ? "Sem resultados nessa combinacao."
              : "Sem mais resultados nesta faixa."
          );
          break;
        }

        for (const item of items) {
          if (!item.ASIN) continue;

          const asin = item.ASIN;
          const title = getItemTitle(item);
          const brand = getItemBrand(item);

          if (task.brandFilter && !brand.toLowerCase().includes(task.brandFilter)) {
            continue;
          }

          taskReturnedAsins.add(asin);

          const { price, displayPrice } = getItemDisplayPrice(item);
          if (typeof price === "number" && Number.isFinite(price) && price > 0) {
            observedMin = Math.min(observedMin, price);
            observedMax = Math.max(observedMax, price);
            observedPrices.push(price);
          }

          if (foundMap.has(asin)) {
            continue;
          }

          const imageUrl = item.Images?.Primary?.Large?.URL ?? "";

          foundMap.set(asin, {
            asin,
            title,
            brand,
            imageUrl,
            price,
            displayPrice,
          });
          newItemsInTask += 1;
        }

        if (page === 1 || page === maxPages || page % 2 === 0) {
          logs.push(
            `Progresso da faixa: pagina ${page}/${maxPages} | ${taskReturnedAsins.size} ASINs na busca | ${newItemsInTask} novo(s) nesta faixa`
          );
          await updateDiscoveryRun(input.runId, {
            totalSearches,
            processedSearches,
            foundItems: foundMap.size,
            items: [...foundMap.values()],
            logs,
          });
        }

        await delay(1200);
      }

      logs.push(
        `Busca concluida: +${newItemsInTask} novo(s) | ${foundMap.size} ASINs unicos acumulados | ${taskReturnedAsins.size} ASINs na busca | ${consultedPages}/${maxPages} paginas consultadas`
      );
      processedSearches += 1;

      const canAutoSplit =
        saturated &&
        taskReturnedAsins.size >= maxPages * 10 &&
        task.depth < 5 &&
        Number.isFinite(observedMin) &&
        observedMax > observedMin;

      if (canAutoSplit) {
        const { ranges: splitRanges, bucketSummary } = splitDiscoveryRangeByAdaptiveBands(
          task.range,
          observedPrices
        );
        if (splitRanges.length > 1) {
          for (const splitRange of splitRanges) {
            tasks.push({
              keyword: task.keyword,
              brandFilter: task.brandFilter,
              range: splitRange,
              depth: task.depth + 1,
            });
          }
          totalSearches += splitRanges.length;
          logs.push(
            `Faixa saturada detectada com ${taskReturnedAsins.size} ASINs na busca. Bandas observadas: ${bucketSummary.join(", ")}. Dividindo em ${splitRanges
              .map((item) => item.label)
              .join(" | ")}`
          );
        }
      }

      await updateDiscoveryRun(input.runId, {
        totalSearches,
        processedSearches,
        foundItems: foundMap.size,
        items: [...foundMap.values()],
        logs,
      });
    }

    const items = [...foundMap.values()].sort((a, b) => {
      const priceA = a.price ?? Number.MAX_SAFE_INTEGER;
      const priceB = b.price ?? Number.MAX_SAFE_INTEGER;
      if (priceA !== priceB) return priceA - priceB;
      return a.title.localeCompare(b.title, "pt-BR");
    });

    logs.push(`Descoberta concluida com ${items.length} ASINs unicos.`);
    await updateDiscoveryRun(input.runId, {
      status: "completed",
      totalSearches,
      processedSearches,
      foundItems: items.length,
      items,
      finishedAt: new Date(),
      logs,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido na descoberta.";
    logs.push(`Falha na descoberta: ${message}`);
    await updateDiscoveryRun(input.runId, {
      status: "failed",
      finishedAt: new Date(),
      logs,
    });
  }
}
export async function startDynamicDiscovery(input: {
  keywordsRaw: string;
  brandsRaw?: string;
  maxPages?: number;
  priceRangesRaw?: string;
}) {
  const keywords = parseFilterList(input.keywordsRaw);
  const brands = parseFilterList(input.brandsRaw);
  const maxPages = Math.min(Math.max(input.maxPages ?? 10, 1), 10);
  const hasManualRanges = (input.priceRangesRaw ?? "").trim().length > 0;
  const initialPriceRanges = hasManualRanges
    ? parseDiscoveryPriceRanges(input.priceRangesRaw)
    : [null];

  if (keywords.length === 0) {
    return { error: "Informe ao menos uma palavra-chave para buscar." };
  }

  const activeRun = await findLatestDynamicDiscoveryRunByStatuses(["running"]);
  if (activeRun) {
    return { error: "Ja existe uma descoberta de ASINs em andamento." };
  }

  const brandMatrix = brands.length > 0 ? brands : [""];
  const totalSearches =
    keywords.length * brandMatrix.length * initialPriceRanges.length;

  const run = await createDynamicDiscoveryRun({
    status: "running",
    totalSearches,
    inputs: {
      keywordsRaw: input.keywordsRaw,
      brandsRaw: input.brandsRaw ?? "",
      maxPages,
      priceRangesRaw: input.priceRangesRaw ?? "",
    },
    logs: ["Fila criada. Preparando descoberta de ASINs..."],
  });

  void runDynamicDiscoveryJob({
    keywordsRaw: input.keywordsRaw,
    brandsRaw: input.brandsRaw,
    maxPages,
    priceRangesRaw: input.priceRangesRaw,
    runId: run.id,
  });

  return { success: true, runId: run.id };
}

export async function getDynamicDiscoveryRun(runId: string) {
  const run = await findDynamicDiscoveryRunById(runId);
  return run ? normalizeDiscoveryRun(run) : null;
}

export async function getDynamicDiscoveryRunProgress(runId: string) {
  const run = await findDynamicDiscoveryRunProgressById(runId);
  return (run ?? null) as DiscoveryRunProgressState | null;
}

export async function getLatestDynamicDiscoveryRun() {
  const run = await findLatestDynamicDiscoveryRunByStatuses([
    "running",
    "cancelled",
    "completed",
    "failed",
  ]);

  return run ? normalizeDiscoveryRun(run) : null;
}

export async function cancelDynamicDiscovery(runId: string) {
  const run = await findDynamicDiscoveryRunById(runId);

  if (!run) {
    return { error: "Descoberta nao encontrada." };
  }

  if (run.status !== "running") {
    return { error: "Essa descoberta nao esta mais em andamento." };
  }

  await updateDiscoveryRun(runId, {
    cancelRequested: true,
  });

  return { success: true };
}

export async function forceStopDynamicDiscovery(runId: string) {
  const run = await findDynamicDiscoveryRunById(runId);

  if (!run) {
    return { error: "Descoberta nao encontrada." };
  }

  if (run.status !== "running") {
    return { error: "Essa descoberta ja nao esta em andamento." };
  }

  const normalizedRun = normalizeDiscoveryRun(run);
  const logs = [
    ...normalizedRun.logs,
    "Descoberta encerrada manualmente para destravar a fila.",
  ];

  await updateDiscoveryRun(runId, {
    status: "failed",
    cancelRequested: false,
    finishedAt: new Date(),
    logs,
  });

  return { success: true };
}
