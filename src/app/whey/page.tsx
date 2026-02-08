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
  description:
    "Compare o custo por grama de proteína e a concentração dos melhores Whey Proteins da Amazon.",
  alternates: {
    canonical: "/whey",
  },
};

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
  const order = params.order ?? "discount";
  const searchQuery = params.q || "";

  const selectedBrands = params.brand?.split(",") ?? [];
  const selectedFlavors = params.flavor?.split(",") ?? [];
  const selectedWeights = params.weight?.split(",") ?? [];
  const selectedProteinRanges = params.proteinRange?.split(",") ?? [];
  const maxPrice = params.priceMax ? Number(params.priceMax) : undefined;

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  /* =========================
      1. BUSCA FILTRADA
     ========================= */
  const products = await prisma.product.findMany({
    where: {
      category: "whey",
      ...(searchQuery && {
        name: { contains: searchQuery, mode: "insensitive" },
      }),
      ...(selectedBrands.length && { brand: { in: selectedBrands } }),
      ...(selectedFlavors.length && { flavor: { in: selectedFlavors } }),
      ...(selectedWeights.length && {
        wheyInfo: {
          totalWeightInGrams: { in: selectedWeights.map(Number) },
        },
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
      2. PROCESSAMENTO
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
    const proteinPercentage =
      (info.proteinPerDoseInGrams / info.doseInGrams) * 100;

    if (selectedProteinRanges.length > 0) {
      const match = selectedProteinRanges.some((r) => {
        const [min, max] = r.split("-").map(Number);
        return (
          proteinPercentage >= min &&
          proteinPercentage < (max === 100 ? 101 : max)
        );
      });
      if (!match) return null;
    }

    const totalDoses = info.totalWeightInGrams / info.doseInGrams;
    const totalProtein = totalDoses * info.proteinPerDoseInGrams;
    const pricePerGramProtein = finalPrice / totalProtein;

    let avgMonthly: number | null = null;
    let discountPercent: number | null = null;

    if (offer.priceHistory.length > 0) {
      const dailyPrices = new Map<string, number[]>();
      offer.priceHistory.forEach((h) => {
        const day = h.createdAt.toISOString().split("T")[0];
        if (!dailyPrices.has(day)) dailyPrices.set(day, []);
        dailyPrices.get(day)!.push(h.price);
      });

      const averages = Array.from(dailyPrices.values()).map(
        (p) => p.reduce((a, b) => a + b, 0) / p.length
      );

      avgMonthly =
        averages.reduce((a, b) => a + b, 0) / averages.length;

      if (avgMonthly > 0) {
        const raw = ((avgMonthly - finalPrice) / avgMonthly) * 100;
        if (raw >= 5) discountPercent = Math.round(raw);
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
      proteinPercentage,
      numberOfDoses: totalDoses,
      doseWeight: info.doseInGrams,

      pricePerGramProtein,
      avgPrice: avgMonthly,
      discountPercent,
      rating: offer.ratingAverage ?? 0,
      reviewsCount: offer.ratingCount ?? 0,
    };
  });

  /* =========================
      3. ORDENAÇÃO
     ========================= */
  const finalProducts = rankedProducts
    .filter((p): p is NonNullable<typeof p> => p !== null)
    .sort((a, b) => {
      if (order === "discount")
        return (b.discountPercent ?? 0) - (a.discountPercent ?? 0);
      if (order === "protein_dose")
        return b.proteinPerDose - a.proteinPerDose;
      if (order === "protein_percent")
        return b.proteinPercentage - a.proteinPercentage;
      if (order === "price_dose") {
        const aPrice =
          a.price && a.numberOfDoses ? a.price / a.numberOfDoses : Infinity;
        const bPrice =
          b.price && b.numberOfDoses ? b.price / b.numberOfDoses : Infinity;
        return aPrice - bPrice;
      }
      return a.pricePerGramProtein - b.pricePerGramProtein;
    });

  /* =========================
      4. FILTROS (AJUSTADOS)
     ========================= */
  const allOptions = await prisma.product.findMany({
    where: { category: "whey" },
    select: {
      brand: true,
      flavor: true,
      wheyInfo: { select: { totalWeightInGrams: true } },
    },
    // Removido o distinct restrito para capturar variações de peso (ex: 945g vs 900g)
  });

  const availableBrands = Array.from(
    new Set(allOptions.map((p) => p.brand))
  ).sort();

  const availableFlavors = Array.from(
    new Set(
      allOptions
        .map((p) => p.flavor)
        .filter((f): f is string => Boolean(f))
    )
  ).sort();

  const availableWeights = Array.from(
    new Set(
      allOptions
        .map((p) => p.wheyInfo?.totalWeightInGrams)
        .filter((w): w is number => Boolean(w))
    )
  ).sort((a, b) => a - b);

  return (
    <main className="bg-[#EAEDED] min-h-screen">
      <Suspense fallback={<div className="h-14 bg-[#232f3e] w-full" />}>
        <AmazonHeader />
      </Suspense>

      <div className="max-w-[1200px] mx-auto">
        <Suspense
          fallback={
            <div className="h-14 bg-white border-b border-zinc-200 w-full" />
          }
        >
          <FloatingFiltersBar />
        </Suspense>

        <div className="px-3">
          <Suspense fallback={null}>
            <MobileFiltersDrawer
              brands={availableBrands}
              flavors={availableFlavors}
              weights={availableWeights}
            />
          </Suspense>

          <div className="mt-4 pb-10 w-full">
            <p className="text-[13px] text-zinc-800 mb-2 px-1 font-medium">
              {finalProducts.length} produtos encontrados em Whey Protein
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