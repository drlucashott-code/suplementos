import { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { ProductList } from "./ProductList";
import { FloatingFiltersBar } from "./FloatingFiltersBar";
import { AmazonHeader } from "./AmazonHeader";
import { MobileFiltersDrawer } from "./MobileFiltersDrawer";
import { getOptimizedAmazonUrl } from "@/lib/utils";

/* =========================
   PERFORMANCE & CACHE
   Garante que a leitura dos filtros seja instantânea.
   ========================= */
export const dynamic = "force-dynamic";

/* =========================
   METADATA (SEO)
   ========================= */
export const metadata: Metadata = {
  title: "amazonpicks — Melhores Barras de Proteína",
  description: "Compare o custo-benefício e a quantidade de proteína das melhores barras de proteína na Amazon.",
  alternates: {
    canonical: "/barra",
  },
};

export type SearchParams = {
  brand?: string;
  flavor?: string;
  priceMax?: string;
  order?: "cost" | "discount" | "protein_gram"; // Corrigido para protein_gram
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
  
  // Padrão: Custo benefício
  const order = params.order ?? "cost";
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
      1. BUSCA NO BANCO (Prisma)
      ========================= */
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
      2. MAPEAMENTO E CÁLCULOS
      ========================= */
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
    
    // 🧪 Cálculo da Concentração Proteica (% de proteína na barra)
    const proteinPercentage = (info.proteinPerDoseInGrams / info.doseInGrams) * 100;

    // Filtro por faixa de proteína (gramas fixas por barra)
    const proteinPerBar = info.proteinPerDoseInGrams;
    if (selectedProteinRanges.length > 0) {
      const match = selectedProteinRanges.some(r => {
        const [min, max] = r.split("-").map(Number);
        return proteinPerBar >= min && proteinPerBar < (max === 100 ? 101 : max);
      });
      if (!match) return null;
    }

    // 💰 Custo por Grama de Proteína (Custo-benefício)
    const totalProteinInBox = info.unitsPerBox * info.proteinPerDoseInGrams;
    const pricePerGramProtein = finalPrice / totalProteinInBox;

    /* 📈 HISTÓRICO E SELOS INTELIGENTES */
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
      price: finalPrice,
      weightPerBar: info.doseInGrams,
      affiliateUrl: offer.affiliateUrl,
      proteinPerBar: proteinPerBar,
      proteinPercentage, 
      unitsPerBox: info.unitsPerBox,
      pricePerGramProtein,
      avgPrice: avgMonthly,
      isLowestPrice: isLowestPrice30,
      isLowestPrice7d: isLowestPrice7,
      discountPercent,
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
      // 1. Maior Desconto
      if (order === "discount") {
        const aDesc = a.discountPercent ?? 0;
        const bDesc = b.discountPercent ?? 0;
        if (bDesc !== aDesc) return bDesc - aDesc;
        return a.pricePerGramProtein - b.pricePerGramProtein;
      }
      
      // 2. Mais proteína por barra (g)
      if (order === "protein_gram") {
        // Ordena por quantidade absoluta (b - a = decrescente)
        return b.proteinPerBar - a.proteinPerBar;
      }

      // 3. Custo-benefício (Preço por grama de proteína) - PADRÃO
      return a.pricePerGramProtein - b.pricePerGramProtein;
    });

  /* =========================
      4. FILTROS LATERAIS
      ========================= */
  const allOptions = await prisma.product.findMany({
    where: { category: "barra" },
    select: { brand: true, flavor: true },
    distinct: ['brand', 'flavor']
  });

  const availableBrands = Array.from(new Set(allOptions.map((p) => p.brand))).sort();
  const availableFlavors = Array.from(
    new Set(allOptions.map((p) => p.flavor).filter((f): f is string => Boolean(f)))
  ).sort();

  return (
    <main className="bg-[#EAEDED] min-h-screen" style={{ fontFamily: 'Arial, sans-serif' }}>
      <AmazonHeader />
      
      <div className="max-w-[1200px] mx-auto">
        <FloatingFiltersBar />
        
        <div className="px-3">
          <MobileFiltersDrawer 
            brands={availableBrands} 
            flavors={availableFlavors} 
            totalResults={finalProducts.length}
          />
          
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