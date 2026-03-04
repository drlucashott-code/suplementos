import { Metadata } from "next";
import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { ProductList } from "./ProductList";
import { MobileFiltersDrawer } from "./MobileFiltersDrawer";
import { FloatingFiltersBar } from "./FloatingFiltersBar";
import { AmazonHeader } from "./AmazonHeader";
import { getOptimizedAmazonUrl } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Amazonpicks.com.br | Pré-Treino",
  description: "Encontre o melhor pré-treino comparando preço por dose e avaliações reais.",
  alternates: {
    canonical: "/pre-treino",
  },
};

type SearchParams = {
  brand?: string;
  flavor?: string;
  weight?: string;
  caffeine?: string; 
  priceMax?: string;
  order?: "dose" | "discount" | "caffeine" | "price_asc";
  q?: string;
  seller?: string;
};

// Função utilitária para remover acentos
const removeAccents = (str: string) => {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
};

export default async function PreTreinoPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const showFallback = process.env.NEXT_PUBLIC_SHOW_FALLBACK_PRICE === "true";
  const order = params.order ?? "discount";
  const searchQuery = params.q || "";

  const selectedBrands = params.brand?.split(",") ?? [];
  const selectedFlavors = params.flavor?.split(",") ?? [];
  const selectedWeights = params.weight?.split(",") ?? [];
  const selectedCaffeines = params.caffeine?.split(",") ?? []; 
  const selectedSellers = params.seller?.split(",") ?? [];
  const maxPrice = params.priceMax ? Number(params.priceMax) : undefined;

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const stopWords = ["pre", "pré", "treino", "pre-treino", "pré-treino", "de", "da", "do"];
  const searchWords = searchQuery
    .trim()
    .split(/\s+/)
    .map((word) => removeAccents(word.toLowerCase()))
    .filter((word) => !stopWords.includes(word) && word.length > 0);

  const products = await prisma.product.findMany({
    where: {
      category: "pre-treino",
      ...(selectedBrands.length && { brand: { in: selectedBrands } }),
      ...(selectedFlavors.length && { flavor: { in: selectedFlavors } }),
      
      preWorkoutInfo: {
        ...(selectedWeights.length && { totalWeightInGrams: { in: selectedWeights.map(Number) } }),
        ...(selectedCaffeines.length && { caffeinePerDoseInMg: { in: selectedCaffeines.map(Number) } }),
      },
    },
    include: {
      preWorkoutInfo: true,
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

  const matchedProducts = products.filter((product) => {
    if (searchWords.length === 0) return true;
    const productText = removeAccents(
      `${product.name} ${product.brand} ${product.flavor || ""}`.toLowerCase()
    );
    return searchWords.every((word) => productText.includes(word));
  });

  const rankedProducts = matchedProducts.map((product) => {
    if (!product.preWorkoutInfo) return null;
    const offer = product.offers[0];
    if (!offer) return null;

    let finalPrice = offer.price;

    if (showFallback && (!finalPrice || finalPrice <= 0)) {
      finalPrice = offer.priceHistory[0]?.price ?? null;
    }

    if (!finalPrice || finalPrice <= 0) return null;
    if (maxPrice !== undefined && finalPrice > maxPrice) return null;

    const info = product.preWorkoutInfo;
    
    const doseWeight = info.doseInGrams; 
    const totalDosesNoPote = info.totalWeightInGrams / doseWeight;
    const caffeinePerDose = info.caffeinePerDoseInMg ?? 0; 
    const pricePerDose = finalPrice / totalDosesNoPote;
    const hasCarbs = doseWeight > 15; 

    let avgMonthly: number | null = null;
    let discountPercent: number | null = null;
    
    if (offer.priceHistory.length > 0) {
      const dailyPricesMap = new Map<string, number[]>();
      
      offer.priceHistory.forEach((h: { createdAt: Date; price: number }) => {
        const dayKey = h.createdAt.toISOString().split("T")[0];
        if (!dailyPricesMap.has(dayKey)) dailyPricesMap.set(dayKey, []);
        dailyPricesMap.get(dayKey)!.push(h.price);
      });

      const dailyAverages: number[] = [];
      dailyPricesMap.forEach((p) => {
        dailyAverages.push(p.reduce((a, b) => a + b, 0) / p.length);
      });

      if (dailyAverages.length > 0) {
        avgMonthly = dailyAverages.reduce((a, b) => a + b, 0) / dailyAverages.length;

        if (avgMonthly > finalPrice) {
          const rawDiscount = ((avgMonthly - finalPrice) / avgMonthly) * 100;
          if (rawDiscount >= 5) discountPercent = Math.round(rawDiscount);
        }
      }
    }

    const prices30d = offer.priceHistory.map((h: { price: number }) => h.price).concat(finalPrice);
    const minPrice30d = Math.min(...prices30d);
    const isLowestPrice30 = false; 

    const history7d = offer.priceHistory.filter((h: { createdAt: Date }) => h.createdAt >= sevenDaysAgo);
    const prices7d = history7d.map((h: { price: number }) => h.price).concat(finalPrice);
    const minPrice7d = Math.min(...prices7d);
    const isLowestPrice7 = false; 

    return {
      id: product.id,
      name: product.name,
      imageUrl: getOptimizedAmazonUrl(product.imageUrl, 320),
      flavor: product.flavor,
      price: finalPrice,
      affiliateUrl: offer.affiliateUrl,
      
      doses: totalDosesNoPote,
      doseWeight: doseWeight,
      caffeinePerDose: caffeinePerDose,
      pricePerDose: pricePerDose,
      hasCarbs,
      avgPrice: avgMonthly,
      
      isLowestPrice: isLowestPrice30,      
      isLowestPrice7d: isLowestPrice7,    
      discountPercent,
      
      rating: offer.ratingAverage ?? 0,
      reviewsCount: offer.ratingCount ?? 0,
    };
  });

  const finalProducts = rankedProducts
    .filter((p): p is NonNullable<typeof p> => p !== null)
    .sort((a, b) => {
      if (order === "caffeine") {
        const diff = b.caffeinePerDose - a.caffeinePerDose;
        if (diff !== 0) return diff; 
        return a.price - b.price;
      }

      if (order === "discount") {
        const diff = (b.discountPercent ?? 0) - (a.discountPercent ?? 0);
        if (diff !== 0) return diff; 
        return a.price - b.price;
      }
      
      if (order === "price_asc") {
        const diff = a.price - b.price;
        if (diff !== 0) return diff;
        return a.pricePerDose - b.pricePerDose;
      }

      const diff = a.pricePerDose - b.pricePerDose;
      if (diff !== 0) return diff;   
      return a.price - b.price;
    });

  const allOptions = await prisma.product.findMany({
    where: { category: "pre-treino" },
    select: {
      brand: true,
      flavor: true,
      preWorkoutInfo: {
        select: { 
          totalWeightInGrams: true,
          caffeinePerDoseInMg: true, 
        },
      },
    },
  });

  const availableBrands = Array.from(new Set(allOptions.map((p) => p.brand))).sort();
  const availableFlavors = Array.from(
    new Set(allOptions.map((p) => p.flavor).filter((f): f is string => Boolean(f)))
  ).sort();
  
  const availableWeights = Array.from(
    new Set(allOptions.map((p) => p.preWorkoutInfo?.totalWeightInGrams).filter((w): w is number => Boolean(w)))
  ).sort((a: number, b: number) => a - b);

  const availableCaffeines = Array.from(
    new Set(allOptions.map((p) => p.preWorkoutInfo?.caffeinePerDoseInMg)
    .filter((c): c is number => c !== null && c !== undefined))
  ).sort((a: number, b: number) => a - b);

  const rawSellers = await prisma.offer.findMany({
    where: { 
      store: "AMAZON",
      seller: { not: null },
      product: { category: "pre-treino" }
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
              caffeines={availableCaffeines} 
              sellers={availableSellers}
            />
          </Suspense>

          <div className="mt-4 pb-10 w-full">
            <p className="text-[13px] text-zinc-800 mb-2 px-1 font-medium">
              {finalProducts.length} produtos encontrados em Pré-Treino
            </p>
            <div className="w-full">
              <ProductList 
                products={finalProducts} 
                viewEventName="view_pre_treino_list" 
              />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}