import { Metadata } from "next";
import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { ProductList } from "./ProductList";
import { MobileFiltersDrawer } from "./MobileFiltersDrawer";
import { FloatingFiltersBar } from "./FloatingFiltersBar"; 
import { AmazonHeader } from "./AmazonHeader";
import { getOptimizedAmazonUrl } from "@/lib/utils";
import { DrinkProduct } from "./MobileProductCard";

/* =========================
   PERFORMANCE & BUILD FIX
   ========================= */
export const dynamic = "force-dynamic";

/* =========================
   METADATA (SEO)
   ========================= */
export const metadata: Metadata = {
  title: "amazonpicks — Bebida Proteica",
  description: "Compare o custo-benefício das melhores bebidas proteicas na Amazon.",
  alternates: { canonical: "/bebidaproteica" },
};

type SearchParams = {
  brand?: string;
  flavor?: string;
  priceMax?: string;
  order?: "discount" | "protein_gram" | "cheapest_unit" | "cost";
  proteinRange?: string;
  q?: string;
};

export default async function BebidaProteicaPage({
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
  const selectedProteinRanges = params.proteinRange?.split(",") ?? [];
  const maxPrice = params.priceMax ? Number(params.priceMax) : undefined;

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  /* =========================
     1. BUSCA NO BANCO
     ========================= */
  const products = await prisma.product.findMany({
    where: {
      category: "bebidaproteica", // Mantido conforme seu DB
      ...(searchQuery && {
        name: { contains: searchQuery, mode: "insensitive" },
      }),
      ...(selectedBrands.length && { brand: { in: selectedBrands } }),
      ...(selectedFlavors.length && { flavor: { in: selectedFlavors } }),
    },
    include: {
      proteinDrinkInfo: true,
      offers: {
        where: { store: "AMAZON", affiliateUrl: { not: "" } },
        include: {
          priceHistory: {
            where: { createdAt: { gte: thirtyDaysAgo } },
            orderBy: { createdAt: "desc" },
          },
        },
        take: 1,
      },
    },
  });

  /* =========================
     2. PROCESSAMENTO
     ========================= */
  const rankedProducts = products.map((product) => {
    if (!product.proteinDrinkInfo) return null;
    const offer = product.offers[0];
    if (!offer) return null;

    let finalPrice = offer.price;
    // Fallback de preço se estiver zerado
    if (showFallback && (!finalPrice || finalPrice <= 0)) {
      finalPrice = offer.priceHistory[0]?.price ?? null;
    }

    if (!finalPrice || finalPrice <= 0) return null;
    if (maxPrice !== undefined && finalPrice > maxPrice) return null;

    const info = product.proteinDrinkInfo;
    const unitsPerPack = info.unitsPerPack || 1;
    const proteinPerDose = info.proteinPerUnitInGrams;

    // Filtro de Proteína (vindo do Drawer)
    if (selectedProteinRanges.length > 0) {
      const match = selectedProteinRanges.some((r) => {
        const [min, max] = r.split("-").map(Number);
        return proteinPerDose >= min && proteinPerDose < (max === 100 ? 101 : max);
      });
      if (!match) return null;
    }

    const totalProtein = unitsPerPack * proteinPerDose;
    const pricePerGramProtein = finalPrice / totalProtein;

    // ✅ CÁLCULO DE DESCONTO (CORREÇÃO APLICADA AQUI)
    // Procura o maior preço registrado nos últimos 30 dias que seja maior que o atual
    const historyPrice = offer.priceHistory.find(h => h.price > finalPrice)?.price ?? finalPrice;
    
    const discountPercent = historyPrice > finalPrice 
      ? Math.round(((historyPrice - finalPrice) / historyPrice) * 100) 
      : 0;

    return {
      id: product.id,
      name: product.name,
      imageUrl: getOptimizedAmazonUrl(product.imageUrl, 320),
      flavor: product.flavor,
      price: finalPrice,
      affiliateUrl: offer.affiliateUrl,
      doseWeight: info.volumePerUnitInMl,
      proteinPerDose: proteinPerDose,
      numberOfDoses: unitsPerPack,
      pricePerGramProtein: pricePerGramProtein,
      discountPercent: discountPercent, // ✅ Campo adicionado ao objeto
      rating: offer.ratingAverage ?? 0,
      reviewsCount: offer.ratingCount ?? 0,
    } as DrinkProduct;
  });

  /* =========================
     3. ORDENAÇÃO
     ========================= */
  const finalProducts = rankedProducts
    .filter((p): p is DrinkProduct => p !== null)
    .sort((a, b) => {
      // Garantindo que price e doses não são nulos para o TS
      const priceA = a.price ?? 0;
      const priceB = b.price ?? 0;
      const unitsA = a.numberOfDoses ?? 1;
      const unitsB = b.numberOfDoses ?? 1;

      if (order === "discount") return (b.discountPercent ?? 0) - (a.discountPercent ?? 0);
      if (order === "protein_gram") return b.proteinPerDose - a.proteinPerDose;
      if (order === "cheapest_unit") return (priceA / unitsA) - (priceB / unitsB);
      return a.pricePerGramProtein - b.pricePerGramProtein;
    });

  /* =========================
     4. OPÇÕES DOS FILTROS
     ========================= */
  const allOptions = await prisma.product.findMany({
    where: { category: "bebidaproteica" },
    select: { brand: true, flavor: true }
  });

  const availableBrands = Array.from(new Set(allOptions.map((p) => p.brand))).sort();
  const availableFlavors = Array.from(new Set(allOptions.map((p) => p.flavor).filter((f): f is string => !!f))).sort();

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
              //weights removido para casar com o Drawer tipo barrinha
            />
          </Suspense>

          <div className="mt-4 pb-10 w-full">
            <p className="text-[13px] text-zinc-800 mb-2 px-1 font-medium">
              {finalProducts.length} produtos encontrados
            </p>
            <ProductList products={finalProducts} viewEventName="view_drink_list" />
          </div>
        </div>
      </div>
    </main>
  );
}