import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { ProductList } from "@/components/dynamic/ProductList";
import { MobileFiltersDrawer } from "@/components/dynamic/MobileFiltersDrawer";
import { FloatingFiltersBar } from "@/components/dynamic/FloatingFiltersBar"; 
import { AmazonHeader } from "@/components/dynamic/AmazonHeader";
// 🚀 CORREÇÃO: Importando também o DynamicPriceHistory
import { DynamicProduct, DynamicPriceHistory } from "@prisma/client";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ category: string; slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

interface DisplayConfigField {
  key: string;
  label: string;
  type: "text" | "number" | "currency";
  public?: boolean; 
}

interface DynamicAttributes {
  brand?: string;
  seller?: string;
  [key: string]: string | number | boolean | undefined;
}

// 🚀 NOVA TIPAGEM SEGURA (Substitui o 'any')
type ProductWithHistory = DynamicProduct & { 
  priceHistory: DynamicPriceHistory[] 
};

const removeAccents = (str: string) => {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
};

export default async function DynamicCategoryPage({ params, searchParams }: PageProps) {
  const { category: group, slug } = await params;
  const search = await searchParams;
  
  const order = (search.order as string) ?? "cheapest_unit";
  const searchQuery = (search.q as string) || "";

  // 1. Data base para buscar o histórico de 30 dias
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // 2. Query do Prisma atualizada para incluir o priceHistory
  const categoryData = await prisma.dynamicCategory.findFirst({
    where: { 
      slug: slug,
      group: group 
    },
    include: {
      products: { 
        where: {
          totalPrice: { gt: 0 } 
        },
        include: {
          priceHistory: {
            where: { createdAt: { gte: thirtyDaysAgo } },
            orderBy: { createdAt: "desc" }
          }
        },
        orderBy: { totalPrice: "asc" } 
      },
    },
  });

  if (!categoryData) return notFound();

  const fullDisplayConfig = categoryData.displayConfig as unknown as DisplayConfigField[];
  const publicDisplayConfig = fullDisplayConfig.filter(c => c.public !== false);
  const dynamicTextConfigs = fullDisplayConfig.filter((c) => c.type === "text");

  const availableBrands = new Set<string>();
  const availableSellers = new Set<string>();
  const dynamicFilterOptions: Record<string, Set<string>> = {};
  
  dynamicTextConfigs.forEach(c => dynamicFilterOptions[c.key] = new Set());

  // 🚀 CORREÇÃO: Substituído 'any' por 'ProductWithHistory'
  categoryData.products.forEach((p: ProductWithHistory) => {
    const attrs = p.attributes as unknown as DynamicAttributes;
    if (attrs.brand) availableBrands.add(String(attrs.brand).trim());
    if (attrs.seller) availableSellers.add(String(attrs.seller).trim());
    
    dynamicTextConfigs.forEach(config => {
      const val = attrs[config.key];
      if (val !== undefined && val !== null && String(val).trim() !== "") {
        dynamicFilterOptions[config.key].add(String(val).trim());
      }
    });
  });

  const stopWords = ["de", "da", "do", "para", "com"];
  const searchWords = searchQuery.trim().split(/\s+/).map((word) => removeAccents(word.toLowerCase())).filter((word) => !stopWords.includes(word) && word.length > 0);

  const selectedBrands = search.brand ? String(search.brand).split(",").map(s => s.trim().toLowerCase()) : [];
  const selectedSellers = search.seller ? String(search.seller).split(",").map(s => s.trim().toLowerCase()) : [];

  // 🚀 CORREÇÃO: Substituído 'any' por 'ProductWithHistory'
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

    for (const config of dynamicTextConfigs) {
      const paramValue = search[config.key];
      if (!paramValue) continue;

      const selectedDynamic = (typeof paramValue === "string" ? paramValue.split(",") : paramValue).map(s => String(s).trim().toLowerCase());
      const pVal = String(attrs[config.key] || "").trim().toLowerCase();
      
      if (selectedDynamic.length > 0 && !selectedDynamic.includes(pVal)) return false;
    }
    return true;
  });

  // 🚀 CORREÇÃO: Substituído 'any' por 'ProductWithHistory'
  const rankedProducts = matchedProducts.map((p: ProductWithHistory) => {
    const attrs = p.attributes as unknown as DynamicAttributes;
    let pricePerUnit = 0;

    const currencyConfig = fullDisplayConfig.find(c => c.type === "currency");
    
    if (currencyConfig) {
      const quantityConfig = fullDisplayConfig.find(c => c.type === "number");
      const quantity = quantityConfig ? Number(attrs[quantityConfig.key]) : 0;
      
      if (quantity > 0) {
        pricePerUnit = p.totalPrice / quantity;
      }
    }

    let avgMonthly: number | null = null;
    let discountPercent: number | null = null;

    if (p.priceHistory && p.priceHistory.length > 0) {
      const dailyPrices = new Map<string, number[]>();
      
      // 🚀 CORREÇÃO: Substituído 'any' por 'DynamicPriceHistory'
      p.priceHistory.forEach((h: DynamicPriceHistory) => {
        const day = h.createdAt.toISOString().split("T")[0];
        if (!dailyPrices.has(day)) dailyPrices.set(day, []);
        dailyPrices.get(day)!.push(h.price);
      });

      const averages = Array.from(dailyPrices.values()).map(
        (arr) => arr.reduce((a, b) => a + b, 0) / arr.length
      );

      avgMonthly = averages.reduce((a, b) => a + b, 0) / averages.length;

      if (avgMonthly > p.totalPrice) {
        const raw = ((avgMonthly - p.totalPrice) / avgMonthly) * 100;
        if (raw >= 5) discountPercent = Math.round(raw);
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
      discountPercent: discountPercent, 
      attributes: attrs as Record<string, string | number | undefined>, 
    };
  });

  const finalProducts = rankedProducts.sort((a, b) => {
    if (order === "discount") {
      const diff = (b.discountPercent ?? 0) - (a.discountPercent ?? 0);
      if (diff !== 0) return diff;
      return a.price - b.price;
    }
    if (order === "price_asc") return a.price - b.price;
    if (order === "cheapest_unit") {
      if (a.pricePerUnit > 0 && b.pricePerUnit > 0) return a.pricePerUnit - b.pricePerUnit;
      if (a.pricePerUnit > 0) return -1;
      if (b.pricePerUnit > 0) return 1;
    }
    return a.price - b.price; 
  });

  return (
    <main className="bg-[#EAEDED] min-h-screen">
      <Suspense fallback={<div className="h-14 bg-[#232f3e] w-full" />}>
        <AmazonHeader />
      </Suspense>

      <div className="max-w-[1200px] mx-auto">
        <Suspense fallback={<div className="h-14 bg-white border-b border-zinc-200 w-full" />}>
          <FloatingFiltersBar />
        </Suspense>

        <div className="px-3">
          <Suspense fallback={null}>
            <MobileFiltersDrawer
              brands={Array.from(availableBrands).sort()}
              sellers={Array.from(availableSellers).sort()}
              dynamicConfigs={dynamicTextConfigs} 
              dynamicOptions={Object.fromEntries(
                Object.entries(dynamicFilterOptions).map(([k, v]) => [k, Array.from(v).sort()])
              )}
            />
          </Suspense>

          <div className="mt-4 pb-10 w-full">
            <p className="text-[13px] text-zinc-800 mb-2 px-1 font-medium">
              {finalProducts.length} produtos encontrados em {categoryData.name}
            </p>

            <div className="w-full">
              <ProductList
                products={finalProducts}
                viewEventName="view_dynamic_list"
                displayConfig={publicDisplayConfig}
              />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}