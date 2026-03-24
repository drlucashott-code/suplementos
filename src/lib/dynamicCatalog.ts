import { DynamicProduct, Prisma } from "@prisma/client";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  getDynamicDisplayPrice,
  getDynamicFallbackConfig,
  type DynamicProductFallbackState,
} from "@/lib/dynamicFallback";

export type FieldVisibility = "internal" | "public_table" | "public_highlight";

export interface DisplayConfigField {
  key: string;
  label: string;
  type: "text" | "number" | "currency";
  visibility?: FieldVisibility;
  public?: boolean;
  prefix?: string;
  suffix?: string;
  hideLabel?: boolean;
}

export type SortOptionValue =
  | "best_value"
  | "price_asc"
  | "discount"
  | "dose_price_asc"
  | "protein_pct_desc";

export interface CategorySettings {
  analysisTitleTemplate?: string;
  enabledSorts?: SortOptionValue[];
  defaultSort?: SortOptionValue;
  bestValueAttributeKey?: string;
  dosePriceAttributeKey?: string;
  customSorts?: Array<{
    value: string;
    label: string;
    attributeKey: string;
    direction: "asc" | "desc";
  }>;
}

interface DisplayConfigPayload {
  fields: DisplayConfigField[];
  settings?: CategorySettings;
}

interface DynamicAttributes {
  brand?: string;
  seller?: string;
  [key: string]: string | number | boolean | undefined;
}

type ProductWithStats = DynamicProduct & {
  averagePrice30d: number | null;
  lowestPrice30d: number | null;
  highestPrice30d: number | null;
  likeCount: number;
  dislikeCount: number;
};

type VisibleProductWithStats = ProductWithStats & {
  displayPrice: number;
  isFallbackPrice: boolean;
};

export type CatalogProduct = {
  id: string;
  name: string;
  imageUrl: string;
  price: number;
  affiliateUrl: string;
  pricePerUnit: number;
  ratingAverage?: number | null;
  ratingCount?: number | null;
  likeCount?: number;
  dislikeCount?: number;
  avgPrice?: number | null;
  discountPercent?: number | null;
  pricePerDose?: number;
  proteinConcentration?: number;
  isFallbackPrice?: boolean;
  attributes: Record<string, string | number | undefined>;
};

export type CatalogSortOption = {
  value: string;
  label: string;
};

export type DynamicCatalogData = {
  categoryName: string;
  categorySettings: CategorySettings;
  publicTableConfig: DisplayConfigField[];
  publicHighlightConfig: DisplayConfigField[];
  filterableConfigs: DisplayConfigField[];
  sortedBrands: string[];
  sortedSellers: string[];
  sortedDynamicOptions: Record<string, Array<{ value: string; label: string }>>;
  allSortOptions: CatalogSortOption[];
  defaultOrder: string;
  bestValueHelperText: string;
  fallbackEnabled: boolean;
  fallbackMaxAgeHours: number;
  totalProducts: number;
  products: CatalogProduct[];
  hasMore: boolean;
};

type CategoryWithVisibleProducts = {
  id: string;
  name: string;
  displayConfig: unknown;
  products: DynamicProduct[];
};

type ReactionCountRow = {
  productId: string;
  likeCount: number;
  dislikeCount: number;
};

const AMAZON_OFFICIAL = "Amazon.com.br";

const SORT_OPTION_LABELS: Record<SortOptionValue, string> = {
  best_value: "Melhor custo-beneficio",
  price_asc: "Menor preco final",
  discount: "Maior desconto",
  dose_price_asc: "Menor preco da dose",
  protein_pct_desc: "Maior % de proteina",
};

const removeAccents = (str: string) => {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
};

const getFieldVisibility = (field: DisplayConfigField): FieldVisibility => {
  if (field.visibility) return field.visibility;
  return field.public === false ? "internal" : "public_table";
};

const sortFilterValues = (values: string[], type: DisplayConfigField["type"]) => {
  if (type === "number") {
    return [...values].sort((a, b) => Number(a) - Number(b));
  }

  return [...values].sort((a, b) => a.localeCompare(b, "pt-BR"));
};

const formatPublicFilterValue = (value: string, type: DisplayConfigField["type"]) => {
  if (type === "number") {
    const numericValue = Number(value);
    if (!Number.isNaN(numericValue)) {
      return Math.round(numericValue).toString();
    }
  }

  return value;
};

type NumericBucketConfig = {
  step: number;
  openEndedFrom?: number;
};

const parseRangeFilterToken = (value: string) => {
  if (!value.startsWith("range:")) return null;

  const [, minRaw, maxRaw] = value.split(":");
  const min = Number(minRaw);
  const max = maxRaw ? Number(maxRaw) : null;

  if (Number.isNaN(min)) return null;
  if (max !== null && Number.isNaN(max)) return null;

  return { min, max };
};

const formatRangeNumber = (value: number) => {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
};

const guessNiceStep = (values: number[]) => {
  const minValue = values[0];
  const maxValue = values[values.length - 1];
  const spread = Math.max(maxValue - minValue, 1);
  const targetBucketCount = 5;
  const roughStep = spread / targetBucketCount;
  const candidates = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000];

  return (
    candidates.find((candidate) => candidate >= roughStep) ??
    candidates[candidates.length - 1]
  );
};

const getNumericBucketConfig = ({
  config,
  values,
}: {
  config: DisplayConfigField;
  values: number[];
}): NumericBucketConfig | null => {
  if (config.type !== "number" || values.length === 0) {
    return null;
  }

  const normalized = removeAccents(`${config.key} ${config.label}`.toLowerCase());

  if (
    normalized.includes("conc") ||
    normalized.includes("concentration") ||
    normalized.includes("percentage") ||
    normalized.includes("percentual")
  ) {
    return { step: 10, openEndedFrom: 90 };
  }

  if (
    normalized.includes("protein") ||
    normalized.includes("proteina") ||
    normalized.includes("grama") ||
    normalized.includes("grams") ||
    (normalized.includes("dose") && normalized.includes("g"))
  ) {
    return { step: 5 };
  }

  if (
    normalized.includes("dose") ||
    normalized.includes("lavagen") ||
    normalized.includes("metro") ||
    normalized.includes("unidade") ||
    normalized.includes("units") ||
    normalized.includes("caps")
  ) {
    return { step: 10 };
  }

  if (
    normalized.includes("ml") ||
    normalized.includes("volume") ||
    normalized.includes("litro") ||
    normalized.includes("gramas por") ||
    normalized.includes("gramas total")
  ) {
    return { step: 100 };
  }

  return { step: guessNiceStep(values) };
};

const buildBucketedFilterOptions = ({
  values,
  config,
}: {
  values: string[];
  config: DisplayConfigField;
}) => {
  const numericValues = Array.from(
    new Set(
      values
        .map((value) => Number(value))
        .filter((value) => !Number.isNaN(value) && value > 0)
    )
  ).sort((a, b) => a - b);

  const bucketConfig = getNumericBucketConfig({
    config,
    values: numericValues,
  });

  if (config.type !== "number" || !bucketConfig || numericValues.length <= 6) {
    return sortFilterValues(values, config.type).map((value) => ({
      value,
      label: formatPublicFilterValue(value, config.type),
    }));
  }

  const step = bucketConfig.step;
  const minValue = numericValues[0];
  const maxValue = numericValues[numericValues.length - 1];
  const bucketStart = Math.floor(minValue / step) * step;
  const bucketEnd = Math.ceil(maxValue / step) * step;
  const options: Array<{ value: string; label: string }> = [];

  for (let current = bucketStart; current < bucketEnd; current += step) {
    const next = current + step;

    if (bucketConfig.openEndedFrom !== undefined && current >= bucketConfig.openEndedFrom) {
      const hasValues = numericValues.some((value) => value >= current);
      if (hasValues) {
        options.push({
          value: `range:${current}:`,
          label: `${formatRangeNumber(current)}+`,
        });
      }
      break;
    }

    const hasValues = numericValues.some((value) => value >= current && value < next);
    if (!hasValues) continue;

    options.push({
      value: `range:${current}:${next}`,
      label: `${formatRangeNumber(current)}-${formatRangeNumber(next)}`,
    });
  }

  return options.length > 0
    ? options
    : sortFilterValues(values, config.type).map((value) => ({
        value,
        label: formatPublicFilterValue(value, config.type),
      }));
};

const getNumericAttribute = (attrs: DynamicAttributes, key: string) => {
  const value = Number(attrs[key]);
  return Number.isNaN(value) ? 0 : value;
};

const getDerivedAttributeMetric = (
  attrs: DynamicAttributes,
  key: string,
  totalPrice: number
) => {
  const explicitValue = getNumericAttribute(attrs, key);
  if (explicitValue > 0) {
    return explicitValue;
  }

  if (totalPrice <= 0) {
    return 0;
  }

  const unitsPerBox = getNumericAttribute(attrs, "unitsPerBox");
  const unitsPerPack = getNumericAttribute(attrs, "unitsPerPack");
  const numberOfDoses =
    getNumericAttribute(attrs, "numberOfDoses") || getNumericAttribute(attrs, "doses");
  const totalProteinInGrams = getNumericAttribute(attrs, "totalProteinInGrams");
  const cafeinaTotalMg = getNumericAttribute(attrs, "cafeinaTotalMg");
  const gramasCreatinaPuraNoPote = getNumericAttribute(
    attrs,
    "gramasCreatinaPuraNoPote"
  );

  switch (key) {
    case "precoPorBarra":
      return unitsPerBox > 0 ? totalPrice / unitsPerBox : 0;
    case "precoPorUnidade":
      return unitsPerPack > 0 ? totalPrice / unitsPerPack : 0;
    case "precoPorDose":
      return numberOfDoses > 0 ? totalPrice / numberOfDoses : 0;
    case "precoPorGramaProteina":
      return totalProteinInGrams > 0 ? totalPrice / totalProteinInGrams : 0;
    case "precoPor100MgCafeina":
      return cafeinaTotalMg > 0 ? (totalPrice / cafeinaTotalMg) * 100 : 0;
    case "precoPorGramaCreatina":
      return gramasCreatinaPuraNoPote > 0 ? totalPrice / gramasCreatinaPuraNoPote : 0;
    case "proteinConcentration":
      return (
        getNumericAttribute(attrs, "proteinConcentration") ||
        getNumericAttribute(attrs, "proteinPercentage")
      );
    default:
      return 0;
  }
};

const getConfiguredCurrencyMetric = (
  attrs: DynamicAttributes,
  displayConfig: DisplayConfigField[],
  totalPrice: number,
  preferredAttributeKey?: string
) => {
  if (preferredAttributeKey) {
    const preferredMetric = getDerivedAttributeMetric(
      attrs,
      preferredAttributeKey,
      totalPrice
    );
    if (preferredMetric > 0) {
      return preferredMetric;
    }
  }

  const currencyConfig = displayConfig.find((c) => c.type === "currency");

  if (!currencyConfig) {
    return 0;
  }

  const rawMetric = getDerivedAttributeMetric(attrs, currencyConfig.key, totalPrice);
  if (rawMetric > 0) {
    return rawMetric;
  }

  const quantityConfig = displayConfig.find((c) => c.type === "number");
  const quantity = quantityConfig ? Number(attrs[quantityConfig.key]) : 0;

  if (quantity > 0 && totalPrice > 0) {
    return totalPrice / quantity;
  }

  return 0;
};

const normalizeDisplayConfig = (rawConfig: unknown): DisplayConfigPayload => {
  if (Array.isArray(rawConfig)) {
    return {
      fields: rawConfig as DisplayConfigField[],
      settings: {},
    };
  }

  if (
    rawConfig &&
    typeof rawConfig === "object" &&
    Array.isArray((rawConfig as DisplayConfigPayload).fields)
  ) {
    return rawConfig as DisplayConfigPayload;
  }

  return {
    fields: [],
    settings: {},
  };
};

const getBestValueHelperText = (attributeKey?: string) => {
  switch (attributeKey) {
    case "precoPorGramaProteina":
      return "Baseado em R$/g de proteina";
    case "precoPor100MgCafeina":
      return "Baseado em R$/100mg de cafeina";
    case "precoPorGramaCreatina":
      return "Baseado em R$/g de creatina";
    case "precoPorDose":
      return "Baseado em R$/dose";
    case "precoPorBarra":
      return "Baseado em R$/barra";
    case "precoPorUnidade":
      return "Baseado em R$/unidade";
    default:
      return "";
  }
};

async function fetchDynamicCatalogBaseData(
  group: string,
  slug: string
): Promise<{
  categoryData: CategoryWithVisibleProducts;
  fallbackConfig: Awaited<ReturnType<typeof getDynamicFallbackConfig>>;
  visibleProducts: VisibleProductWithStats[];
} | null> {
  const getCachedBaseData = unstable_cache(
    async () => {
      const categoryData = await prisma.dynamicCategory.findFirst({
        where: {
          slug,
          group,
        },
        include: {
          products: {
            where: { isVisibleOnSite: true },
            orderBy: { totalPrice: "asc" },
          },
        },
      });

      if (!categoryData) return null;

      const fallbackConfig = await getDynamicFallbackConfig();
      const productIds = categoryData.products.map((product) => product.id);

      const fallbackRows =
        productIds.length > 0
          ? await prisma.$queryRaw<
              Array<
                DynamicProductFallbackState & {
                  id: string;
                  averagePrice30d: number | null;
                  lowestPrice30d: number | null;
                  highestPrice30d: number | null;
                }
              >
            >(Prisma.sql`
              SELECT
                "id",
                "lastValidPrice",
                "lastValidPriceAt",
                "availabilityStatus",
                "averagePrice30d",
                "lowestPrice30d",
                "highestPrice30d"
              FROM "DynamicProduct"
              WHERE "id" IN (${Prisma.join(productIds)})
            `)
          : [];

      const reactionRows =
        productIds.length > 0
          ? await prisma.$queryRaw<ReactionCountRow[]>(Prisma.sql`
              SELECT
                "productId",
                COUNT(*) FILTER (WHERE "reaction" = 'like')::int AS "likeCount",
                COUNT(*) FILTER (WHERE "reaction" = 'dislike')::int AS "dislikeCount"
              FROM "DynamicProductReaction"
              WHERE "productId" IN (${Prisma.join(productIds)})
              GROUP BY "productId"
            `)
          : [];

      const reactionMap = new Map(
        reactionRows.map((row) => [
          row.productId,
          {
            likeCount: row.likeCount,
            dislikeCount: row.dislikeCount,
          },
        ])
      );

      const productStateMap = new Map(
        fallbackRows.map((row) => [
          row.id,
          {
            lastValidPrice: row.lastValidPrice,
            lastValidPriceAt: row.lastValidPriceAt,
            availabilityStatus: row.availabilityStatus,
            averagePrice30d: row.averagePrice30d,
            lowestPrice30d: row.lowestPrice30d,
            highestPrice30d: row.highestPrice30d,
            likeCount: reactionMap.get(row.id)?.likeCount ?? 0,
            dislikeCount: reactionMap.get(row.id)?.dislikeCount ?? 0,
          },
        ])
      );

      const visibleProducts: VisibleProductWithStats[] = categoryData.products
        .map((product) => {
          const productState = productStateMap.get(product.id);
          const fallbackState: DynamicProductFallbackState | undefined = productState
            ? {
                lastValidPrice: productState.lastValidPrice,
                lastValidPriceAt: productState.lastValidPriceAt,
                availabilityStatus: productState.availabilityStatus,
              }
            : undefined;
          const displayPrice = getDynamicDisplayPrice({
            currentPrice: product.totalPrice,
            fallbackState,
            config: fallbackConfig,
          });

          return {
            ...product,
            averagePrice30d: productState?.averagePrice30d ?? null,
            lowestPrice30d: productState?.lowestPrice30d ?? null,
            highestPrice30d: productState?.highestPrice30d ?? null,
            likeCount: productState?.likeCount ?? 0,
            dislikeCount: productState?.dislikeCount ?? 0,
            displayPrice,
            isFallbackPrice:
              product.totalPrice <= 0 &&
              displayPrice > 0 &&
              displayPrice !== product.totalPrice,
          };
        })
        .filter((product) => product.displayPrice > 0);

      return {
        categoryData,
        fallbackConfig,
        visibleProducts,
      };
    },
    ["dynamic-catalog-base", group, slug],
    {
      revalidate: 300,
    }
  );

  return getCachedBaseData();
}

export async function getDynamicCatalogData({
  group,
  slug,
  search,
  limit,
  offset,
}: {
  group: string;
  slug: string;
  search: Record<string, string | string[] | undefined>;
  limit: number;
  offset: number;
}): Promise<DynamicCatalogData | null> {
  const baseData = await fetchDynamicCatalogBaseData(group, slug);
  if (!baseData) return null;

  const { categoryData, fallbackConfig, visibleProducts } = baseData;

  const normalizedDisplayConfig = normalizeDisplayConfig(categoryData.displayConfig);
  const fullDisplayConfig = normalizedDisplayConfig.fields;
  const categorySettings = normalizedDisplayConfig.settings ?? {};

  const publicTableConfig = fullDisplayConfig.filter(
    (c) => getFieldVisibility(c) === "public_table"
  );

  const publicHighlightConfig = fullDisplayConfig.filter(
    (c) => getFieldVisibility(c) === "public_highlight"
  );

  const filterableConfigs = fullDisplayConfig.filter(
    (c) => c.type === "text" || c.type === "number"
  );

  const availableBrands = new Set<string>();
  const availableSellers = new Set<string>();
  const dynamicFilterOptions: Record<string, Set<string>> = {};

  filterableConfigs.forEach((c) => {
    dynamicFilterOptions[c.key] = new Set();
  });

  visibleProducts.forEach((p) => {
    const attrs = p.attributes as unknown as DynamicAttributes;

    if (attrs.brand) availableBrands.add(String(attrs.brand).trim());
    if (attrs.seller) availableSellers.add(String(attrs.seller).trim());

    filterableConfigs.forEach((config) => {
      const val = attrs[config.key];
      if (val !== undefined && val !== null && String(val).trim() !== "") {
        dynamicFilterOptions[config.key].add(String(val).trim());
      }
    });
  });

  const searchQuery = (search.q as string) || "";
  const stopWords = ["de", "da", "do", "para", "com"];
  const searchWords = searchQuery
    .trim()
    .split(/\s+/)
    .map((word) => removeAccents(word.toLowerCase()))
    .filter((word) => !stopWords.includes(word) && word.length > 0);

  const selectedBrands = search.brand
    ? String(search.brand)
        .split(",")
        .map((s) => s.trim().toLowerCase())
    : [];

  const selectedSellers = search.seller
    ? String(search.seller)
        .split(",")
        .map((s) => s.trim().toLowerCase())
    : [];

  const matchedProducts = visibleProducts.filter((p) => {
    const attrs = p.attributes as unknown as DynamicAttributes;
    const pBrand = String(attrs.brand || "").trim().toLowerCase();
    const pSeller = String(attrs.seller || "").trim().toLowerCase();

    if (searchWords.length > 0) {
      const productText = removeAccents(`${p.name} ${pBrand}`.toLowerCase());
      if (!searchWords.every((word) => productText.includes(word))) return false;
    }

    if (selectedBrands.length > 0 && !selectedBrands.includes(pBrand)) return false;
    if (selectedSellers.length > 0 && !selectedSellers.includes(pSeller)) return false;

    for (const config of filterableConfigs) {
      const paramValue = search[config.key];
      if (!paramValue) continue;

      const selectedDynamic = (
        typeof paramValue === "string" ? paramValue.split(",") : paramValue
      ).map((s) => String(s).trim().toLowerCase());

      const rawValue = String(attrs[config.key] || "").trim();
      const normalizedValue = rawValue.toLowerCase();

      const matchesAnySelected = selectedDynamic.some((selectedValue) => {
        const parsedRange = parseRangeFilterToken(selectedValue);

        if (parsedRange) {
          const numericValue = Number(rawValue);
          if (Number.isNaN(numericValue)) return false;
          if (parsedRange.max === null) return numericValue >= parsedRange.min;
          return numericValue >= parsedRange.min && numericValue < parsedRange.max;
        }

        return selectedValue === normalizedValue;
      });

      if (selectedDynamic.length > 0 && !matchesAnySelected) {
        return false;
      }
    }

    return true;
  });

  const hasDoseMetric = matchedProducts.some((p) => {
    const attrs = p.attributes as unknown as DynamicAttributes;
    return (
      getNumericAttribute(attrs, "precoPorDose") > 0 ||
      getNumericAttribute(attrs, "doses") > 0
    );
  });

  const hasProteinConcentration = matchedProducts.some((p) => {
    const attrs = p.attributes as unknown as DynamicAttributes;
    return (
      getNumericAttribute(attrs, "proteinConcentration") > 0 ||
      getNumericAttribute(attrs, "proteinPercentage") > 0
    );
  });

  const inferredSorts: SortOptionValue[] = ["best_value", "price_asc", "discount"];

  if (hasDoseMetric) {
    inferredSorts.splice(1, 0, "dose_price_asc");
  }

  if (hasProteinConcentration) {
    inferredSorts.push("protein_pct_desc");
  }

  const enabledSorts =
    categorySettings.enabledSorts && categorySettings.enabledSorts.length > 0
      ? categorySettings.enabledSorts.filter((sortValue) => {
          if (sortValue === "dose_price_asc") {
            if (
              categorySettings.bestValueAttributeKey ===
              (categorySettings.dosePriceAttributeKey || "precoPorDose")
            ) {
              return false;
            }

            return hasDoseMetric;
          }

          if (sortValue === "protein_pct_desc") return hasProteinConcentration;
          return true;
        })
      : inferredSorts;

  const sortOptions: CatalogSortOption[] = enabledSorts.map((sortValue) => ({
    value: sortValue,
    label: SORT_OPTION_LABELS[sortValue],
  }));

  const deduplicatedCustomSorts = (categorySettings.customSorts || []).filter(
    (sortItem) => {
      if (!sortItem.value || !sortItem.label || !sortItem.attributeKey) {
        return false;
      }

      const bestValueKey = categorySettings.bestValueAttributeKey;
      const isDuplicateOfBestValue =
        bestValueKey &&
        sortItem.direction === "asc" &&
        sortItem.attributeKey === bestValueKey;

      return !isDuplicateOfBestValue;
    }
  );

  const allSortOptions: CatalogSortOption[] = [
    ...sortOptions,
    ...deduplicatedCustomSorts.map((sortItem) => ({
      value: sortItem.value,
      label: sortItem.label,
    })),
  ];

  const defaultOrder =
    categorySettings.defaultSort && enabledSorts.includes(categorySettings.defaultSort)
      ? categorySettings.defaultSort
      : allSortOptions[0]?.value ?? "best_value";

  const order = (search.order as string) ?? defaultOrder;
  const bestValueHelperText = getBestValueHelperText(
    categorySettings.bestValueAttributeKey
  );

  const rankedProducts = matchedProducts.map((p) => {
    const attrs = p.attributes as unknown as DynamicAttributes;
    const pricePerUnit = getConfiguredCurrencyMetric(
      attrs,
      fullDisplayConfig,
      p.displayPrice,
      categorySettings.bestValueAttributeKey
    );
    const doses = getNumericAttribute(attrs, "doses");
    const explicitPricePerDose = getDerivedAttributeMetric(
      attrs,
      categorySettings.dosePriceAttributeKey || "precoPorDose",
      p.displayPrice
    );
    const pricePerDose =
      explicitPricePerDose > 0
        ? explicitPricePerDose
        : doses > 0 && p.displayPrice > 0
          ? p.displayPrice / doses
          : 0;
    const proteinConcentration = getDerivedAttributeMetric(
      attrs,
      "proteinConcentration",
      p.displayPrice
    );

    const avgMonthly = p.averagePrice30d ?? null;
    let discountPercent: number | null = null;

    if (avgMonthly && avgMonthly > p.displayPrice) {
      const raw = ((avgMonthly - p.displayPrice) / avgMonthly) * 100;
      if (raw >= 5) {
        discountPercent = Math.round(raw);
      }
    }

    return {
      id: p.id,
      name: p.name,
      imageUrl: p.imageUrl || "",
      price: p.displayPrice,
      affiliateUrl: p.url,
      pricePerUnit,
      ratingAverage: p.ratingAverage,
      ratingCount: p.ratingCount,
      likeCount: p.likeCount,
      dislikeCount: p.dislikeCount,
      avgPrice: avgMonthly,
      discountPercent,
      pricePerDose,
      proteinConcentration,
      isFallbackPrice: p.isFallbackPrice,
      attributes: attrs as Record<string, string | number | undefined>,
    } satisfies CatalogProduct;
  });

  const finalProducts = rankedProducts.sort((a, b) => {
    if (order === "discount") {
      const diff = (b.discountPercent ?? 0) - (a.discountPercent ?? 0);
      if (diff !== 0) return diff;
      return a.price - b.price;
    }

    if (order === "price_asc") {
      return a.price - b.price;
    }

    if (order === "dose_price_asc") {
      if (a.pricePerDose && b.pricePerDose && a.pricePerDose > 0 && b.pricePerDose > 0) {
        return a.pricePerDose - b.pricePerDose;
      }
      if (a.pricePerDose && a.pricePerDose > 0) return -1;
      if (b.pricePerDose && b.pricePerDose > 0) return 1;
      return a.price - b.price;
    }

    if (order === "protein_pct_desc") {
      if (
        a.proteinConcentration &&
        b.proteinConcentration &&
        a.proteinConcentration > 0 &&
        b.proteinConcentration > 0
      ) {
        return b.proteinConcentration - a.proteinConcentration;
      }
      if (a.proteinConcentration && a.proteinConcentration > 0) return -1;
      if (b.proteinConcentration && b.proteinConcentration > 0) return 1;
      return a.price - b.price;
    }

    if (order === "best_value") {
      if (a.pricePerUnit > 0 && b.pricePerUnit > 0) {
        return a.pricePerUnit - b.pricePerUnit;
      }
      if (a.pricePerUnit > 0) return -1;
      if (b.pricePerUnit > 0) return 1;
    }

    const customSort = deduplicatedCustomSorts.find(
      (sortItem) => sortItem.value === order
    );
    if (customSort) {
      const aValue = getDerivedAttributeMetric(
        a.attributes as unknown as DynamicAttributes,
        customSort.attributeKey,
        a.price
      );
      const bValue = getDerivedAttributeMetric(
        b.attributes as unknown as DynamicAttributes,
        customSort.attributeKey,
        b.price
      );

      if (aValue !== bValue) {
        if (aValue <= 0) return 1;
        if (bValue <= 0) return -1;
        return customSort.direction === "asc" ? aValue - bValue : bValue - aValue;
      }
    }

    return a.price - b.price;
  });

  const sortedBrands = Array.from(availableBrands).sort((a, b) =>
    a.localeCompare(b, "pt-BR")
  );

  const sortedSellersRaw = Array.from(availableSellers).sort((a, b) =>
    a.localeCompare(b, "pt-BR")
  );

  const sortedSellers = [
    ...sortedSellersRaw.filter((seller) => seller === AMAZON_OFFICIAL),
    ...sortedSellersRaw.filter((seller) => seller !== AMAZON_OFFICIAL),
  ];

  const sortedDynamicOptions = Object.fromEntries(
    filterableConfigs.map((config) => [
      config.key,
      buildBucketedFilterOptions({
        values: Array.from(dynamicFilterOptions[config.key]),
        config,
      }),
    ])
  );

  return {
    categoryName: categoryData.name,
    categorySettings,
    publicTableConfig,
    publicHighlightConfig,
    filterableConfigs,
    sortedBrands,
    sortedSellers,
    sortedDynamicOptions,
    allSortOptions,
    defaultOrder,
    bestValueHelperText,
    fallbackEnabled: fallbackConfig.fallbackEnabled,
    fallbackMaxAgeHours: fallbackConfig.fallbackMaxAgeHours,
    totalProducts: finalProducts.length,
    products: finalProducts.slice(offset, offset + limit),
    hasMore: offset + limit < finalProducts.length,
  };
}
