import { Metadata } from "next";
import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { ProductList } from "./ProductList";
import { MobileFiltersDrawer } from "./MobileFiltersDrawer";
import { FloatingFiltersBar } from "@/app/creatina/FloatingFiltersBar";
import { AmazonHeader } from "./AmazonHeader";
import { CreatineForm } from "@prisma/client";
import { getOptimizedAmazonUrl } from "@/lib/utils";

/* =========================
    PERFORMANCE & BUILD FIX
    O uso de force-dynamic resolve o erro de bails out of client-side rendering
    ao garantir que a página sempre seja renderizada no servidor sob demanda.
   ========================= */
export const dynamic = "force-dynamic";

/* =========================
    METADATA (SEO & Aba)
   ========================= */
export const metadata: Metadata = {
  title: "amazonpicks — O melhor preço em suplementos",
  description: "Compare suplementos pelo melhor custo-benefício com base em dados reais da Amazon.",
  alternates: {
    canonical: "/creatina",
  },
};

type SearchParams = {
  brand?: string;
  form?: string;
  flavor?: string;
  weight?: string; 
  priceMax?: string;
  order?: "gram" | "discount";
  q?: string;
};

export default async function CreatinaPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const showFallback = process.env.NEXT_PUBLIC_SHOW_FALLBACK_PRICE === "true";
  const order = params.order ?? "gram";
  const searchQuery = params.q || "";

  const selectedBrands = params.brand?.split(",") ?? [];
  const selectedForms = (params.form?.split(",") as CreatineForm[]) ?? [];
  const selectedFlavors = params.flavor?.split(",") ?? [];
  const selectedWeights = params.weight?.split(",") ?? [];
  const maxPrice = params.priceMax ? Number(params.priceMax) : undefined;

  const now = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(now.getDate() - 30);
  
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(now.getDate() - 7);

  /* =========================
      1. BUSCA FILTRADA
      ========================= */
  const products = await prisma.product.findMany({
    where: {
      category: "creatina",
      ...(searchQuery && { name: { contains: searchQuery, mode: 'insensitive' } }),
      ...(selectedBrands.length && { brand: { in: selectedBrands } }),
      ...(selectedFlavors.length && { flavor: { in: selectedFlavors } }),
      ...(selectedForms.length && { creatineInfo: { form: { in: selectedForms } } }),
      ...(selectedWeights.length && { 
        creatineInfo: { totalUnits: { in: selectedWeights.map(Number) } } 
      }),
    },
    include: {
      creatineInfo: true,
      offers: {
        where: {
          store: "AMAZON",
          affiliateUrl: { not: "" },
        },
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
      2. PROCESSAMENTO DE DADOS
      ========================= */
  const rankedProducts = products.map((product) => {
    if (!product.creatineInfo) return null;
    const offer = product.offers[0];
    
    if (!offer) return null;

    let finalPrice = offer.price;

    if (showFallback && (!finalPrice || finalPrice <= 0)) {
      finalPrice = offer.priceHistory[0]?.price ?? null;
    }

    if (!finalPrice || finalPrice <= 0) return null;
    if (maxPrice !== undefined && finalPrice > maxPrice) return null;

    const info = product.creatineInfo;
    const totalDosesNoPote = info.totalUnits / info.unitsPerDose;
    const gramasCreatinaPuraNoPote = totalDosesNoPote * 3; 
    const pricePerGramCreatine = finalPrice / gramasCreatinaPuraNoPote;
    const hasCarbs = info.unitsPerDose > 4;

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

      const isSignificantDrop = avgMonthly ? (finalPrice < avgMonthly * 0.98) : false;

      if (finalPrice <= (lowest30 + 0.01) && isSignificantDrop) {
        isLowestPrice30 = true;
      } else if (lowest7 !== null && finalPrice <= (lowest7 + 0.01) && isSignificantDrop) {
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
      form: product.creatineInfo.form,
      price: finalPrice,
      affiliateUrl: offer.affiliateUrl,
      doses: totalDosesNoPote,
      pricePerGram: pricePerGramCreatine,
      hasCarbs,
      avgPrice: avgMonthly,
      isLowestPrice: isLowestPrice30,
      isLowestPrice7d: isLowestPrice7,
      discountPercent,
      rating: offer.ratingAverage ?? 0,
      reviewsCount: offer.ratingCount ?? 0,
    };
  });

  /* =========================
      3. RANKING E ORDENAÇÃO
      ========================= */
  const finalProducts = rankedProducts
    .filter((p): p is NonNullable<typeof p> => p !== null)
    .sort((a, b) => {
      if (order === "discount") {
        const aHas = a.discountPercent != null;
        const bHas = b.discountPercent != null;
        if (aHas && !bHas) return -1;
        if (!aHas && bHas) return 1;
        if (aHas && bHas) return b.discountPercent! - a.discountPercent!;
      }
      return a.pricePerGram - b.pricePerGram;
    });

  /* =========================
      4. COLETA DE OPÇÕES PARA FILTROS
      ========================= */
  const allOptions = await prisma.product.findMany({
    where: { category: "creatina" },
    select: {
      brand: true,
      flavor: true,
      creatineInfo: {
        select: { totalUnits: true }
      }
    },
    distinct: ['brand', 'flavor']
  });

  const availableBrands = Array.from(new Set(allOptions.map((p) => p.brand))).sort();
  const availableFlavors = Array.from(
    new Set(allOptions.map((p) => p.flavor).filter((f): f is string => Boolean(f)))
  ).sort();
  
  const availableWeights = Array.from(
    new Set(allOptions.map((p) => p.creatineInfo?.totalUnits).filter((w): w is number => Boolean(w)))
  ).sort((a, b) => a - b);

  return (
    <main className="bg-[#EAEDED] min-h-screen">
      {/* CORREÇÃO: Envolvendo AmazonHeader em Suspense para evitar erro de build */}
      <Suspense fallback={<div className="h-16 bg-[#232f3e]" />}>
        <AmazonHeader />
      </Suspense>

      <div className="max-w-[1200px] mx-auto">
        <Suspense fallback={<div className="h-14 bg-white border-b border-zinc-200" />}>
          <FloatingFiltersBar />
        </Suspense>

        <div className="px-3">
          <Suspense fallback={null}>
            <MobileFiltersDrawer 
              brands={availableBrands} 
              flavors={availableFlavors} 
              weights={availableWeights}
              totalResults={finalProducts.length}
            />
          </Suspense>

          <div className="mt-4 pb-10 w-full">
            <p className="text-[13px] text-zinc-800 mb-2 px-1 font-medium">
              {finalProducts.length} produtos encontrados
            </p>
            <div className="w-full">
               <ProductList products={finalProducts} />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}