import { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { ProductList } from "./ProductList";
import { FloatingFiltersBar } from "./FloatingFiltersBar";
import { AmazonHeader } from "./AmazonHeader";
import { MobileFiltersDrawer } from "./MobileFiltersDrawer";
import { getOptimizedAmazonUrl } from "@/lib/utils";

/* =========================
   PERFORMANCE (Edge Caching)
   Reduz o TTFB servindo a página a partir do cache por 60 segundos.
   ========================= */
export const revalidate = 60;

/* =========================
   METADATA (SEO)
   ========================= */
export const metadata: Metadata = {
  title: "amazonpicks — Comparador de Whey Protein",
  description: "Compare o custo por grama de proteína e a concentração dos melhores Whey Proteins da Amazon.",
  alternates: {
    canonical: "/whey",
  },
};

export type SearchParams = {
  brand?: string;
  flavor?: string;
  priceMax?: string;
  order?: "cost" | "discount" | "protein";
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
  const order = params.order ?? "cost";
  const searchQuery = params.q || "";

  const selectedBrands = params.brand?.split(",") ?? [];
  const selectedFlavors = params.flavor?.split(",") ?? [];
  const selectedProteinRanges = params.proteinRange?.split(",") ?? [];
  const maxPrice = params.priceMax ? Number(params.priceMax) : undefined;

  // Definição dos períodos históricos
  const now = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(now.getDate() - 30);
  
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(now.getDate() - 7);

  /* =========================
      1. BUSCA NO BANCO (Prisma)
      ========================= */
  const products = await prisma.product.findMany({
    where: {
      category: "whey",
      ...(searchQuery && { name: { contains: searchQuery, mode: 'insensitive' } }),
      ...(selectedBrands.length > 0 && { brand: { in: selectedBrands } }),
      ...(selectedFlavors.length > 0 && { flavor: { in: selectedFlavors } }),
    },
    include: {
      wheyInfo: true,
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
      2. MAPEAMENTO E CÁLCULOS (Server-side)
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
    
    // 🧪 Cálculo da Concentração Proteica
    const proteinPercentage = (info.proteinPerDoseInGrams / info.doseInGrams) * 100;

    // Filtro por faixa de proteína
    if (selectedProteinRanges.length > 0) {
      const match = selectedProteinRanges.some(r => {
        const [min, max] = r.split("-").map(Number);
        return proteinPercentage >= min && proteinPercentage < (max === 100 ? 101 : max);
      });
      if (!match) return null;
    }

    // 💰 Cálculo do Custo por Grama de Proteína Pura
    const totalDoses = info.totalWeightInGrams / info.doseInGrams;
    const totalProteinInGrams = totalDoses * info.proteinPerDoseInGrams;
    const pricePerGramProtein = finalPrice / totalProteinInGrams;

    /* 📈 LÓGICA DE HISTÓRICO E SELOS INTELIGENTES */
    let isLowestPrice30 = false;
    let isLowestPrice7 = false;
    let avgMonthly: number | null = null;
    let discountPercent: number | null = null;

    if (offer.priceHistory.length > 0) {
      // 1. Médias Diárias (Preço de Referência)
      const dailyPricesMap = new Map<string, number[]>();
      offer.priceHistory.forEach(h => {
        const dayKey = h.createdAt.toISOString().split('T')[0];
        if (!dailyPricesMap.has(dayKey)) dailyPricesMap.set(dayKey, []);
        dailyPricesMap.get(dayKey)!.push(h.price);
      });

      const dailyAverages: number[] = [];
      dailyPricesMap.forEach(p => dailyAverages.push(p.reduce((a, b) => a + b, 0) / p.length));
      avgMonthly = dailyAverages.reduce((a, b) => a + b, 0) / dailyAverages.length;

      // 2. Cálculo de Mínimos Históricos
      const prices30d = offer.priceHistory.map(h => h.price);
      const lowest30 = Math.min(...prices30d);

      const history7d = offer.priceHistory.filter(h => h.createdAt >= sevenDaysAgo);
      const lowest7 = history7d.length > 0 ? Math.min(...history7d.map(h => h.price)) : null;

      // 3. Gatilho de Significância (Preço atual deve ser < 98% da média)
      const isSignificantDrop = avgMonthly ? (finalPrice < avgMonthly * 0.98) : false;

      // 4. Aplicação de Selos com Prioridade (30 dias > 7 dias) e Regra (<=)
      if (finalPrice <= (lowest30 + 0.01) && isSignificantDrop) {
        isLowestPrice30 = true;
      } else if (lowest7 !== null && finalPrice <= (lowest7 + 0.01) && isSignificantDrop) {
        isLowestPrice7 = true;
      }

      // 5. Desconto visual
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
      proteinPerDose: info.proteinPerDoseInGrams,
      proteinPercentage: proteinPercentage,
      numberOfDoses: totalDoses,
      pricePerGramProtein,
      // Campos para a interface e lógica de preço/médias
      avgPrice: avgMonthly,
      isLowestPrice: isLowestPrice30,   // Selo 30 dias
      isLowestPrice7d: isLowestPrice7, // Selo 7 dias
      discountPercent,
      rating: offer.ratingAverage ?? 0,
      reviewsCount: offer.ratingCount ?? 0,
    };
  });

  const finalProducts = rankedProducts
    .filter((p): p is NonNullable<typeof p> => p !== null)
    .sort((a, b) => {
      if (order === "discount") {
        const aDesc = a.discountPercent ?? 0;
        const bDesc = b.discountPercent ?? 0;
        if (bDesc !== aDesc) return bDesc - aDesc;
        return a.pricePerGramProtein - b.pricePerGramProtein;
      }
      if (order === "protein") {
        return b.proteinPercentage - a.proteinPercentage;
      }
      return a.pricePerGramProtein - b.pricePerGramProtein;
    });

  // Geração de filtros dinâmicos
  const brands = Array.from(new Set(products.map(p => p.brand))).sort();
  const flavors = Array.from(new Set(products.map(p => p.flavor).filter(f => !!f))).sort();

  return (
    <main className="bg-[#EAEDED] min-h-screen" style={{ fontFamily: 'Arial, sans-serif' }}>
      <AmazonHeader />
      
      <div className="max-w-[1200px] mx-auto">
        <FloatingFiltersBar />
        
        <div className="px-3">
          <MobileFiltersDrawer brands={brands} flavors={flavors as string[]} />
          
          <div className="flex flex-col lg:flex-row gap-6 mt-4">
            <div className="w-full pb-10">
              <p className="text-[13px] text-zinc-600 mb-2 px-1 font-medium">
                {finalProducts.length} produtos encontrados
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