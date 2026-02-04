"use client";

import Image from "next/image";
import { useState } from "react";
import { sendGAEvent } from "@next/third-parties/google"; // 🚀 Rastreio GA4

export type BarraProduct = {
  id: string;
  name: string;
  imageUrl: string;
  flavor: string | null;
  weightPerBar: number;           // g de peso total da barra (para cálculo de %)
  
  price: number | null;
  pricePerBar: number;             // <--- Custo por unidade calculado
  affiliateUrl: string;

  proteinPerBar: number;           // g de proteína por unidade
  unitsPerBox: number | null;      // Total de barras na caixa
  pricePerGramProtein: number;     // Custo-benefício real
  
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

  // 🚀 Função para rastrear clique em Barrinhas
  const handleTrackClick = () => {
    sendGAEvent({
      event: "amazon_click",
      category: "barrinhas",
      product_name: product.name,
      value: product.price || 0,
    });
  };

  return (
    <div className="flex gap-3 border-b border-gray-100 bg-white relative items-stretch min-h-[260px]">
      
      {/* Selo de % OFF (Estilo Amazon) */}
      {hasPrice && product.discountPercent && (
        <div className="absolute top-4 left-0 z-10 bg-[#CC0C39] text-white text-[11px] font-bold px-2 py-0.5 rounded-r-sm shadow-sm">
          {product.discountPercent}% OFF
        </div>
      )}

      {/* Coluna da Imagem */}
      <div className="w-[140px] bg-[#f3f3f3] flex-shrink-0 flex items-center justify-center overflow-hidden p-2">
        <Image
          src={product.imageUrl}
          alt={product.name}
          width={230}
          height={230}
          sizes="140px"
          priority={priority} 
          className="w-full h-auto max-h-[220px] object-contain mix-blend-multiply"
        />
      </div>

      {/* Coluna de Informações */}
      <div className="flex flex-col flex-1 pr-2 py-4">
        <h2 className="text-[14px] text-[#0F1111] leading-tight line-clamp-3 mb-1 font-normal">
          {product.name}
        </h2>

        {/* Avaliações */}
        <div className="flex items-center gap-1 mb-1 text-[12px]">
          <span className="font-normal text-[#0F1111]">{rating.toFixed(1)}</span>
          <div className="flex text-[#e47911] text-[10px] tracking-tighter" aria-hidden="true">
            {[...Array(5)].map((_, i) => (
              <span key={i}>{i < Math.floor(rating) ? "★" : "☆"}</span>
            ))}
          </div>
          <span className="text-[#007185]">({formattedCount})</span>
        </div>

        {/* Info secundária: Sabor e Unidades */}
        <div className="flex flex-wrap items-center gap-x-1.5 text-[12px] text-zinc-600 mb-1">
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

        {/* --- NOVA ÁREA DE CÁLCULO VISUAL (Preço/Barra | Proteína = Custo Benefício) --- */}
        <div className="flex flex-wrap items-center gap-1.5 mb-2 mt-1">
          
          {/* Bloco Unificado: Dados da conta (Cinza Neutro) */}
          <div className="flex items-center border border-zinc-300 rounded overflow-hidden text-[10px] bg-white">
             {/* Parte 1: Preço por barra */}
             <span className="px-1.5 py-0.5 text-zinc-600 font-medium bg-zinc-50">
                R$ {product.pricePerBar.toFixed(2).replace(".", ",")}
             </span>
             
             {/* Divisor Vertical */}
             <div className="w-[1px] self-stretch bg-zinc-300"></div>

             {/* Parte 2: Proteína por barra */}
             <span className="px-1.5 py-0.5 text-zinc-800 font-bold bg-zinc-50">
                {product.proteinPerBar}g PROT
             </span>
          </div>

          {/* Símbolo de Igual */}
          <span className="text-zinc-400 text-[12px] font-bold leading-none">=</span>

          {/* Resultado: Custo Benefício (Verde Destaque) */}
          <span className="text-[10px] bg-green-100 text-green-800 border border-green-300 px-1.5 py-0.5 rounded font-bold uppercase tracking-tight">
             R$ {product.pricePerGramProtein.toFixed(2).replace(".", ",")} / g
          </span>

        </div>

        {/* Selos de Menor Preço */}
        <div className="flex flex-col gap-1 mb-1">
          {product.isLowestPrice ? (
            <div className="inline-block">
              <span className="bg-[#CC0C39] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-sm">
                Menor preço em 30 dias
              </span>
            </div>
          ) : product.isLowestPrice7d ? (
            <div className="inline-block">
              <span className="bg-[#CC0C39] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-sm">
                Menor preço em 7 dias
              </span>
            </div>
          ) : null}
        </div>

        {/* Bloco de Preço Estilo Amazon */}
        <div className="flex flex-col mt-1">
          {hasPrice ? (
            <>
              <div className="flex items-baseline gap-2 flex-wrap">
                <div className="flex items-start text-[#0F1111]">
                  <span className="text-[12px] mt-1.5 font-medium">R$</span>
                  <span className="text-3xl font-medium tracking-tight leading-none">
                    {intCents![0]}
                  </span>
                  <span className="text-[12px] mt-1.5 font-medium">
                    {intCents![1]}
                  </span>
                </div>

                {product.avgPrice && (Math.round(product.avgPrice * 100) > Math.round(product.price! * 100)) && (
                  <div className="relative flex items-center gap-1">
                    <span className="text-[12px] text-zinc-500">
                      De: <span className="line-through">R${product.avgPrice.toFixed(2).replace(".", ",")}</span>
                    </span>
                    <button 
                      onClick={(e) => {
                        e.preventDefault();
                        setShowTooltip(!showTooltip);
                      }}
                      className="text-zinc-400 hover:text-zinc-600 focus:outline-none p-0.5"
                    >
                      <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
                      </svg>
                    </button>

                    {showTooltip && (
                      <div className="absolute bottom-6 left-0 z-50 w-64 bg-white border border-gray-200 shadow-xl rounded p-3 text-[12px] text-zinc-700 leading-snug animate-in fade-in zoom-in duration-150">
                        <p>
                          Isto é determinado usando o preço médio que os clientes pagaram pelo produto na Amazon nos últimos 30 dias. 
                        </p>
                        <button 
                          onClick={() => setShowTooltip(false)}
                          className="mt-2 text-blue-600 font-medium block w-full text-left"
                        >
                          Fechar
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {/* OBS: O texto antigo de R$/g que ficava aqui foi removido pois agora está em destaque no topo */}
            </>
          ) : (
            <p className="text-[13px] text-zinc-800 italic">Preço indisponível</p>
          )}
        </div>

        {/* Selo Prime */}
        <div className="mt-1.5 flex items-center gap-1">
          <span className="font-black italic text-[14px] leading-none">
            <span className="not-italic text-[16px] text-[#FEBD69] mr-0.5" aria-hidden="true">✓</span>
            <span className="text-[#00A8E1]">prime</span>
          </span>
        </div>

        {/* Botão de Conversão */}
        <a
          href={product.affiliateUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleTrackClick} 
          className="mt-auto bg-[#FFD814] border border-[#FCD200] rounded-full py-2.5 text-[13px] text-center font-medium shadow-sm active:scale-95 transition-transform text-[#0F1111]"
        >
          Ver na Amazon
        </a>
      </div>
    </div>
  );
}