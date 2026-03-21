import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { ProductList } from "@/components/dynamic/ProductList";
import { MobileFiltersDrawer } from "@/components/dynamic/MobileFiltersDrawer";
import {
  FloatingFiltersBar,
  type DynamicSortOption,
} from "@/components/dynamic/FloatingFiltersBar";
import { AmazonHeader } from "@/components/dynamic/AmazonHeader";
import { DynamicProduct, DynamicPriceHistory } from "@prisma/client";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ category: string; slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

type FieldVisibility = "internal" | "public_table" | "public_highlight";

interface DisplayConfigField {
  key: string;
  label: string;
  type: "text" | "number" | "currency";
  visibility?: FieldVisibility;
  public?: boolean;
  prefix?: string;
  suffix?: string;
  hideLabel?: boolean;
}

type SortOptionValue =
  | "best_value"
  | "price_asc"
  | "discount"
  | "dose_price_asc"
  | "protein_pct_desc";

interface CategorySettings {
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

type ProductWithHistory = DynamicProduct & {
  priceHistory: DynamicPriceHistory[];
};

const AMAZON_OFFICIAL = "Amazon.com.br";

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

const formatPublicFilterValue = (
  value: string,
  type: DisplayConfigField["type"]
) => {
  if (type === "number") {
    const numericValue = Number(value);
    if (!Number.isNaN(numericValue)) {
      return Math.round(numericValue).toString();
    }
  }

  return value;
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

const getNumericAttribute = (
  attrs: DynamicAttributes,
  key: string
) => {
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

const SORT_OPTION_LABELS: Record<SortOptionValue, string> = {
  best_value: "Melhor custo-beneficio",
  price_asc: "Menor preco final",
  discount: "Maior desconto",
  dose_price_asc: "Menor preco da dose",
  protein_pct_desc: "Maior % de proteina",
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

export default async function DynamicCategoryPage({
  params,
  searchParams,
}: PageProps) {
  const { category: group, slug } = await params;
  const search = await searchParams;
  const searchQuery = (search.q as string) || "";

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const categoryData = await prisma.dynamicCategory.findFirst({
    where: {
      slug,
      group,
    },
    include: {
      products: {
        where: {
          totalPrice: { gt: 0 },
        },
        include: {
          priceHistory: {
            where: { createdAt: { gte: thirtyDaysAgo } },
            orderBy: { createdAt: "desc" },
          },
        },
        orderBy: { totalPrice: "asc" },
      },
    },
  });

  if (!categoryData) return notFound();

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

  categoryData.products.forEach((p: ProductWithHistory) => {
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

  const matchedProducts = categoryData.products.filter((p: ProductWithHistory) => {
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

      const pVal = String(attrs[config.key] || "").trim().toLowerCase();

      if (selectedDynamic.length > 0 && !selectedDynamic.includes(pVal)) {
        return false;
      }
    }

    return true;
  });

  const hasDoseMetric = matchedProducts.some((p: ProductWithHistory) => {
    const attrs = p.attributes as unknown as DynamicAttributes;
    return (
      getNumericAttribute(attrs, "precoPorDose") > 0 ||
      getNumericAttribute(attrs, "doses") > 0
    );
  });

  const hasProteinConcentration = matchedProducts.some((p: ProductWithHistory) => {
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

  const sortOptions: DynamicSortOption[] = enabledSorts.map((sortValue) => ({
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

  const allSortOptions: DynamicSortOption[] = [
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

  const rankedProducts = matchedProducts.map((p: ProductWithHistory) => {
    const attrs = p.attributes as unknown as DynamicAttributes;
    const pricePerUnit = getConfiguredCurrencyMetric(
      attrs,
      fullDisplayConfig,
      p.totalPrice,
      categorySettings.bestValueAttributeKey
    );
    const doses = getNumericAttribute(attrs, "doses");
    const explicitPricePerDose = getDerivedAttributeMetric(
      attrs,
      categorySettings.dosePriceAttributeKey || "precoPorDose",
      p.totalPrice
    );
    const pricePerDose =
      explicitPricePerDose > 0
        ? explicitPricePerDose
        : doses > 0 && p.totalPrice > 0
          ? p.totalPrice / doses
          : 0;
    const proteinConcentration = getDerivedAttributeMetric(
      attrs,
      "proteinConcentration",
      p.totalPrice
    );

    let avgMonthly: number | null = null;
    let discountPercent: number | null = null;

    if (p.priceHistory.length > 0) {
      const dailyPrices = new Map<string, number[]>();

      p.priceHistory.forEach((h: DynamicPriceHistory) => {
        const day = h.createdAt.toISOString().split("T")[0];
        if (!dailyPrices.has(day)) dailyPrices.set(day, []);
        dailyPrices.get(day)!.push(h.price);
      });

      const averages = Array.from(dailyPrices.values()).map((arr) => {
        return arr.reduce((a, b) => a + b, 0) / arr.length;
      });

      if (averages.length > 0) {
        avgMonthly = averages.reduce((a, b) => a + b, 0) / averages.length;

        if (avgMonthly > p.totalPrice) {
          const raw = ((avgMonthly - p.totalPrice) / avgMonthly) * 100;
          if (raw >= 5) {
            discountPercent = Math.round(raw);
          }
        }
      }
    }

    return {
      id: p.id,
      name: p.name,
      imageUrl: p.imageUrl || "",
      price: p.totalPrice,
      affiliateUrl: p.url,
      pricePerUnit,
      ratingAverage: p.ratingAverage,
      ratingCount: p.ratingCount,
      avgPrice: avgMonthly,
      discountPercent,
      pricePerDose,
      proteinConcentration,
      attributes: attrs as Record<string, string | number | undefined>,
    };
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
      if (a.pricePerDose > 0 && b.pricePerDose > 0) {
        return a.pricePerDose - b.pricePerDose;
      }
      if (a.pricePerDose > 0) return -1;
      if (b.pricePerDose > 0) return 1;
      return a.price - b.price;
    }

    if (order === "protein_pct_desc") {
      if (a.proteinConcentration > 0 && b.proteinConcentration > 0) {
        return b.proteinConcentration - a.proteinConcentration;
      }
      if (a.proteinConcentration > 0) return -1;
      if (b.proteinConcentration > 0) return 1;
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
      sortFilterValues(Array.from(dynamicFilterOptions[config.key]), config.type).map(
        (value) => ({
          value,
          label: formatPublicFilterValue(value, config.type),
        })
      ),
    ])
  );

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
            sortOptions={allSortOptions}
            defaultOrder={defaultOrder}
          />
        </Suspense>

        <div className="px-3">
          <Suspense fallback={null}>
            <MobileFiltersDrawer
              brands={sortedBrands}
              sellers={sortedSellers}
              dynamicConfigs={filterableConfigs}
              dynamicOptions={sortedDynamicOptions}
            />
          </Suspense>

          <div className="mt-4 w-full pb-10">
            <p className="mb-2 px-1 text-[13px] font-medium text-zinc-800">
              {finalProducts.length} produtos encontrados em {categoryData.name}
            </p>
            {order === "best_value" && bestValueHelperText ? (
              <p className="mb-3 px-1 text-[12px] text-zinc-600">
                {bestValueHelperText}
              </p>
            ) : null}

            <div className="w-full">
              <ProductList
                products={finalProducts}
                viewEventName="view_dynamic_list"
                displayConfig={publicTableConfig}
                highlightConfig={publicHighlightConfig}
                analysisTitleTemplate={categorySettings.analysisTitleTemplate}
              />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
