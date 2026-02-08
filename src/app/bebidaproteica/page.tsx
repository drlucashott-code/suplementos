import { Metadata } from "next";
import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { ProductList } from "./ProductList";
import { MobileFiltersDrawer } from "./MobileFiltersDrawer";
import { FloatingFiltersBar } from "./FloatingFiltersBar"; 
import { AmazonHeader } from "./AmazonHeader";
import { getOptimizedAmazonUrl } from "@/lib/utils";
import { DrinkProduct } from "./MobileProductCard";

export const dynamic = "force-dynamic";

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

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const products = await prisma.product.findMany({
    where: {
      category: "bebidaproteica",
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

  const rankedProducts = products.map((product) => {
    if (!product.proteinDrinkInfo) return null;
    const offer = product.offers[0];
    if (!offer) return null;

    let finalPrice = offer.price;
    if (showFallback && (!finalPrice || finalPrice <= 0)) {
      finalPrice = offer.priceHistory[0]?.price ?? null;
    }

    if (!finalPrice || finalPrice <= 0) return null;
    if (maxPrice !== undefined && finalPrice > maxPrice) return null;

    const info = product.proteinDrinkInfo;
    const unitsPerPack = info.unitsPerPack || 1;
    const proteinPerDose = info.proteinPerUnitInGrams;

    if (selectedProteinRanges.length > 0) {
      const match = selectedProteinRanges.some((r) => {
        const [min, max] = r.split("-").map(Number);
        return proteinPerDose >= min && proteinPerDose < (max === 100 ? 101 : max);
      });
      if (!match) return null;
    }

    const totalProtein = unitsPerPack * proteinPerDose;
    const pricePerGramProtein = finalPrice / totalProtein;

    // --- LÓGICA DE PREÇO MÉDIO E DESCONTO (IGUAL BARRA) ---
    let avgMonthly: number | null = null;
    let discountPercent: number | null = null;

    if (offer.priceHistory.length > 0) {
      // Agrupa preços por dia para evitar distorção se houver várias coletas no mesmo dia
      const dailyPrices = new Map<string, number[]>();
      offer.priceHistory.forEach((h) => {
        const day = h.createdAt.toISOString().split("T")[0];
        if (!dailyPrices.has(day)) dailyPrices.set(day, []);
        dailyPrices.get(day)!.push(h.price);
      });

      // Média de cada dia
      const averages = Array.from(dailyPrices.values()).map(
        (p) => p.reduce((a, b) => a + b, 0) / p.length
      );

      // Média global dos últimos 30 dias
      avgMonthly = averages.reduce((a, b) => a + b, 0) / averages.length;

      // Calcula desconto se preço atual for menor que a média
      if (avgMonthly > finalPrice) {
        const raw = ((avgMonthly - finalPrice) / avgMonthly) * 100;
        // Só considera desconto se for >= 5%
        if (raw >= 5) discountPercent = Math.round(raw);
      }
    }

    // --- MENOR PREÇO EM X DIAS ---
    const prices30d = offer.priceHistory.map(h => h.price).concat(finalPrice);
    const minPrice30d = Math.min(...prices30d);
    const isLowestPrice = finalPrice <= minPrice30d && offer.priceHistory.length >= 10;

    const history7d = offer.priceHistory.filter(h => h.createdAt >= sevenDaysAgo);
    const prices7d = history7d.map(h => h.price).concat(finalPrice);
    const minPrice7d = Math.min(...prices7d);
    const isLowestPrice7d = finalPrice <= minPrice7d && history7d.length >= 5;

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
      
      avgPrice: avgMonthly, // Passando o preço médio calculado
      discountPercent: discountPercent,
      isLowestPrice: isLowestPrice,       
      isLowestPrice7d: isLowestPrice7d,   
      
      rating: offer.ratingAverage ?? 0,
      reviewsCount: offer.ratingCount ?? 0,
    } as DrinkProduct;
  });

  const finalProducts = rankedProducts
    .filter((p): p is DrinkProduct => p !== null)
    .sort((a, b) => {
      const priceA = a.price ?? 0;
      const priceB = b.price ?? 0;
      const unitsA = a.numberOfDoses ?? 1;
      const unitsB = b.numberOfDoses ?? 1;

      if (order === "discount") return (b.discountPercent ?? 0) - (a.discountPercent ?? 0);
      if (order === "protein_gram") return b.proteinPerDose - a.proteinPerDose;
      if (order === "cheapest_unit") return (priceA / unitsA) - (priceB / unitsB);
      return a.pricePerGramProtein - b.pricePerGramProtein;
    });

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