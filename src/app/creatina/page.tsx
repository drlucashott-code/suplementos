import { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { ProductList } from "./ProductList";
import { MobileFiltersDrawer } from "./MobileFiltersDrawer";
import { FloatingFiltersBar } from "@/app/creatina/FloatingFiltersBar";
import { AmazonHeader } from "./AmazonHeader";
import { CreatineForm } from "@prisma/client";
import { getOptimizedAmazonUrl } from "@/lib/utils";

/* =========================
   PERFORMANCE (Edge Caching)
   O Next.js manterá esta página em cache no CDN por 60 segundos, 
   reduzindo drasticamente a carga no banco de dados e o tempo de resposta.
   ========================= */
export const revalidate = 60;

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
  const maxPrice = params.priceMax ? Number(params.priceMax) : undefined;

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  /* =========================
      BUSCA OTIMIZADA (Prisma)
      ========================= */
  const products = await prisma.product.findMany({
    where: {
      category: "creatina",
      ...(searchQuery && { name: { contains: searchQuery, mode: 'insensitive' } }),
      ...(selectedBrands.length && { brand: { in: selectedBrands } }),
      ...(selectedFlavors.length && { flavor: { in: selectedFlavors } }),
      ...(selectedForms.length && { creatineInfo: { form: { in: selectedForms } } }),
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
      PROCESSAMENTO DE DADOS (Server-side)
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

    /* 📈 LÓGICA DE PREÇOS E SELOS (30 DIAS) 
       Calculamos a média das médias diárias e identificamos o menor preço.
    */
    let lowestPrice30: number | null = null;
    let avgMonthly: number | null = null;
    let isLowestPrice = false;
    let discountPercent: number | null = null;

    if (offer.priceHistory.length > 0) {
      const prices = offer.priceHistory.map(h => h.price);
      
      // 1. Encontra o menor valor absoluto do mês
      lowestPrice30 = Math.min(...prices);

      // 2. Cálculo da Média Mensal (Média das Médias Diárias)
      const dailyPricesMap = new Map<string, number[]>();
      offer.priceHistory.forEach(h => {
        const dayKey = h.createdAt.toISOString().split('T')[0];
        if (!dailyPricesMap.has(dayKey)) dailyPricesMap.set(dayKey, []);
        dailyPricesMap.get(dayKey)!.push(h.price);
      });

      const dailyAverages: number[] = [];
      dailyPricesMap.forEach(p => dailyAverages.push(p.reduce((a, b) => a + b, 0) / p.length));
      avgMonthly = dailyAverages.reduce((a, b) => a + b, 0) / dailyAverages.length;

      // 3. Define se ganha o SELO (Preço atual é o menor do mês)
      isLowestPrice = finalPrice <= (lowestPrice30 + 0.01);

      // 4. Desconto baseado na média mensal
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
      // Novos campos para a interface
      avgPrice: avgMonthly,
      lowestPrice: lowestPrice30,
      isLowestPrice,
      discountPercent,
      rating: offer.ratingAverage ?? 0,
      reviewsCount: offer.ratingCount ?? 0,
    };
  });

  /* =========================
      RANKING E FILTROS FINAIS
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

  const brands = Array.from(new Set(products.map((p) => p.brand))).sort();
  const flavors = Array.from(
    new Set(products.map((p) => p.flavor).filter((f): f is string => Boolean(f)))
  ).sort();

  return (
    <main className="bg-[#EAEDED] min-h-screen">
      <AmazonHeader />
      <div className="max-w-[1200px] mx-auto">
        <FloatingFiltersBar />
        <div className="px-3">
          <MobileFiltersDrawer brands={brands} flavors={flavors} />
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