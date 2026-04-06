import { DynamicProduct, Prisma } from "@prisma/client";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getDynamicCatalogCacheTag } from "@/lib/dynamicCatalogCache";
import {
  getDynamicDisplayPrice,
  getDynamicFallbackConfig,
  type DynamicProductFallbackState,
} from "@/lib/dynamicFallback";
import {
  normalizeDynamicDisplayConfig,
  type DynamicCategoryMetricSettings,
} from "@/lib/dynamicCategoryMetrics";
import {
  buildPriceDecision,
  PRICE_HISTORY_BADGE_WINDOWS,
  type PriceDecision,
  type PriceHistoryBadgeWindow,
} from "@/lib/priceDecision";
import {
  getAvailablePriceHistoryChartRangesFromWindows,
  type PriceHistoryChartRange,
  shiftPriceHistoryDateKey,
  getPriceHistoryBusinessDateKey,
} from "@/lib/dynamicPriceHistory";

export type FieldVisibility = "internal" | "public_table" | "public_highlight";

export interface DisplayConfigField {
  key: string;
  label: string;
  type: "text" | "number" | "currency";
  visibility?: FieldVisibility;
  filterable?: boolean;
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

export interface CategorySettings extends DynamicCategoryMetricSettings {
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
  lowestPrice365d: number | null;
  priceHistoryBadgeWindows: PriceHistoryBadgeWindow[];
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
  lowestPrice30d?: number | null;
  highestPrice30d?: number | null;
  lowestPrice365d?: number | null;
  discountPercent?: number | null;
  pricePerDose?: number;
  proteinConcentration?: number;
  isFallbackPrice?: boolean;
  historyAvailableRanges?: PriceHistoryChartRange[];
  priceDecision?: PriceDecision | null;
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
  ratingOptions: Array<{ value: string; label: string }>;
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

type HistoryBadgeRow = {
  productId: string;
} & Record<`collectedDays${(typeof PRICE_HISTORY_BADGE_WINDOWS)[number]}`, number> &
  Record<`lowestPrice${(typeof PRICE_HISTORY_BADGE_WINDOWS)[number]}`, number | null>;

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

const isFieldFilterable = (field: DisplayConfigField) => {
  if (field.type === "currency") return false;
  if (typeof field.filterable === "boolean") return field.filterable;
  return field.type === "text" || field.type === "number";
};

const sortFilterValues = (values: string[], type: DisplayConfigField["type"]) => {
  if (type === "number") {
    return [...values].sort((a, b) => Number(a) - Number(b));
  }

  return [...values].sort((a, b) => a.localeCompare(b, "pt-BR"));
};

const formatPetTypeValue = (value: string) => {
  const normalized = removeAccents(value).toLowerCase().replace(/\s+/g, "");

  if (normalized === "cachorro" || normalized === "cao") return "C\u00e3o";
  if (normalized === "gato") return "Gato";
  if (
    normalized === "cachorro/gato" ||
    normalized === "cachorroegato" ||
    normalized === "cachorro,gato" ||
    normalized === "cao/gato" ||
    normalized === "caoegato"
  ) {
    return "C\u00e3o/gato";
  }

  return value;
};

const formatPublicFilterValue = (value: string, config: DisplayConfigField) => {
  if (config.key === "tipo_pet") {
    return formatPetTypeValue(value);
  }

  if (config.type === "number") {
    const numericValue = Number(value);
    if (!Number.isNaN(numericValue)) {
      return Math.round(numericValue).toString();
    }
  }

  return value;
};

type NumericBucketConfig = {
  step?: number;
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

const guessNiceWeightStep = (values: number[]) => {
  const minValue = values[0];
  const maxValue = values[values.length - 1];
  const spread = Math.max(maxValue - minValue, 1);
  const targetBucketCount = 6;
  const roughStep = spread / targetBucketCount;
  const candidates = [
    5, 10, 20, 25, 50, 75, 100, 125, 150, 200, 250, 300, 400, 500, 750, 1000,
    1250, 1500,
  ];

  return (
    candidates.find((candidate) => candidate >= roughStep) ??
    candidates[candidates.length - 1]
  );
};

const guessNiceDoseStep = (values: number[]) => {
  const minValue = values[0];
  const maxValue = values[values.length - 1];
  const spread = Math.max(maxValue - minValue, 1);
  const targetBucketCount = 6;
  const roughStep = spread / targetBucketCount;
  const candidates = [
    1, 2, 5, 10, 15, 20, 25, 30, 50, 60, 75, 100, 120, 150, 200, 250, 300, 500,
  ];

  return (
    candidates.find((candidate) => candidate >= roughStep) ??
    candidates[candidates.length - 1]
  );
};

const guessNiceUnitsStep = (values: number[]) => {
  const minValue = values[0];
  const maxValue = values[values.length - 1];
  const spread = Math.max(maxValue - minValue, 1);
  const targetBucketCount = 4;
  const roughStep = spread / targetBucketCount;
  const candidates = [
    5, 10, 20, 25, 30, 40, 50, 60, 100, 120, 150, 200, 250, 300, 500,
  ];

  return (
    candidates.find((candidate) => candidate >= roughStep) ??
    candidates[candidates.length - 1]
  );
};

const guessNiceProteinOrDoseGramStep = (values: number[]) => {
  const minValue = values[0];
  const maxValue = values[values.length - 1];
  const spread = Math.max(maxValue - minValue, 1);
  const targetBucketCount = 4;
  const roughStep = spread / targetBucketCount;
  const candidates = [
    5, 10, 15, 20, 25, 30, 40, 50, 60,
  ];

  return (
    candidates.find((candidate) => candidate >= roughStep) ??
    candidates[candidates.length - 1]
  );
};

const getNumericBucketConfig = ({
  config,
  values,
  group,
  slug,
}: {
  config: DisplayConfigField;
  values: number[];
  group?: string;
  slug?: string;
}): NumericBucketConfig | null => {
  if (config.type !== "number" || values.length === 0) {
    return null;
  }

  const normalized = removeAccents(`${config.key} ${config.label}`.toLowerCase());
  const normalizedCategory = removeAccents(`${group || ""} ${slug || ""}`.toLowerCase());

  const normalizedKey = removeAccents((config.key || "").toLowerCase()).replace(/[^a-z0-9]+/g, "");

  if (normalizedKey === "weightgrams" || normalized.includes("peso")) {
    return { step: guessNiceWeightStep(values) };
  }

  if (
    normalizedKey === "units" ||
    normalizedKey === "unitsperbox" ||
    normalized.includes("unidade") ||
    normalized.includes("units")
  ) {
    return { step: guessNiceUnitsStep(values) };
  }

  if (
    normalizedKey === "proteinperdoseingrams" ||
    normalized.includes("proteina")
  ) {
    return { step: guessNiceProteinOrDoseGramStep(values) };
  }

  if (
    normalizedKey === "doseingrams" ||
    normalizedKey === "unitsperdose" ||
    normalized.includes("dose (g)") ||
    normalized.includes("dose g")
  ) {
    return { step: guessNiceProteinOrDoseGramStep(values) };
  }

  if (
    normalizedKey === "numberofdoses" ||
    normalizedKey === "doses" ||
    (normalized.includes("dose") && !normalized.includes("(g)") && !normalized.includes("dose (g)"))
  ) {
    return { step: guessNiceDoseStep(values) };
  }

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
    if (
      normalizedCategory.includes("saco") &&
      normalizedCategory.includes("lixo") &&
      normalized.includes("litro")
    ) {
      return { step: 20 };
    }

    return { step: 100 };
  }

  return { step: guessNiceStep(values) };
};

const buildBucketedFilterOptions = ({
  values,
  config,
  group,
  slug,
}: {
  values: string[];
  config: DisplayConfigField;
  group?: string;
  slug?: string;
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
    group,
    slug,
  });

  if (config.type !== "number" || !bucketConfig || numericValues.length <= 6) {
    return sortFilterValues(values, config.type).map((value) => ({
      value,
      label: formatPublicFilterValue(value, config),
    }));
  }

  if (!bucketConfig.step || bucketConfig.step <= 0) {
    return sortFilterValues(values, config.type).map((value) => ({
      value,
      label: formatPublicFilterValue(value, config),
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

    const hasValues = numericValues.some((value) => value >= current && value <= next);
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
        label: formatPublicFilterValue(value, config),
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
  const shouldBypassExplicitMetric =
    key === "precoPorGramaCreatina" || key === "precoPor100g";
  const explicitValue = getNumericAttribute(attrs, key);
  if (!shouldBypassExplicitMetric && explicitValue > 0) {
    return explicitValue;
  }

  if (totalPrice <= 0) {
    return 0;
  }

  const unitsPerBox = getNumericAttribute(attrs, "unitsPerBox");
  const unitsPerPack = getNumericAttribute(attrs, "unitsPerPack");
  const units =
    getNumericAttribute(attrs, "units") ||
    getNumericAttribute(attrs, "unidades") ||
    getNumericAttribute(attrs, "quantidade");
  const numberOfDoses =
    getNumericAttribute(attrs, "numberOfDoses") || getNumericAttribute(attrs, "doses");
  const totalProteinInGrams = getNumericAttribute(attrs, "totalProteinInGrams");
  const cafeinaTotalMg = getNumericAttribute(attrs, "cafeinaTotalMg");
  const creatinaPorDose = getNumericAttribute(attrs, "creatinaPorDose");

  switch (key) {
    case "precoPorBarra":
      return unitsPerBox > 0 ? totalPrice / unitsPerBox : 0;
    case "precoPorUnidade":
      return unitsPerPack > 0
        ? totalPrice / unitsPerPack
        : units > 0
          ? totalPrice / units
          : 0;
    case "precoPorDose":
      return numberOfDoses > 0 ? totalPrice / numberOfDoses : 0;
    case "precoPorMl":
      return getNumericAttribute(attrs, "volumeMl") > 0
        ? totalPrice / getNumericAttribute(attrs, "volumeMl")
        : 0;
    case "precoPorGrama":
      return getNumericAttribute(attrs, "weightGrams") > 0
        ? totalPrice / getNumericAttribute(attrs, "weightGrams")
        : 0;
    case "precoPor100g":
      return getNumericAttribute(attrs, "weightGrams") > 0
        ? (totalPrice / getNumericAttribute(attrs, "weightGrams")) * 100
        : 0;
    case "precoPorMetro":
      return getNumericAttribute(attrs, "meters") > 0
        ? totalPrice / getNumericAttribute(attrs, "meters")
        : 0;
    case "precoPorLavagem":
      return getNumericAttribute(attrs, "washes") > 0
        ? totalPrice / getNumericAttribute(attrs, "washes")
        : 0;
    case "precoPorCapsula":
      return getNumericAttribute(attrs, "capsules") > 0
        ? totalPrice / getNumericAttribute(attrs, "capsules")
        : 0;
    case "precoPorGramaProteina":
      return totalProteinInGrams > 0 ? totalPrice / totalProteinInGrams : 0;
    case "precoPor100MgCafeina":
      return cafeinaTotalMg > 0 ? (totalPrice / cafeinaTotalMg) * 100 : 0;
    case "precoPorGramaCreatina": {
      const explicitPricePerDose = getNumericAttribute(attrs, "precoPorDose");
      const derivedPricePerDose =
        explicitPricePerDose > 0
          ? explicitPricePerDose
          : numberOfDoses > 0
            ? totalPrice / numberOfDoses
            : 0;

      return creatinaPorDose > 0 && derivedPricePerDose > 0
        ? derivedPricePerDose / creatinaPorDose
        : 0;
    }
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
  return normalizeDynamicDisplayConfig(rawConfig) as DisplayConfigPayload;
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
    case "precoPorMl":
      return "Baseado em R$/ml";
    case "precoPorGrama":
      return "Baseado em R$/g";
    case "precoPor100g":
      return "Baseado em R$/100g";
    case "precoPorMetro":
      return "Baseado em R$/metro";
    case "precoPorLavagem":
      return "Baseado em R$/lavagem";
    case "precoPorCapsula":
      return "Baseado em R$/capsula";
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
            where: { visibilityStatus: "visible" },
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
                  lowestPrice365d: number | null;
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
                "highestPrice30d",
                "lowestPrice365d"
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

      const todayKey = getPriceHistoryBusinessDateKey();
      const historySince30 = shiftPriceHistoryDateKey(todayKey, -29);
      const historySince60 = shiftPriceHistoryDateKey(todayKey, -59);
      const historySince90 = shiftPriceHistoryDateKey(todayKey, -89);
      const historySince120 = shiftPriceHistoryDateKey(todayKey, -119);
      const historySince150 = shiftPriceHistoryDateKey(todayKey, -149);
      const historySince180 = shiftPriceHistoryDateKey(todayKey, -179);
      const historySince210 = shiftPriceHistoryDateKey(todayKey, -209);
      const historySince240 = shiftPriceHistoryDateKey(todayKey, -239);
      const historySince270 = shiftPriceHistoryDateKey(todayKey, -269);
      const historySince300 = shiftPriceHistoryDateKey(todayKey, -299);
      const historySince330 = shiftPriceHistoryDateKey(todayKey, -329);
      const historySince365 = shiftPriceHistoryDateKey(todayKey, -364);

      const historyBadgeRows =
        productIds.length > 0
          ? await prisma.$queryRaw<HistoryBadgeRow[]>(Prisma.sql`
              WITH "dailyHistory" AS (
                SELECT DISTINCT ON ("productId", DATE("date"))
                  "productId",
                  DATE("date") AS "historyDate",
                  "price"
                FROM "DynamicPriceHistory"
                WHERE
                  "productId" IN (${Prisma.join(productIds)})
                  AND DATE("date") >= ${historySince365}::date
                  AND "price" > 0
                ORDER BY "productId", DATE("date"), "date" DESC, "updatedAt" DESC, "createdAt" DESC
              )
              SELECT
                "productId",
                COUNT(*) FILTER (
                  WHERE "historyDate" >= ${historySince30}::date
                )::int AS "collectedDays30",
                MIN("price") FILTER (
                  WHERE "historyDate" >= ${historySince30}::date
                )::float AS "lowestPrice30",
                COUNT(*) FILTER (
                  WHERE "historyDate" >= ${historySince60}::date
                )::int AS "collectedDays60",
                MIN("price") FILTER (
                  WHERE "historyDate" >= ${historySince60}::date
                )::float AS "lowestPrice60",
                COUNT(*) FILTER (
                  WHERE "historyDate" >= ${historySince90}::date
                )::int AS "collectedDays90",
                MIN("price") FILTER (
                  WHERE "historyDate" >= ${historySince90}::date
                )::float AS "lowestPrice90",
                COUNT(*) FILTER (
                  WHERE "historyDate" >= ${historySince120}::date
                )::int AS "collectedDays120",
                MIN("price") FILTER (
                  WHERE "historyDate" >= ${historySince120}::date
                )::float AS "lowestPrice120",
                COUNT(*) FILTER (
                  WHERE "historyDate" >= ${historySince150}::date
                )::int AS "collectedDays150",
                MIN("price") FILTER (
                  WHERE "historyDate" >= ${historySince150}::date
                )::float AS "lowestPrice150",
                COUNT(*) FILTER (
                  WHERE "historyDate" >= ${historySince180}::date
                )::int AS "collectedDays180",
                MIN("price") FILTER (
                  WHERE "historyDate" >= ${historySince180}::date
                )::float AS "lowestPrice180",
                COUNT(*) FILTER (
                  WHERE "historyDate" >= ${historySince210}::date
                )::int AS "collectedDays210",
                MIN("price") FILTER (
                  WHERE "historyDate" >= ${historySince210}::date
                )::float AS "lowestPrice210",
                COUNT(*) FILTER (
                  WHERE "historyDate" >= ${historySince240}::date
                )::int AS "collectedDays240",
                MIN("price") FILTER (
                  WHERE "historyDate" >= ${historySince240}::date
                )::float AS "lowestPrice240",
                COUNT(*) FILTER (
                  WHERE "historyDate" >= ${historySince270}::date
                )::int AS "collectedDays270",
                MIN("price") FILTER (
                  WHERE "historyDate" >= ${historySince270}::date
                )::float AS "lowestPrice270",
                COUNT(*) FILTER (
                  WHERE "historyDate" >= ${historySince300}::date
                )::int AS "collectedDays300",
                MIN("price") FILTER (
                  WHERE "historyDate" >= ${historySince300}::date
                )::float AS "lowestPrice300",
                COUNT(*) FILTER (
                  WHERE "historyDate" >= ${historySince330}::date
                )::int AS "collectedDays330",
                MIN("price") FILTER (
                  WHERE "historyDate" >= ${historySince330}::date
                )::float AS "lowestPrice330",
                COUNT(*) FILTER (
                  WHERE "historyDate" >= ${historySince365}::date
                )::int AS "collectedDays365",
                MIN("price") FILTER (
                  WHERE "historyDate" >= ${historySince365}::date
                )::float AS "lowestPrice365"
              FROM "dailyHistory"
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

      const historyBadgeMap = new Map(
        historyBadgeRows.map((row) => [
          row.productId,
          PRICE_HISTORY_BADGE_WINDOWS.map((days) => ({
            days,
            collectedDays: row[`collectedDays${days}`] ?? 0,
            lowestPrice: row[`lowestPrice${days}`] ?? null,
          })),
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
            lowestPrice365d: row.lowestPrice365d,
            priceHistoryBadgeWindows: historyBadgeMap.get(row.id) ?? [],
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
            lowestPrice365d: productState?.lowestPrice365d ?? null,
            priceHistoryBadgeWindows: productState?.priceHistoryBadgeWindows ?? [],
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
      tags: [getDynamicCatalogCacheTag(group, slug)],
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
    (c) => isFieldFilterable(c)
  ).sort((a, b) => {
    const aLabel = removeAccents(a.label.toLowerCase());
    const bLabel = removeAccents(b.label.toLowerCase());
    return aLabel.localeCompare(bLabel, "pt-BR");
  });

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

  const selectedRatings = search.rating
    ? String(search.rating)
        .split(",")
        .map((s) => Number(s.trim()))
        .filter((value) => Number.isFinite(value) && value > 0)
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
    if (selectedRatings.length > 0) {
      const productRating = Number(p.ratingAverage || 0);
      const meetsAnySelectedRating = selectedRatings.some(
        (minRating) => productRating >= minRating
      );
      if (!meetsAnySelectedRating) return false;
    }

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
          return numericValue >= parsedRange.min && numericValue <= parsedRange.max;
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
    const lowestPrice30d = p.lowestPrice30d ?? null;
    const highestPrice30d = p.highestPrice30d ?? null;
    const lowestPrice365d = p.lowestPrice365d ?? null;
    const historyAvailableRanges = getAvailablePriceHistoryChartRangesFromWindows(
      p.priceHistoryBadgeWindows
    );
    let discountPercent: number | null = null;

    if (
      historyAvailableRanges.length > 0 &&
      avgMonthly &&
      avgMonthly > p.displayPrice
    ) {
      const raw = ((avgMonthly - p.displayPrice) / avgMonthly) * 100;
      if (raw >= 5) {
        discountPercent = Math.round(raw);
      }
    }

    const priceDecision = buildPriceDecision({
      currentPrice: p.displayPrice,
      averagePrice30d: avgMonthly,
      historyWindows: p.priceHistoryBadgeWindows,
    });
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
      lowestPrice30d,
      highestPrice30d,
      lowestPrice365d,
      discountPercent,
      pricePerDose,
      proteinConcentration,
      isFallbackPrice: p.isFallbackPrice,
      historyAvailableRanges,
      priceDecision,
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
        group,
        slug,
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
    ratingOptions: [{ value: "4", label: "★★★★ e acima" }],
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
