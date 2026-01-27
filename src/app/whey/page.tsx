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

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

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
          ...(showFallback ? {} : { price: { gt: 0 } }),
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
    // Lógica de Fallback de Preço para evitar itens "Indisponíveis"
    if (showFallback && (!finalPrice || finalPrice <= 0)) {
      finalPrice = offer.priceHistory[0]?.price ?? null;
    }

    if (!finalPrice || finalPrice <= 0) return null;
    if (maxPrice !== undefined && finalPrice > maxPrice) return null;

    const info = product.wheyInfo;
    
    // 🧪 Cálculo da Concentração Proteica (Ex: 80% de proteína)
    const proteinPercentage = (info.proteinPerDoseInGrams / info.doseInGrams) * 100;

    // Filtro por faixa de proteína (90%, 80%, etc)
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

    // 📈 Lógica de Desconto Real (Algoritmo: Média das Médias Diárias)
    let discountPercent: number | null = null;
    let avg30: number | null = null;

    if (offer.priceHistory.length > 0) {
      // 1. Agrupa preços por dia
      const dailyPricesMap = new Map<string, number[]>();
      for (const h of offer.priceHistory) {
        const dayKey = h.createdAt.toISOString().split('T')[0];
        if (!dailyPricesMap.has(dayKey)) dailyPricesMap.set(dayKey, []);
        dailyPricesMap.get(dayKey)!.push(h.price);
      }

      // 2. Calcula a média de cada dia individualmente
      const dailyAverages: number[] = [];
      dailyPricesMap.forEach((prices) => {
        const daySum = prices.reduce((acc, curr) => acc + curr, 0);
        dailyAverages.push(daySum / prices.length);
      });

      // 3. Calcula a média final das médias diárias
      if (dailyAverages.length > 0) {
        const totalSum = dailyAverages.reduce((acc, curr) => acc + curr, 0);
        avg30 = totalSum / dailyAverages.length;

        // Calcula desconto (apenas se for relevante, >= 5%)
        const raw = ((avg30 - finalPrice) / avg30) * 100;
        if (raw >= 5) discountPercent = Math.round(raw);
      }
    }

    return {
      id: product.id,
      name: product.name,
      // 🚀 OTIMIZAÇÃO LCP: Solicita a imagem redimensionada (320px)
      imageUrl: getOptimizedAmazonUrl(product.imageUrl, 320),
      flavor: product.flavor,
      price: finalPrice,
      affiliateUrl: offer.affiliateUrl,
      proteinPerDose: info.proteinPerDoseInGrams,
      proteinPercentage: proteinPercentage,
      numberOfDoses: totalDoses,
      pricePerGramProtein,
      discountPercent,
      avg30Price: discountPercent && avg30 ? avg30 : null,
      rating: offer.ratingAverage ?? 0,
      reviewsCount: offer.ratingCount ?? 0,
    };
  }).filter((p): p is NonNullable<typeof p> => p !== null);

  /* =========================
     3. ORDENAÇÃO FINAL
     ========================= */
  const finalProducts = rankedProducts.sort((a, b) => {
    if (order === "discount") {
      const aDesc = a.discountPercent ?? 0;
      const bDesc = b.discountPercent ?? 0;
      if (bDesc !== aDesc) return bDesc - aDesc;
      return a.pricePerGramProtein - b.pricePerGramProtein;
    }
    if (order === "protein") {
      return b.proteinPercentage - a.proteinPercentage;
    }
    // Padrão: Custo-benefício (Menor preço por grama de proteína)
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
                {/* 🚀 LISTA OTIMIZADA: Prioriza LCP nos primeiros 3 itens */}
                <ProductList products={finalProducts} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}