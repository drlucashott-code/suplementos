import { prisma } from "@/lib/prisma";
import { ProductList } from "./ProductList";
import { MobileFiltersDrawer } from "./MobileFiltersDrawer";
import { DesktopFiltersSidebar } from "./DesktopFiltersSidebar";
import { FloatingFiltersBar } from "@/components/FloatingFiltersBar";
import { AmazonHeader } from "./AmazonHeader";
import { CreatineForm } from "@prisma/client";

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

  // 🚀 BUSCA OTIMIZADA: Trazemos o histórico junto para evitar N+1 queries
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

  /* =========================
      PROCESSAMENTO (MAIS RÁPIDO)
      ========================= */
  const rankedProducts = products.map((product) => {
    if (!product.creatineInfo) return null;
    const offer = product.offers[0];
    if (!offer) return null;

    let finalPrice = offer.price;

    // Fallback usando o histórico que já temos em memória
    if (showFallback && (!finalPrice || finalPrice <= 0)) {
      finalPrice = offer.priceHistory[0]?.price ?? null;
    }

    if (!showFallback && (!finalPrice || finalPrice <= 0)) return null;

    if (!finalPrice || finalPrice <= 0) {
      return {
        id: product.id,
        name: product.name,
        imageUrl: product.imageUrl,
        flavor: product.flavor,
        form: product.creatineInfo.form,
        price: null,
        affiliateUrl: offer.affiliateUrl,
        doses: null,
        pricePerGram: Infinity,
        discountPercent: null,
        avg30Price: null,
        rating: offer.ratingAverage ?? 0,
        reviewsCount: offer.ratingCount ?? 0,
        hasCarbs: false,
      };
    }

    if (maxPrice !== undefined && finalPrice > maxPrice) return null;

    /* ============================================================
       LÓGICA DE PUREZA BASEADA NO SCOOP (3g de Creatina Fixa)
       ============================================================ */
    const info = product.creatineInfo;
    const totalDosesNoPote = info.totalUnits / info.unitsPerDose;
    
    // Consideramos que cada dose entrega exatamente 3g de creatina pura
    const gramasCreatinaPuraNoPote = totalDosesNoPote * 3;
    
    // O preço por grama agora reflete a creatina real, não o peso do pó
    const pricePerGramCreatine = finalPrice / gramasCreatinaPuraNoPote;

    // Identificação de Carboidratos: scoop > 4g
    const hasCarbs = info.unitsPerDose > 4;

    // Cálculo de desconto usando o histórico em memória
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

  return (
    <main className="bg-[#EAEDED] min-h-screen">
      <AmazonHeader />
      <div className="max-w-[1200px] mx-auto">
        <FloatingFiltersBar />
        <div className="px-3">
          <MobileFiltersDrawer brands={brands} flavors={flavors} />
          <div className="flex flex-col lg:flex-row gap-6 mt-4">
            <aside className="hidden lg:block w-64 shrink-0">
              <DesktopFiltersSidebar brands={brands} flavors={flavors} />
            </aside>
            <div className="w-full max-w-[680px] pb-10">
              <p className="text-[13px] text-gray-600 mb-2 px-1">
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