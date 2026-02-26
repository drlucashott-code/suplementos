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
   ========================= */
export const dynamic = "force-dynamic";

/* =========================
   METADATA (SEO & Aba)
   ========================= */
export const metadata: Metadata = {
  title: "amazonpicks — Creatina",
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
  seller?: string;
};

export default async function CreatinaPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const showFallback = process.env.NEXT_PUBLIC_SHOW_FALLBACK_PRICE === "true";
  const order = params.order ?? "discount";
  const searchQuery = params.q || "";

  const selectedBrands = params.brand?.split(",") ?? [];
  const selectedForms = (params.form?.split(",") as CreatineForm[]) ?? [];
  const selectedFlavors = params.flavor?.split(",") ?? [];
  const selectedWeights = params.weight?.split(",") ?? [];
  const selectedSellers = params.seller?.split(",") ?? [];
  const maxPrice = params.priceMax ? Number(params.priceMax) : undefined;

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  /* =========================
      1. BUSCA FILTRADA
     ========================= */
  const products = await prisma.product.findMany({
    where: {
      category: "creatina",
      ...(searchQuery && { name: { contains: searchQuery, mode: "insensitive" } }),
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
          ...(selectedSellers.length && { seller: { in: selectedSellers } }),
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
    
    const doseWeight = info.unitsPerDose; 
    const creatinePerDose = 3; 
    
    const totalDosesNoPote = info.totalUnits / doseWeight;
    const gramasCreatinaPuraNoPote = totalDosesNoPote * creatinePerDose;
    const pricePerGramCreatine = finalPrice / gramasCreatinaPuraNoPote;
    
    const hasCarbs = doseWeight > (creatinePerDose + 0.5);

    // --- LÓGICA DE PREÇOS (PADRÃO SUPREMO) ---
    let avgMonthly: number | null = null;
    let discountPercent: number | null = null;
    
    if (offer.priceHistory.length > 0) {
      const dailyPricesMap = new Map<string, number[]>();
      offer.priceHistory.forEach(h => {
        const dayKey = h.createdAt.toISOString().split("T")[0];
        if (!dailyPricesMap.has(dayKey)) dailyPricesMap.set(dayKey, []);
        dailyPricesMap.get(dayKey)!.push(h.price);
      });

      const dailyAverages: number[] = [];
      dailyPricesMap.forEach(p => {
        dailyAverages.push(p.reduce((a, b) => a + b, 0) / p.length);
      });

      avgMonthly = dailyAverages.reduce((a, b) => a + b, 0) / dailyAverages.length;

      if (avgMonthly > finalPrice) {
        const rawDiscount = ((avgMonthly - finalPrice) / avgMonthly) * 100;
        if (rawDiscount >= 5) discountPercent = Math.round(rawDiscount);
      }
    }

    const prices30d = offer.priceHistory.map(h => h.price).concat(finalPrice);
    const minPrice30d = Math.min(...prices30d);
    const isLowestPrice30 = finalPrice <= minPrice30d && offer.priceHistory.length >= 10;

    const history7d = offer.priceHistory.filter(h => h.createdAt >= sevenDaysAgo);
    const prices7d = history7d.map(h => h.price).concat(finalPrice);
    const minPrice7d = Math.min(...prices7d);
    const isLowestPrice7 = finalPrice <= minPrice7d && history7d.length >= 5;

    return {
      id: product.id,
      name: product.name,
      imageUrl: getOptimizedAmazonUrl(product.imageUrl, 320),
      flavor: product.flavor,
      form: info.form,
      price: finalPrice,
      affiliateUrl: offer.affiliateUrl,
      
      doses: totalDosesNoPote,
      doseWeight: doseWeight,
      creatinePerDose: creatinePerDose,
      
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
      // 1. Desconto: Maior -> Menor (Desempate: Preço Total)
      if (order === "discount") {
        const diff = (b.discountPercent ?? 0) - (a.discountPercent ?? 0);
        if (diff !== 0) return diff;
        return a.price - b.price;
      }
      
      // 2. Preço por Grama (Default): Menor -> Maior (Desempate: Preço Total)
      const diff = a.pricePerGram - b.pricePerGram;
      if (diff !== 0) return diff;
      return a.price - b.price;
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
        select: { totalUnits: true },
      },
    },
  });

  const availableBrands = Array.from(new Set(allOptions.map(p => p.brand))).sort();
  const availableFlavors = Array.from(
    new Set(allOptions.map(p => p.flavor).filter((f): f is string => Boolean(f)))
  ).sort();
  
  const availableWeights = Array.from(
    new Set(allOptions.map(p => p.creatineInfo?.totalUnits).filter((w): w is number => Boolean(w)))
  ).sort((a, b) => a - b);

  // --- NOVA LÓGICA: VENDEDORES DISPONÍVEIS ---
  const rawSellers = await prisma.offer.findMany({
    where: { 
      store: "AMAZON",
      seller: { not: null },
      product: { category: "creatina" }
    },
    distinct: ["seller"],
    select: { seller: true },
  });

  let availableSellers = rawSellers.map((s) => s.seller as string);
  const amazonOfficial = "Amazon.com.br";

  availableSellers = availableSellers
    .filter((seller) => seller !== amazonOfficial && seller !== "Desconhecido")
    .sort((a, b) => a.localeCompare(b));

  if (rawSellers.some((s) => s.seller === amazonOfficial)) {
    availableSellers.unshift(amazonOfficial);
  }

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
              brands={availableBrands}
              flavors={availableFlavors}
              weights={availableWeights}
              sellers={availableSellers}
            />
          </Suspense>

          <div className="mt-4 pb-10 w-full">
            <p className="text-[13px] text-zinc-800 mb-2 px-1 font-medium">
              {finalProducts.length} produtos encontrados em Creatina
            </p>
            <div className="w-full">
              <ProductList 
                products={finalProducts} 
                viewEventName="view_creatina_list" 
              />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}