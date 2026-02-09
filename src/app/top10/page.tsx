import { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import Image from "next/image";
import { getOptimizedAmazonUrl } from "@/lib/utils";
import { AmazonHeader } from "./AmazonHeader";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Melhores Ofertas | Amazon Picks",
  description: "As maiores quedas de preço em suplementos hoje.",
};

// Interface Unificada para renderização
interface TopDealProduct {
  id: string;
  name: string;
  imageUrl: string;
  category: "creatina" | "whey" | "barra" | "bebidaproteica";
  price: number;
  avgPrice: number | null;
  discountPercent: number;
  affiliateUrl: string;
  rating: number;
  reviewsCount: number;
  flavor: string | null;
  specs: {
    doseWeight: number;
    amountPerDose: number;
    proteinPct?: number;
    pricePerUnit: number;
    totalUnits: number;
    unitLabel: string;
    metricLabel: string;
  };
}

export default async function Top10Page(props: {
  searchParams: Promise<{ q?: string }>;
}) {
  const searchParams = await props.searchParams;
  const query = searchParams.q;

  const products = await prisma.product.findMany({
    where: { 
      category: { in: ["creatina", "whey", "barra", "bebidaproteica"] },
      OR: query ? [
        { name: { contains: query, mode: 'insensitive' } },
        { flavor: { contains: query, mode: 'insensitive' } }
      ] : undefined
    },
    include: {
      offers: {
        where: { store: "AMAZON", affiliateUrl: { not: "" } },
        take: 1,
        include: { priceHistory: { orderBy: { createdAt: "desc" }, take: 30 } }
      },
      creatineInfo: true,
      wheyInfo: true,
      proteinBarInfo: true,
      proteinDrinkInfo: true,
    }
  });

  const deals = products.map((p): TopDealProduct | null => {
    const offer = p.offers[0];
    if (!offer || !offer.price || offer.price <= 0) return null;

    const history = offer.priceHistory.map((h) => h.price);
    const avgMonthly = history.length ? history.reduce((a, b) => a + b, 0) / history.length : offer.price;
    
    if (offer.price >= avgMonthly * 0.96) return null;
    const discount = Math.round(((avgMonthly - offer.price) / avgMonthly) * 100);
    if (discount < 5) return null;

    // CORREÇÃO DO LINT: Tipagem explícita em vez de 'any'
    let specs: TopDealProduct["specs"] | null = null;

    if (p.category === "whey" && p.wheyInfo) {
      const info = p.wheyInfo;
      const totalDoses = info.totalWeightInGrams / info.doseInGrams;
      specs = {
        doseWeight: info.doseInGrams,
        amountPerDose: info.proteinPerDoseInGrams,
        proteinPct: (info.proteinPerDoseInGrams / info.doseInGrams) * 100,
        pricePerUnit: offer.price / totalDoses,
        totalUnits: totalDoses,
        unitLabel: "dose",
        metricLabel: "proteína"
      };
    } else if (p.category === "creatina" && p.creatineInfo) {
      const info = p.creatineInfo;
      const totalDoses = info.totalUnits / info.unitsPerDose;
      specs = {
        doseWeight: info.unitsPerDose,
        amountPerDose: 3,
        pricePerUnit: offer.price / totalDoses,
        totalUnits: totalDoses,
        unitLabel: info.form === "GUMMY" ? "gummies" : "dose",
        metricLabel: "creatina"
      };
    } else if (p.category === "barra" && p.proteinBarInfo) {
      const info = p.proteinBarInfo;
      const units = info.unitsPerBox || 1;
      specs = {
        doseWeight: info.doseInGrams,
        amountPerDose: info.proteinPerDoseInGrams,
        pricePerUnit: offer.price / units,
        totalUnits: units,
        unitLabel: "unidade",
        metricLabel: "proteína"
      };
    } else if (p.category === "bebidaproteica" && p.proteinDrinkInfo) {
      const info = p.proteinDrinkInfo;
      const units = info.unitsPerPack || 1;
      specs = {
        doseWeight: info.volumePerUnitInMl,
        amountPerDose: info.proteinPerUnitInGrams,
        pricePerUnit: offer.price / units,
        totalUnits: units,
        unitLabel: "unidade",
        metricLabel: "proteína"
      };
    }

    if (!specs) return null;

    return {
      id: p.id,
      name: p.name,
      imageUrl: p.imageUrl,
      // CORREÇÃO DO LINT: Cast para o Union Type específico
      category: p.category as TopDealProduct["category"],
      price: offer.price,
      avgPrice: avgMonthly,
      discountPercent: discount,
      affiliateUrl: offer.affiliateUrl,
      rating: offer.ratingAverage ?? 0,
      reviewsCount: offer.ratingCount ?? 0,
      flavor: p.flavor,
      specs
    };
  })
  .filter((p): p is TopDealProduct => p !== null)
  .sort((a, b) => b.discountPercent - a.discountPercent)
  .slice(0, 10);

  return (
    <main className="min-h-screen bg-[#EAEDED] pb-10 font-sans">
      <AmazonHeader />
      
      <div className="max-w-xl mx-auto pt-4 px-2">
        <div className="space-y-4">
          {deals.map((product, index) => (
            <TopDealCard key={product.id} product={product} ranking={index + 1} />
          ))}
          {deals.length === 0 && (
            <div className="text-center py-20 bg-white rounded-lg border border-zinc-200">
              <p className="text-zinc-500 font-medium">Nenhuma oferta encontrada{query ? ` para "${query}"` : ""}.</p>
              <p className="text-xs text-zinc-400 mt-1">Tente pesquisar por outros termos ou marcas.</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function TopDealCard({ product, ranking }: { product: TopDealProduct, ranking: number }) {
  const { specs } = product;
  const intCents = product.price.toFixed(2).split(".");
  const formattedCount = product.reviewsCount >= 1000
    ? (product.reviewsCount / 1000).toFixed(1).replace(".", ",") + " mil"
    : product.reviewsCount.toString();

  const tableHeader = product.category === "bebidaproteica" 
    ? `unidade (${specs.doseWeight}ml)` 
    : `Análise por ${specs.unitLabel}`;

  return (
    <div className="flex gap-3 border border-gray-200 bg-white relative items-stretch min-h-[290px] rounded-lg overflow-hidden shadow-sm">
      <div className="absolute top-0 right-0 z-20 bg-[#232f3e] text-white text-[12px] font-bold px-3 py-1 rounded-bl-lg shadow-sm">#{ranking}</div>
      <div className="absolute top-4 left-0 z-10 bg-[#CC0C39] text-white text-[11px] font-bold px-2 py-0.5 rounded-r-sm shadow-sm">{product.discountPercent}% OFF</div>

      <div className="w-[140px] bg-[#f3f3f3] flex-shrink-0 flex items-center justify-center p-2 relative">
        <Image 
          src={getOptimizedAmazonUrl(product.imageUrl, 320)} 
          alt={product.name} 
          width={230} 
          height={230} 
          className="w-full h-auto max-h-[220px] object-contain mix-blend-multiply" 
          unoptimized 
        />
      </div>

      <div className="flex flex-col flex-1 pr-3 py-4">
        <h2 className="text-[14px] text-[#0F1111] leading-tight line-clamp-3 mb-1 font-normal">{product.name}</h2>

        <div className="flex items-center gap-1 mb-1 text-[12px]">
          <span className="font-normal text-[#0F1111]">{product.rating.toFixed(1)}</span>
          <div className="flex text-[#e47911] text-[10px]">
            {[...Array(5)].map((_, i) => (
              <span key={i}>{i < Math.floor(product.rating) ? "★" : "☆"}</span>
            ))}
          </div>
          <span className="text-[#007185]">({formattedCount})</span>
        </div>

        <div className="flex flex-wrap items-center gap-x-1.5 text-[12px] text-zinc-600 mb-1">
          {product.flavor && <span>Sabor: <b className="text-[#0F1111] font-medium">{product.flavor}</b></span>}
          {specs.totalUnits && (
            <b className="text-[#0F1111] font-medium">• {Math.floor(specs.totalUnits)} {specs.unitLabel === "dose" ? "doses" : "unidades"}</b>
          )}
        </div>

        <div className="bg-white border border-zinc-200 rounded p-2 mb-2 mt-1">
          <p className="text-[10px] uppercase font-bold text-zinc-500 mb-2 tracking-wide text-center border-b border-zinc-200 pb-1">{tableHeader}</p>
          <div className="flex items-center justify-around text-center pt-1">
            <div className="flex flex-col flex-1">
              <span className="text-[13px] font-bold text-[#0F1111]">{specs.amountPerDose}g</span>
              <span className="text-[9px] text-zinc-500 mt-0.5">{specs.metricLabel}</span>
            </div>
            <div className="w-[1px] h-6 bg-zinc-300 mx-1"></div>
            <div className="flex flex-col flex-1">
              <span className="text-[13px] font-bold text-green-700">R$ {specs.pricePerUnit.toFixed(2).replace('.', ',')}</span>
              <span className="text-[9px] text-green-700 font-medium mt-0.5">preço</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col mt-auto">
          <div className="flex items-baseline gap-2 flex-wrap">
            <div className="flex items-start text-[#CC0C39]">
              <span className="text-[12px] mt-1.5 font-medium">R$</span>
              <span className="text-3xl font-medium tracking-tight leading-none">{intCents[0]}</span>
              <span className="text-[12px] mt-1.5 font-medium">{intCents[1]}</span>
            </div>
            {product.avgPrice && <span className="text-[12px] text-zinc-500 line-through">R$ {product.avgPrice.toFixed(2).replace(".", ",")}</span>}
          </div>
          <div className="mt-1 flex items-center">
            <span className="font-black italic text-[12px] leading-none flex items-center text-[#00A8E1]">
              <span className="not-italic text-[13px] text-[#FEBD69] mr-0.5">✓</span>prime
            </span>
          </div>
        </div>

        <div className="mt-3">
          <a 
            href={product.affiliateUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="block w-full bg-[#FFD814] border border-[#FCD200] rounded-full py-2.5 text-[13px] text-center font-medium text-[#0F1111] shadow-sm active:scale-95 transition-transform"
          >
            Ver na Amazon
          </a>
        </div>
      </div>
    </div>
  );
}