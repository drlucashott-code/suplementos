import { Metadata } from "next";
import { Suspense } from "react"; 
import { prisma } from "@/lib/prisma";
import { ProductList } from "./ProductList";
import { FloatingFiltersBar } from "./FloatingFiltersBar";
import { AmazonHeader } from "./AmazonHeader";
import { MobileFiltersDrawer } from "./MobileFiltersDrawer";
import { getOptimizedAmazonUrl } from "@/lib/utils";

/* =========================
    PERFORMANCE & CACHE
   ========================= */
export const dynamic = "force-dynamic";

/* =========================
    METADATA (SEO)
   ========================= */
export const metadata: Metadata = {
  title: "amazonpicks — Bebida proteica",
  description: "Compare o custo-benefício e a quantidade de proteína das melhores bebidas proteicas (RTD) na Amazon.",
  alternates: {
    canonical: "/bebidaproteica",
  },
};

export type SearchParams = {
  brand?: string;
  flavor?: string;
  priceMax?: string;
  // Opções de ordenação sincronizadas
  order?: "cost" | "discount" | "protein_gram" | "cheapest_unit";
  proteinRange?: string; 
  q?: string;
};

export default async function BebidaProteicaPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const showFallback = process.env.NEXT_PUBLIC_SHOW_FALLBACK_PRICE === "true";
  
  // Padrão definido para 'discount' conforme sua preferência atual
  const order = params.order ?? "discount";
  const searchQuery = params.q || "";

  const selectedBrands = params.brand?.split(",") ?? [];
  const selectedFlavors = params.flavor?.split(",") ?? [];
  const selectedProteinRanges = params.proteinRange?.split(",") ?? [];
  const maxPrice = params.priceMax ? Number(params.priceMax) : undefined;

  const now = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(now.getDate() - 30);
  
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(now.getDate() - 7);

  /* =========================
      1. BUSCA NO BANCO
     ========================= */
  const products = await prisma.product.findMany({
    where: {
      category: "bebidaproteica", // Categoria no seu banco
      ...(searchQuery && { name: { contains: searchQuery, mode: 'insensitive' } }),
      ...(selectedBrands.length > 0 && { brand: { in: selectedBrands } }),
      ...(selectedFlavors.length > 0 && { flavor: { in: selectedFlavors } }),
    },
    include: {
      proteinBarInfo: true, // Assumindo que você usa a mesma estrutura nutricional de barras/whey
      offers: {
        where: { store: "AMAZON", affiliateUrl: { not: "" } },
        include: {
          priceHistory: {
            where: { createdAt: { gte: thirtyDaysAgo } },
            orderBy: { createdAt: "desc" },
          },
        },
        orderBy: { updatedAt: "desc" },
        take: 1,
      },
    },
  });

  /* =========================
      2. MAPEAMENTO E CÁLCULOS
     ========================= */
  const rankedProducts = products.map((product) => {
    // Reutilizando proteinBarInfo para os macros da bebida
    if (!product.proteinBarInfo) return null;
    const offer = product.offers[0];
    if (!offer) return null;

    let finalPrice = offer.price;
    if (showFallback && (!finalPrice || finalPrice <= 0)) {
      finalPrice = offer.priceHistory[0]?.price ?? null;
    }

    if (!finalPrice || finalPrice <= 0) return null;
    if (maxPrice !== undefined && finalPrice > maxPrice) return null;

    const info = product.proteinBarInfo;
    
    // Dados da Bebida
    const proteinPerUnit = info.proteinPerDoseInGrams;
    const unitsPerPack = info.unitsPerBox || 1; 
    const pricePerUnit = finalPrice / unitsPerPack;
    
    // Filtro de Proteína
    if (selectedProteinRanges.length > 0) {
      const match = selectedProteinRanges.some(r => {
        const [min, max] = r.split("-").map(Number);
        return proteinPerUnit >= min && proteinPerUnit < (max === 100 ? 101 : max);
      });
      if (!match) return null;
    }

    const totalProteinInPack = unitsPerPack * proteinPerUnit;
    const pricePerGramProtein = finalPrice / totalProteinInPack;

    // Lógica de Preços e Descontos
    let isLowestPrice30 = false;
    let isLowestPrice7 = false;
    let avgMonthly: number | null = null;
    let discountPercent: number | null = null;

    if (offer.priceHistory.length > 0) {
      const dailyPricesMap = new Map<string, number[]>();
      offer.priceHistory.forEach(h => {
        const dayKey = h.createdAt.toISOString().split('T')[0];
        if (!dailyPricesMap.has(dayKey)) dailyPricesMap.set(dayKey, []);
        dailyPricesMap.get(dayKey)!.push(h.price);
      });

      const dailyAverages: number[] = [];
      dailyPricesMap.forEach(p => dailyAverages.push(p.reduce((a, b) => a + b, 0) / p.length));
      avgMonthly = dailyAverages.reduce((a, b) => a + b, 0) / dailyAverages.length;

      const prices30d = offer.priceHistory.map(h => h.price);
      const lowest30 = Math.min(...prices30d);
      const history7d = offer.priceHistory.filter(h => h.createdAt >= sevenDaysAgo);
      const lowest7 = history7d.length > 0 ? Math.min(...history7d.map(h => h.price)) : null;

      const isSignificantDrop = avgMonthly ? finalPrice < avgMonthly * 0.98 : false;

      if (finalPrice <= lowest30 + 0.01 && isSignificantDrop) {
        isLowestPrice30 = true;
      } else if (lowest7 !== null && finalPrice <= lowest7 + 0.01 && isSignificantDrop) {
        isLowestPrice7 = true;
      }

      if (avgMonthly > 0) {
        const rawDiscount = ((avgMonthly - finalPrice) / avgMonthly) * 100;
        if (rawDiscount >= 5) discountPercent = Math.round(rawDiscount);
      }
    }

    return {
      id: product.id,
      name: product.name,
      imageUrl: getOptimizedAmazonUrl(product.imageUrl, 320),
      flavor: product.flavor,
      price: finalPrice,
      affiliateUrl: offer.affiliateUrl,
      
      // Dados para o Card de Bebida
      volumePerUnit: info.doseInGrams, // ml
      proteinPerUnit: proteinPerUnit,
      unitsPerPack: unitsPerPack,
      pricePerUnit: pricePerUnit, 
      pricePerGramProtein,
      
      avgPrice: avgMonthly,
      discountPercent,
      isLowestPrice: isLowestPrice30,
      isLowestPrice7d: isLowestPrice7,
      rating: offer.ratingAverage ?? 0,
      reviewsCount: offer.ratingCount ?? 0,
    };
  });

  /* =========================
      3. ORDENAÇÃO FINAL
     ========================= */
  const finalProducts = rankedProducts
    .filter((p): p is NonNullable<typeof p> => p !== null)
    .sort((a, b) => {
      if (order === "discount") return (b.discountPercent ?? 0) - (a.discountPercent ?? 0);
      if (order === "protein_gram") return b.proteinPerUnit - a.proteinPerUnit;
      if (order === "cheapest_unit") return a.pricePerUnit - b.pricePerUnit;
      return a.pricePerGramProtein - b.pricePerGramProtein;
    });

  const allOptions = await prisma.product.findMany({
    where: { category: "bebidaproteica" },
    select: { brand: true, flavor: true },
    distinct: ['brand', 'flavor']
  });

  const availableBrands = Array.from(new Set(allOptions.map((p) => p.brand))).sort();
  const availableFlavors = Array.from(new Set(allOptions.map((p) => p.flavor).filter((f): f is string => Boolean(f)))).sort();

  return (
    <main className="bg-[#EAEDED] min-h-screen">
      <Suspense fallback={<div className="h-16 bg-[#232f3e]" />}>
        <AmazonHeader />
      </Suspense>
      
      <div className="max-w-[1200px] mx-auto">
        <Suspense fallback={<div className="h-14 bg-white border-b border-zinc-200 shadow-sm" />}>
          <FloatingFiltersBar />
        </Suspense>
        
        <div className="px-3">
          <Suspense fallback={null}>
            <MobileFiltersDrawer 
              brands={availableBrands} 
              flavors={availableFlavors} 
              totalResults={finalProducts.length}
            />
          </Suspense>
          
          <div className="flex flex-col lg:flex-row gap-6 mt-4">
            <div className="w-full pb-10">
              <p className="text-[13px] text-zinc-600 mb-2 px-1 font-medium">
                {finalProducts.length} produtos encontrados em Bebida Proteica
              </p>
              
              <div className="w-full">
                {/* O ProductList deve aceitar o novo tipo BebidaProduct no seu componente */}
                <ProductList 
                  products={finalProducts} 
                  viewEventName="view_bebida_list" 
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}