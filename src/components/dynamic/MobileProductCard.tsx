"use client";

import Image from "next/image";
import { sendGAEvent } from "@next/third-parties/google";

export type DynamicProductType = {
  id: string;
  name: string;
  imageUrl: string;
  price: number;
  affiliateUrl: string;
  pricePerUnit: number;
  ratingAverage?: number | null;
  ratingCount?: number | null;
  attributes: Record<string, string | number | undefined>;
};

interface DisplayConfigField {
  key: string;
  label: string;
  type: "text" | "number" | "currency";
}

export function MobileProductCard({ 
  product, 
  priority, 
  displayConfig 
}: { 
  product: DynamicProductType; 
  priority: boolean; 
  displayConfig: DisplayConfigField[] 
}) {
  const hasPrice = product.price > 0;
  const intCents = hasPrice ? product.price.toFixed(2).split(".") : null;

  const rating = Number(product.ratingAverage) || 0;
  const reviewsCount = Number(product.ratingCount) || 0;

  const formattedCount =
    reviewsCount >= 1000
      ? (reviewsCount / 1000).toFixed(1).replace(".", ",") + " mil"
      : reviewsCount.toString();

  const handleTrackClick = () => {
    const asinMatch = product.affiliateUrl.match(/\/dp\/([A-Z0-9]{10})/);
    const asin = asinMatch ? asinMatch[1] : "SEM_ASIN";
    
    sendGAEvent("event", "click_na_oferta", {
      produto_nome: `${product.name} - ${asin}`,
      produto_id: product.id,
      valor: product.price || 0,
      loja: "Amazon",
      asin,
      categoria: "dinamica", 
    });
  };

  return (
    <div className="flex gap-3 border-b border-gray-100 bg-white relative items-stretch min-h-[220px] font-sans">
      
      {/* Imagem */}
      <div className="w-[140px] bg-[#f3f3f3] flex-shrink-0 flex items-center justify-center p-2 relative">
        {product.imageUrl ? (
            <Image
              src={product.imageUrl}
              alt={product.name}
              width={230}
              height={230}
              sizes="140px"
              priority={priority}
              className="w-full h-auto max-h-[200px] object-contain mix-blend-multiply"
            />
        ) : (
          <span className="text-[10px] text-zinc-400">Sem imagem</span>
        )}
      </div>

      <div className="flex flex-col flex-1 pr-2 py-4">
        {/* Título */}
        <h2 className="text-[14px] text-[#0F1111] leading-tight line-clamp-3 mb-1 font-normal">
          {product.name}
        </h2>

        {/* Avaliações */}
        {(rating > 0 || reviewsCount > 0) && (
          <div className="flex items-center gap-1 mb-3 text-[12px]">
            <span className="font-normal text-[#0F1111]">{rating.toFixed(1)}</span>
            <div className="flex text-[#e47911] text-[10px] tracking-tighter" aria-hidden="true">
              {[...Array(5)].map((_, i) => (
                <span key={i}>{i < Math.floor(rating) ? "★" : "☆"}</span>
              ))}
            </div>
            <span className="text-[#007185]">({formattedCount})</span>
          </div>
        )}

        {/* Tabela Técnica Corrigida */}
        <div className={`bg-white border border-zinc-200 rounded p-2 mb-3 grid grid-cols-2 gap-2 divide-x divide-zinc-200 ${rating === 0 ? 'mt-2' : ''}`}>
           {displayConfig.map((config) => {
             const rawValue = product.attributes[config.key];
             let displayValue = rawValue ? String(rawValue) : '-';

             if (config.type === 'currency') {
               // 🚀 LÓGICA POR ORDEM: Busca o primeiro campo do tipo 'number'
               const targetConfig = displayConfig.find(c => c.type === 'number');
               const quantity = targetConfig ? Number(product.attributes[targetConfig.key]) : 0;
               
               if (quantity > 0) {
                 const calculated = product.price / quantity;
                 
                 // 🎯 NOVA REGRA DE CASAS DECIMAIS:
                 // Se < 0,10: 3 casas (ex: 0,038)
                 // Se >= 0,10: 2 casas (ex: 0,45 ou 1,20)
                 const decimals = calculated < 0.1 ? 3 : 2;
                 
                 displayValue = `R$ ${calculated.toFixed(decimals).replace('.', ',')}`;
               } else {
                 displayValue = rawValue ? `R$ ${Number(rawValue).toFixed(2).replace('.', ',')}` : 'R$ 0,00';
               }
             }

             return (
               <div key={config.key} className="flex flex-col text-center px-1 overflow-hidden">
                 <span className="text-[13px] font-bold text-[#0F1111] leading-none truncate mb-1">
                   {displayValue}
                 </span>
                 <span className="text-[9px] uppercase font-bold text-zinc-500 tracking-wide truncate">
                   {config.label}
                 </span>
               </div>
             );
           })}
        </div>

        {/* Preço e Prime */}
        <div className="flex flex-col mt-auto">
          {hasPrice ? (
            <>
              <div className="flex items-baseline gap-2">
                <div className="flex items-start text-[#0F1111]">
                  <span className="text-[12px] mt-1.5 font-medium">R$</span>
                  <span className="text-3xl font-medium tracking-tight leading-none">{intCents![0]}</span>
                  <span className="text-[12px] mt-1.5 font-medium">{intCents![1]}</span>
                </div>
              </div>
              <div className="mt-1 flex items-center">
                <span className="font-black italic text-[12px] leading-none flex items-center text-[#00A8E1]">
                  <span className="not-italic text-[13px] text-[#FEBD69] mr-0.5" aria-hidden="true">✓</span>
                  prime
                </span>
              </div>
            </>
          ) : (
            <p className="text-[13px] text-zinc-800 italic">Preço indisponível</p>
          )}

          <div className="mt-3">
            <a
              href={product.affiliateUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleTrackClick}
              className="block w-full bg-[#FFD814] border border-[#FCD200] rounded-full py-2.5 text-[13px] text-center font-medium shadow-sm active:scale-95 transition-transform text-[#0F1111]"
            >
              Ver na Amazon
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}