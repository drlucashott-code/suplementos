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
  title: "amazonpicks — Barra de proteína",
  description: "Compare o custo-benefício e a quantidade de proteína das melhores barras de proteína na Amazon.",
  alternates: {
    canonical: "/barra",
  },
};

export type SearchParams = {
  brand?: string;
  flavor?: string;
  priceMax?: string;
  order?: "cost" | "discount" | "protein_gram" | "cheapest_bar"; // <--- ADICIONADO
  proteinRange?: string; 
  q?: string;
};

export default async function BarraPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const showFallback = process.env.NEXT_PUBLIC_SHOW_FALLBACK_PRICE === "true";
  
  const order = params.order ?? "cost";
  const searchQuery = params.q || "";

  const selectedBrands = params.brand?.split(",") ?? [];
  const selectedFlavors = params.flavor?.split(",") ?? [];
  const selectedProteinRanges = params.proteinRange?.split(",") ?? [];
  const maxPrice = params.priceMax ? Number(params.priceMax) : undefined;

  const now = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(now.getDate() - 30);

  const products = await prisma.product.findMany({
    where: {
      category: "barra",
      ...(searchQuery && { name: { contains: searchQuery, mode: 'insensitive' } }),
      ...(selectedBrands.length > 0 && { brand: { in: selectedBrands } }),
      ...(selectedFlavors.length > 0 && { flavor: { in: selectedFlavors } }),
    },
    include: {
      proteinBarInfo: true,
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

  const rankedProducts = products.map((product) => {
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
    const proteinPercentage = (info.proteinPerDoseInGrams / info.doseInGrams) * 100;
    const proteinPerBar = info.proteinPerDoseInGrams;
    const pricePerBar = finalPrice / info.unitsPerBox; // <--- CÁLCULO PARA O SELO CINZA

    if (selectedProteinRanges.length > 0) {
      const match = selectedProteinRanges.some(r => {
        const [min, max] = r.split("-").map(Number);
        return proteinPerBar >= min && proteinPerBar < (max === 100 ? 101 : max);
      });
      if (!match) return null;
    }

    const totalProteinInBox = info.unitsPerBox * info.proteinPerDoseInGrams;
    const pricePerGramProtein = finalPrice / totalProteinInBox;

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
      weightPerBar: info.doseInGrams,
      affiliateUrl: offer.affiliateUrl,
      proteinPerBar: proteinPerBar,
      pricePerBar: pricePerBar, // <--- ENVIADO PARA O COMPONENTE
      proteinPercentage, 
      unitsPerBox: info.unitsPerBox,
      pricePerGramProtein,
      avgPrice: avgMonthly,
      discountPercent,
      rating: offer.ratingAverage ?? 0,
      reviewsCount: offer.ratingCount ?? 0,
    };
  });

  const finalProducts = rankedProducts
    .filter((p): p is NonNullable<typeof p> => p !== null)
    .sort((a, b) => {
      if (order === "discount") return (b.discountPercent ?? 0) - (a.discountPercent ?? 0);
      if (order === "protein_gram") return b.proteinPerBar - a.proteinPerBar;
      if (order === "cheapest_bar") return a.pricePerBar - b.pricePerBar; // <--- NOVA ORDENAÇÃO
      return a.pricePerGramProtein - b.pricePerGramProtein;
    });

  const allOptions = await prisma.product.findMany({
    where: { category: "barra" },
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
                {finalProducts.length} produtos encontrados em Barra de Proteína
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