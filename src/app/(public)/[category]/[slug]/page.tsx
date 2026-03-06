import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { ProductList } from "@/components/dynamic/ProductList";
import { MobileFiltersDrawer } from "@/components/dynamic/MobileFiltersDrawer";
import { FloatingFiltersBar } from "@/components/dynamic/FloatingFiltersBar"; 
import { AmazonHeader } from "@/components/dynamic/AmazonHeader";
import { DynamicProduct } from "@prisma/client";

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

const removeAccents = (str: string) => {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
};

export default async function DynamicCategoryPage({ params, searchParams }: PageProps) {
  const { category: group, slug } = await params;
  const search = await searchParams;
  
  const order = (search.order as string) ?? "cheapest_unit";
  const searchQuery = (search.q as string) || "";

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

  categoryData.products.forEach((p: DynamicProduct) => {
    const attrs = p.attributes as unknown as DynamicAttributes;
    if (attrs.brand) availableBrands.add(String(attrs.brand));
    if (attrs.seller) availableSellers.add(String(attrs.seller));
    
    dynamicTextConfigs.forEach(config => {
      const val = attrs[config.key];
      if (val !== undefined && val !== null) dynamicFilterOptions[config.key].add(String(val));
    });
  });

  const stopWords = ["de", "da", "do", "para", "com"];
  const searchWords = searchQuery.trim().split(/\s+/).map((word) => removeAccents(word.toLowerCase())).filter((word) => !stopWords.includes(word) && word.length > 0);

  const selectedBrands = search.brand ? String(search.brand).split(",") : [];
  const selectedSellers = search.seller ? String(search.seller).split(",") : [];

  const matchedProducts = categoryData.products.filter((p: DynamicProduct) => {
    const attrs = p.attributes as unknown as DynamicAttributes;
    const pBrand = String(attrs.brand || "");
    const pSeller = String(attrs.seller || "");

    if (searchWords.length > 0) {
      const productText = removeAccents(`${p.name} ${pBrand}`.toLowerCase());
      if (!searchWords.every((word) => productText.includes(word))) return false;
    }

    if (selectedBrands.length > 0 && !selectedBrands.includes(pBrand)) return false;
    if (selectedSellers.length > 0 && !selectedSellers.includes(pSeller)) return false;

    for (const config of dynamicTextConfigs) {
      const selectedDynamic = search[config.key] ? String(search[config.key]).split(",") : [];
      const pVal = String(attrs[config.key] || "");
      if (selectedDynamic.length > 0 && !selectedDynamic.includes(pVal)) return false;
    }
    return true;
  });

  const rankedProducts = matchedProducts.map((p: DynamicProduct) => {
    const attrs = p.attributes as unknown as DynamicAttributes;
    let pricePerUnit = 0;

    const calcConfig = fullDisplayConfig.find(c => c.type === "currency");
    
    if (calcConfig) {
      // 🚀 LÓGICA UNIVERSAL: Busca por semelhança de palavras nas etiquetas
      // Ex: Se a etiqueta for "POR METRO", ele busca qualquer campo que tenha "METRO"
      const currentLabelWords = calcConfig.label
        .toUpperCase()
        .replace('POR ', '')
        .replace('PREÇO ', '')
        .trim()
        .split(' ');
      
      const targetConfig = fullDisplayConfig.find(c => 
        c.key !== calcConfig.key && 
        currentLabelWords.some(word => c.label.toUpperCase().includes(word))
      );

      const quantity = targetConfig ? Number(attrs[targetConfig.key]) : 0;
      if (quantity > 0) {
        pricePerUnit = p.totalPrice / quantity;
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
      attributes: attrs as Record<string, string | number | undefined>, 
    };
  });

  const finalProducts = rankedProducts.sort((a, b) => {
    if (order === "price_asc") return a.price - b.price;
    if (order === "cheapest_unit" && a.pricePerUnit > 0 && b.pricePerUnit > 0) return a.pricePerUnit - b.pricePerUnit;
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