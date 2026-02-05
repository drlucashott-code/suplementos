import { Metadata } from "next";
import { Suspense } from "react"; 
import { prisma } from "@/lib/prisma";
import { ProductList } from "./ProductList";
import { FloatingFiltersBar } from "./FloatingFiltersBar";
import { AmazonHeader } from "./AmazonHeader";
import { MobileFiltersDrawer } from "./MobileFiltersDrawer";
import { getOptimizedAmazonUrl } from "@/lib/utils";

/* =========================
   PERFORMANCE & BUILD FIX
   ========================= */
export const dynamic = "force-dynamic";

/* =========================
   METADATA (SEO)
   ========================= */
export const metadata: Metadata = {
  title: "amazonpicks — Whey Protein",
  description: "Compare o custo por grama de proteína e a concentração dos melhores Whey Proteins da Amazon.",
  alternates: {
    canonical: "/whey",
  },
};

// ✅ ATUALIZADO: Tipagem para suportar as novas opções de ordenação
export type SearchParams = {
  brand?: string;
  flavor?: string;
  weight?: string; 
  priceMax?: string;
  order?: "cost" | "discount" | "protein_percent" | "protein_dose" | "price_dose";
  proteinRange?: string;
  q?: string;
};

export default async function WheyPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const showFallback = process.env.NEXT_PUBLIC_SHOW_FALLBACK_PRICE === "true";
  
  // ✅ Padrão mantido como 'cost' (se vier vazio), mas o front manda 'discount'
  const order = params.order ?? "discount"; 
  const searchQuery = params.q || "";

  const selectedBrands = params.brand?.split(",") ?? [];
  const selectedFlavors = params.flavor?.split(",") ?? [];
  const selectedWeights = params.weight?.split(",") ?? []; 
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
      category: "whey",
      ...(searchQuery && { name: { contains: searchQuery, mode: 'insensitive' } }),
      ...(selectedBrands.length > 0 && { brand: { in: selectedBrands } }),
      ...(selectedFlavors.length > 0 && { flavor: { in: selectedFlavors } }),
      ...(selectedWeights.length > 0 && { 
        wheyInfo: { totalWeightInGrams: { in: selectedWeights.map(Number) } } 
      }),
    },
    include: {
      wheyInfo: true,
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
      2. PROCESSAMENTO E CÁLCULOS
      ========================= */
  const rankedProducts = products.map((product) => {
    if (!product.wheyInfo) return null;
    const offer = product.offers[0];
    if (!offer) return null;

    let finalPrice = offer.price;
    if (showFallback && (!finalPrice || finalPrice <= 0)) {
      finalPrice = offer.priceHistory[0]?.price ?? null;
    }

    if (!finalPrice || finalPrice <= 0) return null;
    if (maxPrice !== undefined && finalPrice > maxPrice) return null;

    const info = product.wheyInfo;
    const proteinPercentage = (info.proteinPerDoseInGrams / info.doseInGrams) * 100;

    // Filtro de Range de Proteína
    if (selectedProteinRanges.length > 0) {
      const match = selectedProteinRanges.some(r => {
        const [min, max] = r.split("-").map(Number);
        return proteinPercentage >= min && proteinPercentage < (max === 100 ? 101 : max);
      });
      if (!match) return null;
    }

    const totalDoses = info.totalWeightInGrams / info.doseInGrams;
    const totalProteinInGrams = totalDoses * info.proteinPerDoseInGrams;
    const pricePerGramProtein = finalPrice / totalProteinInGrams;

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
      
      // Dados técnicos
      proteinPerDose: info.proteinPerDoseInGrams,
      proteinPercentage: proteinPercentage,
      numberOfDoses: totalDoses,
      doseWeight: info.doseInGrams, // Campo vindo do DB
      
      pricePerGramProtein,
      avgPrice: avgMonthly,
      discountPercent,
      rating: offer.ratingAverage ?? 0,
      reviewsCount: offer.ratingCount ?? 0,
    };
  });

  // ✅ ORDENAÇÃO CORRIGIDA (5 OPÇÕES)
  const finalProducts = rankedProducts
    .filter((p): p is NonNullable<typeof p> => p !== null)
    .sort((a, b) => {
      // 1. Maior desconto
      if (order === "discount") return (b.discountPercent ?? 0) - (a.discountPercent ?? 0);
      
      // 2. Maior proteína por dose
      if (order === "protein_dose") return b.proteinPerDose - a.proteinPerDose;
      
      // 3. Maior % de proteína
      if (order === "protein_percent") return b.proteinPercentage - a.proteinPercentage;
      
      // 4. Menor preço por dose
      if (order === "price_dose") {
         // Tratamento para evitar divisão por zero (fallback seguro)
         const priceDoseA = (a.price && a.numberOfDoses) ? (a.price / a.numberOfDoses) : 999999;
         const priceDoseB = (b.price && b.numberOfDoses) ? (b.price / b.numberOfDoses) : 999999;
         return priceDoseA - priceDoseB;
      }

      // 5. Custo-benefício (Padrão e fallback 'cost')
      // Ordena do menor preço/g para o maior
      return a.pricePerGramProtein - b.pricePerGramProtein; 
    });

  /* =========================
      3. COLETA DE OPÇÕES
      ========================= */
  const allOptions = await prisma.product.findMany({
    where: { category: "whey" },
    select: {
      brand: true, flavor: true,
      wheyInfo: { select: { totalWeightInGrams: true } }
    },
    distinct: ['brand', 'flavor']
  });

  const availableBrands = Array.from(new Set(allOptions.map((p) => p.brand))).sort();
  const availableFlavors = Array.from(new Set(allOptions.map((p) => p.flavor).filter((f): f is string => Boolean(f)))).sort();
  const availableWeights = Array.from(new Set(allOptions.map((p) => p.wheyInfo?.totalWeightInGrams).filter((w): w is number => Boolean(w)))).sort((a, b) => a - b);

  return (
    <main className="bg-[#EAEDED] min-h-screen">
      {/* 🛡️ PROTEÇÃO CONTRA ERRO DE BUILD VERCEL */}
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
          
          <div className="flex flex-col lg:flex-row gap-6 mt-4">
            <div className="w-full pb-10">
              <p className="text-[13px] text-zinc-600 mb-2 px-1 font-medium">
                {finalProducts.length} produtos encontrados em Whey Protein
              </p>
              
              <div className="w-full">
                <ProductList products={finalProducts} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}