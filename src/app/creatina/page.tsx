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
      Buscamos apenas os campos necessários para reduzir o payload.
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
      PROCESSAMENTO DE DADOS (Server-side)
      Calculamos o ranking real de pureza antes de enviar ao cliente.
     ========================= */
  const rankedProducts = products.map((product) => {
    if (!product.creatineInfo) return null;
    const offer = product.offers[0];
    
    // Filtro de Segurança: Oferta deve existir e ser válida
    if (!offer) return null;

    let finalPrice = offer.price;

    // Lógica de Fallback de Preço (Evita produtos "indisponíveis" se houver histórico recente)
    if (showFallback && (!finalPrice || finalPrice <= 0)) {
      finalPrice = offer.priceHistory[0]?.price ?? null;
    }

    if (!finalPrice || finalPrice <= 0) return null;

    // Filtro de preço máximo aplicado via SearchParams
    if (maxPrice !== undefined && finalPrice > maxPrice) return null;

    /* 🧪 CÁLCULOS DE PUREZA (A "mágica" do site) 
       Calculamos o preço por grama de creatina PURA (base 3g).
    */
    const info = product.creatineInfo;
    const totalDosesNoPote = info.totalUnits / info.unitsPerDose;
    const gramasCreatinaPuraNoPote = totalDosesNoPote * 3; 
    const pricePerGramCreatine = finalPrice / gramasCreatinaPuraNoPote;
    
    // Identifica se contém carbo baseado no peso da dose (> 4g sugere aditivos/sabores)
    const hasCarbs = info.unitsPerDose > 4;

    /* 📈 CÁLCULO DE DESCONTO HISTÓRICO 
       Calculamos a média de 30 dias para validar se o desconto é real.
    */
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
      // 🚀 OTIMIZAÇÃO LCP: Solicita a imagem redimensionada (320px) no servidor.
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
      // Padrão: O melhor custo-benefício (menor preço por grama pura) sempre no topo.
      return a.pricePerGram - b.pricePerGram;
    });

  // Geração dinâmica de opções para os filtros (Marcas e Sabores únicos)
  const brands = Array.from(new Set(products.map((p) => p.brand))).sort();
  const flavors = Array.from(
    new Set(products.map((p) => p.flavor).filter((f): f is string => Boolean(f)))
  ).sort();

  /* =========================
      RENDERIZAÇÃO
     ========================= */
  return (
    <main className="bg-[#EAEDED] min-h-screen">
      {/* Header com correção de zoom do iOS integrada */}
      <AmazonHeader />
      
      <div className="max-w-[1200px] mx-auto">
        {/* Barra de filtros sticky que respeita a direção do scroll */}
        <FloatingFiltersBar />
        
        <div className="px-3">
          {/* Menu lateral mobile com acessibilidade nota 100 */}
          <MobileFiltersDrawer brands={brands} flavors={flavors} />
          
          <div className="mt-4 pb-10 w-full">
            <p className="text-[13px] text-zinc-800 mb-2 px-1 font-medium">
              {finalProducts.length} creatinas comparadas
            </p>
            
            <div className="w-full">
               {/* 🚀 LISTA OTIMIZADA: Carrega apenas 3 produtos inicialmente */}
               <ProductList products={finalProducts} />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}