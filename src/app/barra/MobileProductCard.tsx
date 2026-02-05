"use client";

import Image from "next/image";
import { useState } from "react";
// ✅ Importação correta do GA4
import { sendGAEvent } from "@next/third-parties/google"; 

export type BarraProduct = {
  id: string;
  name: string;
  imageUrl: string;
  flavor: string | null;
  weightPerBar: number;           // Peso de uma unidade (ex: 40g, 90g)
  
  price: number | null;
  affiliateUrl: string;

  proteinPerBar: number;          // Proteína por unidade
  unitsPerBox: number | null;     // Total de unidades na caixa
  pricePerGramProtein: number;    // Custo-benefício real
  
  discountPercent?: number | null;
  avgPrice?: number | null; 
  isLowestPrice?: boolean;    
  isLowestPrice7d?: boolean; 

  rating?: number;
  reviewsCount?: number;
};

export function MobileProductCard({
  product,
  priority,
}: {
  product: BarraProduct;
  priority: boolean;
}) {
  const [showTooltip, setShowTooltip] = useState(false);

  const hasPrice = typeof product.price === "number" && product.price > 0;
  const intCents = hasPrice ? product.price!.toFixed(2).split(".") : null;
  const rating = product.rating ?? 0;
  const reviewsCount = product.reviewsCount ?? 0;
  
  const formattedCount = reviewsCount >= 1000
      ? (reviewsCount / 1000).toFixed(1).replace(".", ",") + " mil"
      : reviewsCount.toString();

  // CÁLCULOS DINÂMICOS
  // 1. Preço por unidade (Barra)
  const pricePerUnit = (hasPrice && product.unitsPerBox && product.unitsPerBox > 0)
    ? (product.price! / product.unitsPerBox).toFixed(2)
    : null;

  // 2. Porcentagem de Proteína (Proteína / Peso da Barra)
  const proteinPct = (product.proteinPerBar && product.weightPerBar)
    ? ((product.proteinPerBar / product.weightPerBar) * 100).toFixed(0)
    : "0";

  // 🚀 FUNÇÃO DE RASTREIO
  const handleTrackClick = () => {
    const asinMatch = product.affiliateUrl.match(/\/dp\/([A-Z0-9]{10})/);
    const asin = asinMatch ? asinMatch[1] : 'SEM_ASIN';
    const nomeRelatorio = `${product.name} - ${asin}`;

    sendGAEvent('event', 'click_na_oferta', {
      produto_nome: nomeRelatorio,
      produto_id: product.id,
      valor: product.price || 0,
      loja: "Amazon",
      asin: asin,
      categoria: "barrinhas"
    });
  };

  return (
    <div className="flex gap-3 border-b border-gray-100 bg-white relative items-stretch min-h-[290px] font-sans">
      
      {/* Selo de % OFF */}
      {hasPrice && product.discountPercent && (
        <div className="absolute top-3 left-0 z-10 bg-[#CC0C39] text-white text-[11px] font-bold px-2 py-0.5 rounded-r-sm shadow-sm">
          {product.discountPercent}% OFF
        </div>
      )}

      {/* Coluna da Imagem (Fundo Branco Padrão Whey) */}
      <div className="w-[130px] bg-white flex-shrink-0 flex items-center justify-center p-2 relative">
        <div className="absolute inset-2 bg-zinc-50 rounded-lg -z-10" />
        <Image
          src={product.imageUrl}
          alt={product.name}
          width={200}
          height={200}
          sizes="130px"
          priority={priority} 
          className="w-full h-auto max-h-[180px] object-contain mix-blend-multiply"
        />
      </div>

      {/* Coluna de Informações */}
      <div className="flex flex-col flex-1 pr-3 py-3">
        <h2 className="text-[14px] text-[#0F1111] leading-[1.2] line-clamp-2 mb-1 font-normal hover:text-[#C7511F] transition-colors cursor-pointer">
          {product.name}
        </h2>

        {/* Avaliações */}
        <div className="flex items-center gap-1 mb-1">
          <span className="text-[12px] font-normal text-[#0F1111]">{rating.toFixed(1)}</span>
          <div className="flex text-[#DE7921] text-[12px] tracking-tighter" aria-hidden="true">
            {[...Array(5)].map((_, i) => (
              <span key={i}>{i < Math.floor(rating) ? "★" : "☆"}</span>
            ))}
          </div>
          <span className="text-[11px] text-[#565959]">({formattedCount})</span>
        </div>

        {/* Info secundária: Sabor e Unidades */}
        <div className="flex flex-wrap items-center gap-x-1.5 text-[12px] text-zinc-600 mb-2">
          {product.flavor && (
            <span>Sabor: <b className="text-[#0F1111] font-medium">{product.flavor}</b></span>
          )}
          {product.unitsPerBox && (
            <>
              {product.flavor && <span aria-hidden="true">•</span>}
              <b className="text-[#0F1111] font-medium">{product.unitsPerBox} unidades</b>
            </>
          )}
        </div>

        {/* --- TABELA TÉCNICA (Padrão Whey adaptado para Unidade) --- */}
        <div className="bg-zinc-50 border border-zinc-200 rounded p-2 mb-2">
           {/* Título: Peso da Unidade */}
           <p className="text-[10px] uppercase font-bold text-zinc-500 mb-2 tracking-wide text-center border-b border-zinc-200 pb-1">
             Análise por unidade ({product.weightPerBar}g)
           </p>
           
           <div className="flex items-center justify-between text-center pt-1">
              {/* Coluna 1: Proteína */}
              <div className="flex flex-col flex-1">
                 <span className="text-[13px] font-bold text-[#0F1111] leading-none">
                    {product.proteinPerBar}g
                 </span>
                 <span className="text-[9px] text-zinc-500 mt-0.5">proteína</span>
              </div>

              {/* Divisor Vertical */}
              <div className="w-[1px] h-6 bg-zinc-300 mx-1"></div>

              {/* Coluna 2: Concentração (%) */}
              <div className="flex flex-col flex-1">
                 <span className="text-[13px] font-bold text-[#0F1111] leading-none">
                    {proteinPct}%
                 </span>
                 <span className="text-[9px] text-zinc-500 mt-0.5">conc. de proteína</span>
              </div>

              {/* Divisor Vertical */}
              <div className="w-[1px] h-6 bg-zinc-300 mx-1"></div>

              {/* Coluna 3: Preço por Unidade (Destaque) */}
              <div className="flex flex-col flex-1">
                 {pricePerUnit ? (
                   <span className="text-[13px] font-bold text-green-700 leading-none">
                      R$ {pricePerUnit.replace('.', ',')}
                   </span>
                 ) : (
                   <span className="text-[13px] font-bold text-zinc-400">-</span>
                 )}
                 <span className="text-[9px] text-green-700 font-medium mt-0.5">preço</span>
              </div>
           </div>
        </div>

        {/* Selos de Menor Preço */}
        {(product.isLowestPrice || product.isLowestPrice7d) && (
           <div className="mb-1">
            <span className="bg-[#B12704] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-sm">
              {product.isLowestPrice ? "Menor preço (30d)" : "Menor preço (7d)"}
            </span>
          </div>
        )}

        {/* Bloco de Preço Estilo Amazon */}
        <div className="flex flex-col mt-auto">
          {hasPrice ? (
            <>
              {/* Preço De: */}
              {product.avgPrice && (Math.round(product.avgPrice * 100) > Math.round(product.price! * 100)) && (
                  <span className="text-[11px] text-[#565959] line-through">
                    De: R$ {product.avgPrice.toFixed(2).replace(".", ",")}
                  </span>
              )}

              {/* Preço Atual */}
              <div className="flex items-baseline gap-1">
                <span className="text-[12px] font-medium relative -top-1.5">R$</span>
                <span className="text-[26px] font-medium leading-none text-[#0F1111]">
                  {intCents![0]}
                </span>
                <span className="text-[12px] font-medium relative -top-1.5">
                  {intCents![1]}
                </span>
              </div>

              {/* Preço por grama de proteína */}
              <div className="text-[10px] text-[#565959] mt-0.5">
                (R$ {product.pricePerGramProtein.toFixed(2).replace(".", ",")} / g de proteína)
              </div>
            </>
          ) : (
            <p className="text-[13px] text-zinc-800 italic">Indisponível</p>
          )}
        </div>

        {/* Selo Prime e Botão */}
        <div className="mt-2 flex items-center justify-between gap-2">
            <div className="flex items-center">
                 <span className="text-[#00A8E1] font-bold italic text-[13px] leading-none flex items-center">
                    <span className="text-[#FEBD69] text-[16px] mr-0.5">✓</span>prime
                 </span>
            </div>

            <a
                href={product.affiliateUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleTrackClick}
                className="bg-[#FFD814] hover:bg-[#F7CA00] border border-[#FCD200] rounded-full px-4 py-1.5 text-[12px] text-[#0F1111] font-medium shadow-sm active:scale-95 transition-all text-center whitespace-nowrap"
            >
                Ver na Amazon
            </a>
        </div>
      </div>
    </div>
  );
}