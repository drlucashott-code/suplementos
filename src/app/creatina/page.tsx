import { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { ProductList } from "./ProductList";
import { MobileFiltersDrawer } from "./MobileFiltersDrawer";
import { FloatingFiltersBar } from "@/app/creatina/FloatingFiltersBar";
import { AmazonHeader } from "./AmazonHeader";
import { CreatineForm } from "@prisma/client";
import { getOptimizedAmazonUrl } from "@/lib/utils";

/* =========================
   METADATA (SEO & Aba do Navegador)
   ========================= */
export const metadata: Metadata = {
  title: "amazonpicks — O melhor preço em suplementos",
  description: "Compare suplementos pelo melhor custo-benefício com base em dados reais da Amazon.",
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
      BUSCA NO BANCO DE DADOS
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
          }
        },
        orderBy: { updatedAt: "desc" },
        take: 1,
      },
    },
  });

  /* =========================
      PROCESSAMENTO E RANKING
     ========================= */
  const rankedProducts = products.map((product) => {
    if (!product.creatineInfo) return null;
    const offer = product.offers[0];
    
    if (!offer) return null;

    let finalPrice = offer.price;

    // Lógica de Fallback (Preço histórico se o atual estiver zerado)
    if (showFallback && (!finalPrice || finalPrice <= 0)) {
      finalPrice = offer.priceHistory[0]?.price ?? null;
    }

    // Filtro de Segurança: Se não tem preço válido, some do site
    if (!finalPrice || finalPrice <= 0) {
      return null;
    }

    // Filtro de Preço Máximo (SearchParams)
    if (maxPrice !== undefined && finalPrice > maxPrice) return null;

    const info = product.creatineInfo;
    const totalDosesNoPote = info.totalUnits / info.unitsPerDose;
    const gramasCreatinaPuraNoPote = totalDosesNoPote * 3;
    const pricePerGramCreatine = finalPrice / gramasCreatinaPuraNoPote;
    const hasCarbs = info.unitsPerDose > 4;

    let discountPercent: number | null = null;
    let avg30: number | null = null;

    if (offer.priceHistory.length >= 5) {
      avg30 = offer.priceHistory.reduce((s, h) => s + h.price, 0) / offer.priceHistory.length;
      const raw = ((avg30 - finalPrice) / avg30) * 100;
      if (raw >= 5) discountPercent = Math.round(raw);
    }

    return {
      id: product.id,
      name: product.name,
      // 🚀 Otimização de URL para carregar 320px em vez de 500px
      imageUrl: getOptimizedAmazonUrl(product.imageUrl, 320),
      flavor: product.flavor,
      form: product.creatineInfo.form,
      price: finalPrice,
      affiliateUrl: offer.affiliateUrl,
      doses: totalDosesNoPote,
      pricePerGram: pricePerGramCreatine,
      hasCarbs,
      discountPercent,
      avg30Price: discountPercent && avg30 ? avg30 : null,
      rating: offer.ratingAverage ?? 0,
      reviewsCount: offer.ratingCount ?? 0,
    };
  });

  // Ordenação final
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

  const brands = [...new Set(products.map((p) => p.brand))];
  const flavors = [...new Set(products.map((p) => p.flavor).filter((f): f is string => Boolean(f)))];

  /* =========================
      RENDERIZAÇÃO
     ========================= */
  return (
    <main className="bg-[#EAEDED] min-h-screen">
      <AmazonHeader />
      <div className="max-w-[1200px] mx-auto">
        <FloatingFiltersBar />
        <div className="px-3">
          <MobileFiltersDrawer brands={brands} flavors={flavors} />
          
          <div className="mt-4 pb-10 w-full">
            <p className="text-[13px] text-gray-600 mb-2 px-1">
              {finalProducts.length} resultados encontrados
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