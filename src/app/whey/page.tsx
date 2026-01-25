import { prisma } from "@/lib/prisma";
import { ProductList } from "./ProductList";
import { DesktopFiltersSidebar } from "./DesktopFiltersSidebar";
import { FloatingFiltersBar } from "./FloatingFiltersBar";
import { AmazonHeader } from "./AmazonHeader";
import { MobileFiltersDrawer } from "./MobileFiltersDrawer";

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

  // 1. Busca no Banco
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
          }
        },
        orderBy: { updatedAt: "desc" },
        take: 1,
      },
    },
  });

  // 2. Mapeamento e Cálculos
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
    
    // Cálculo da concentração proteica
    const proteinPercentage = (info.proteinPerDoseInGrams / info.doseInGrams) * 100;

    // Filtro por faixa de proteína
    if (selectedProteinRanges.length > 0) {
      const match = selectedProteinRanges.some(r => {
        const [min, max] = r.split("-").map(Number);
        return proteinPercentage >= min && proteinPercentage < (max === 100 ? 101 : max);
      });
      if (!match) return null;
    }

    const totalDoses = info.totalWeightInGrams / info.doseInGrams;
    const pricePerGramProtein = finalPrice / (totalDoses * info.proteinPerDoseInGrams);

    // Lógica de Desconto
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
      imageUrl: product.imageUrl,
      flavor: product.flavor,
      price: finalPrice,
      affiliateUrl: offer.affiliateUrl,
      proteinPerDose: info.proteinPerDoseInGrams, // ✅ Nome sincronizado com o Card
      proteinPercentage: proteinPercentage,       // ✅ Nome sincronizado com o Card
      numberOfDoses: totalDoses,
      pricePerGramProtein,
      discountPercent,
      avg30Price: discountPercent ? avg30 : null,
      rating: offer.ratingAverage ?? 0,
      reviewsCount: offer.ratingCount ?? 0,
    };
  }).filter((p): p is NonNullable<typeof p> => p !== null);

  // 3. Ordenação Final
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
    return a.pricePerGramProtein - b.pricePerGramProtein;
  });

  const brands = [...new Set(products.map(p => p.brand))];
  const flavors = [...new Set(products.map(p => p.flavor).filter(f => !!f))];

  return (
    <main className="bg-[#EAEDED] min-h-screen">
      <AmazonHeader />
      <div className="max-w-[1200px] mx-auto">
        <FloatingFiltersBar />
        <div className="px-3">
          <MobileFiltersDrawer brands={brands} flavors={flavors as string[]} />
          
          <div className="flex flex-col lg:flex-row gap-6 mt-4">
            <aside className="hidden lg:block w-64 shrink-0">
              <DesktopFiltersSidebar brands={brands} flavors={flavors as string[]} />
            </aside>
            <div className="w-full max-w-[680px] pb-10">
              <p className="text-[13px] text-gray-500 mb-2 px-1">
                {finalProducts.length} resultados encontrados
              </p>
              <ProductList products={finalProducts} />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}