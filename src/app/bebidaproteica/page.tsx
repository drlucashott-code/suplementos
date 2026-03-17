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
  title: "Amazonpicks.com.br | Bebida Proteica",
  description: "Compare o custo-benefício das melhores bebidas proteicas na Amazon.",
  alternates: { canonical: "/bebidaproteica" },
};

type SearchParams = {
  brand?: string;
  flavor?: string;
  priceMax?: string;
  order?: "discount" | "protein_gram" | "cheapest_unit" | "cost" | "price_asc";
  proteinRange?: string;
  q?: string;
  seller?: string;
};

const removeAccents = (str: string) => {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
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
  const selectedSellers = params.seller?.split(",") ?? [];
  const maxPrice = params.priceMax ? Number(params.priceMax) : undefined;

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const twentyFourHoursAgo = new Date();
  twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

  const stopWords = [
    "bebida",
    "bebidas",
    "proteica",
    "proteíca",
    "pronta",
    "de",
    "da",
    "do",
    "proteina",
    "proteína",
  ];

  const searchWords = searchQuery
    .trim()
    .split(/\s+/)
    .map((word) => removeAccents(word.toLowerCase()))
    .filter((word) => !stopWords.includes(word) && word.length > 0);

  const products = await prisma.product.findMany({
    where: {
      category: "bebidaproteica",
      ...(selectedBrands.length && { brand: { in: selectedBrands } }),
      ...(selectedFlavors.length && { flavor: { in: selectedFlavors } }),
    },
    include: {
      proteinDrinkInfo: true,
      offers: {
        where: {
          store: "AMAZON",
          affiliateUrl: { not: "" },
          ...(selectedSellers.length && { seller: { in: selectedSellers } }),
        },
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

  const matchedProducts = products.filter((product) => {
    if (searchWords.length === 0) return true;

    const productText = removeAccents(
      `${product.name} ${product.brand} ${product.flavor || ""}`.toLowerCase()
    );

    return searchWords.every((word) => productText.includes(word));
  });

  const rankedProducts = matchedProducts.map((product) => {
    if (!product.proteinDrinkInfo) return null;

    const offer = product.offers[0];
    if (!offer) return null;

    let finalPrice = offer.price;
    let priceDate = offer.updatedAt;

    if (showFallback && (!finalPrice || finalPrice <= 0)) {
      finalPrice = offer.priceHistory[0]?.price ?? null;
      priceDate = offer.priceHistory[0]?.createdAt ?? offer.updatedAt;
    }

    if (!finalPrice || finalPrice <= 0) return null;
    if (new Date(priceDate) < twentyFourHoursAgo) return null;
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

      if (averages.length > 0) {
        avgMonthly = averages.reduce((a, b) => a + b, 0) / averages.length;

        if (avgMonthly > finalPrice) {
          const raw = ((avgMonthly - finalPrice) / avgMonthly) * 100;
          if (raw >= 5) discountPercent = Math.round(raw);
        }
      }
    }

    const isLowestPrice = false;
    const isLowestPrice7d = false;

    return {
      id: product.id,
      name: product.name,
      imageUrl: getOptimizedAmazonUrl(product.imageUrl, 320),
      flavor: product.flavor,
      price: finalPrice,
      affiliateUrl: offer.affiliateUrl,
      doseWeight: info.volumePerUnitInMl,
      proteinPerDose,
      numberOfDoses: unitsPerPack,
      pricePerGramProtein,
      avgPrice: avgMonthly,
      discountPercent,
      isLowestPrice,
      isLowestPrice7d,
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

      if (order === "discount") {
        const diff = (b.discountPercent ?? 0) - (a.discountPercent ?? 0);
        if (diff !== 0) return diff;
        return priceA - priceB;
      }

      if (order === "protein_gram") {
        const diff = b.proteinPerDose - a.proteinPerDose;
        if (diff !== 0) return diff;
        return priceA - priceB;
      }

      if (order === "cheapest_unit") {
        const diff = priceA / unitsA - priceB / unitsB;
        if (diff !== 0) return diff;
        return priceA - priceB;
      }

      if (order === "price_asc") {
        const diff = priceA - priceB;
        if (diff !== 0) return diff;
        return a.pricePerGramProtein - b.pricePerGramProtein;
      }

      const diff = a.pricePerGramProtein - b.pricePerGramProtein;
      if (diff !== 0) return diff;
      return priceA - priceB;
    });

  const allOptions = await prisma.product.findMany({
    where: { category: "bebidaproteica" },
    select: { brand: true, flavor: true },
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

  const rawSellers = await prisma.offer.findMany({
    where: {
      store: "AMAZON",
      seller: { not: null },
      product: { category: "bebidaproteica" },
    },
    distinct: ["seller"],
    select: { seller: true },
  });

  let availableSellers = rawSellers.map((s) => s.seller as string);
  const amazonOfficial = "Amazon.com.br";

  availableSellers = availableSellers
    .filter((seller) => seller !== amazonOfficial && seller !== "Desconhecido")
    .sort((a, b) => a.localeCompare(b));

  if (rawSellers.some((s) => s.seller === amazonOfficial)) {
    availableSellers.unshift(amazonOfficial);
  }

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
              sellers={availableSellers}
            />
          </Suspense>

          <div className="mt-4 pb-10 w-full">
            <p className="text-[13px] text-zinc-800 mb-2 px-1 font-medium">
              {finalProducts.length} produtos encontrados
            </p>
            <ProductList
              products={finalProducts}
              viewEventName="view_drink_list"
            />
          </div>
        </div>
      </div>
    </main>
  );
}
