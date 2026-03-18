import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { ProductList } from "@/components/dynamic/ProductList";
import { MobileFiltersDrawer } from "@/components/dynamic/MobileFiltersDrawer";
import { FloatingFiltersBar } from "@/components/dynamic/FloatingFiltersBar";
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

export default async function DynamicCategoryPage({
  params,
  searchParams,
}: PageProps) {
  const { category: group, slug } = await params;
  const search = await searchParams;

  const order = (search.order as string) ?? "cheapest_unit";
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

  const fullDisplayConfig =
    categoryData.displayConfig as unknown as DisplayConfigField[];

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

  const rankedProducts = matchedProducts.map((p: ProductWithHistory) => {
    const attrs = p.attributes as unknown as DynamicAttributes;
    let pricePerUnit = 0;

    const currencyConfig = fullDisplayConfig.find((c) => c.type === "currency");

    if (currencyConfig) {
      const quantityConfig = fullDisplayConfig.find((c) => c.type === "number");
      const quantity = quantityConfig ? Number(attrs[quantityConfig.key]) : 0;

      if (quantity > 0) {
        pricePerUnit = p.totalPrice / quantity;
      }
    }

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

    if (order === "cheapest_unit") {
      if (a.pricePerUnit > 0 && b.pricePerUnit > 0) {
        return a.pricePerUnit - b.pricePerUnit;
      }
      if (a.pricePerUnit > 0) return -1;
      if (b.pricePerUnit > 0) return 1;
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
      sortFilterValues(Array.from(dynamicFilterOptions[config.key]), config.type),
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
          <FloatingFiltersBar />
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

            <div className="w-full">
              <ProductList
                products={finalProducts}
                viewEventName="view_dynamic_list"
                displayConfig={publicTableConfig}
                highlightConfig={publicHighlightConfig}
              />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
