"use client";

import Image from "next/image";
import { CreatineForm } from "@prisma/client";
import { useState } from "react";

export type Product = {
  id: string;
  name: string;
  imageUrl: string;
  flavor: string | null;
  form: CreatineForm;
  price: number | null;
  affiliateUrl: string;
  doses: number | null;
  pricePerGram: number;
  discountPercent?: number | null;
  avgPrice?: number | null; 
  isLowestPrice?: boolean;   // Menor preço em 30 dias
  isLowestPrice7d?: boolean; // Menor preço em 7 dias
  rating?: number;
  reviewsCount?: number;
  hasCarbs?: boolean;
};

export function MobileProductCard({
  product,
  priority,
}: {
  product: Product;
  isBest?: boolean;
  priority: boolean;
}) {
  const [showTooltip, setShowTooltip] = useState(false);

  const hasPrice = typeof product.price === "number" && product.price > 0;
  const intCents = hasPrice ? product.price!.toFixed(2).split(".") : null;
  const rating = typeof product.rating === "number" ? product.rating : 0;
  const reviewsCount = typeof product.reviewsCount === "number" ? product.reviewsCount : 0;

  const formattedCount = reviewsCount >= 1000
    ? (reviewsCount / 1000).toFixed(1).replace(".", ",") + " mil"
    : reviewsCount.toString();

  const shouldShowCarbTag = product.hasCarbs || product.form === "GUMMY";

  return (
    <div className="flex gap-3 border-b border-gray-100 bg-white relative items-stretch min-h-[260px]">
      
      {/* Selo de % OFF (Estilo Amazon) */}
      {hasPrice && product.discountPercent && (
        <div className="absolute top-4 left-0 z-10 bg-[#CC0C39] text-white text-[11px] font-bold px-2 py-0.5 rounded-r-sm shadow-sm">
          {product.discountPercent}% OFF
        </div>
      )}

      {/* Coluna da Imagem */}
      <div className="w-[140px] bg-[#f3f3f3] flex-shrink-0 overflow-hidden relative flex items-center justify-center p-2">
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

        {/* Info secundária: Sabor e Doses */}
        <div className="flex flex-wrap items-center gap-x-1.5 text-[12px] text-zinc-600 mb-1">
          {product.flavor && (
            <span>Sabor: <b className="text-[#0F1111] font-medium">{product.flavor}</b></span>
          )}
          {product.doses && (
            <>
              {product.flavor && <span aria-hidden="true">•</span>}
              <b className="text-[#0F1111] font-medium">{Math.floor(product.doses)} doses</b>
            </>
          )}
        </div>

        {/* Tag de Carboidrato */}
        {shouldShowCarbTag && (
          <div className="mb-1">
            <span className="text-[10px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded border border-amber-200 font-medium">
              Contém carboidratos
            </span>
          </div>
        )}

        {/* Selos de Menor Preço (Regra de Prioridade: 30d > 7d) */}
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
                {/* Preço Principal */}
                <div className="flex items-start">
                  <span className={`text-[12px] mt-1.5 font-medium ${product.discountPercent ? "text-[#CC0C39]" : "text-[#0F1111]"}`}>
                    R$
                  </span>
                  <span className={`text-3xl font-medium tracking-tight leading-none ${product.discountPercent ? "text-[#CC0C39]" : "text-[#0F1111]"}`}>
                    {intCents![0]}
                  </span>
                  <span className={`text-[12px] mt-1.5 font-medium ${product.discountPercent ? "text-[#CC0C39]" : "text-[#0F1111]"}`}>
                    {intCents![1]}
                  </span>
                </div>

                {/* Linha "De:" - Agora à direita com tamanho 12px */}
                {product.avgPrice && product.price! < product.avgPrice && (
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

                    {/* Tooltip explicativo */}
                    {showTooltip && (
                      <div className="absolute bottom-6 left-0 z-50 w-64 bg-white border border-gray-200 shadow-xl rounded p-3 text-[12px] text-zinc-700 leading-snug animate-in fade-in zoom-in duration-150">
                        <p>
                          Isto é determinado usando o preço médio que os clientes pagaram pelo produto na Amazon nos últimos 30 dias. 
                          São excluídos os preços pagos pelos clientes pelo produto quando ele estiver em promoção por tempo limitado.
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

              {/* Preço por grama de creatina (12px, entre parênteses) */}
              <div className="text-[12px] text-[#0F1111] mt-0.5 font-medium">
                (R$ {product.pricePerGram.toFixed(2).replace(".", ",")} / g de creatina)
              </div>
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
          className="mt-auto bg-[#FFD814] border border-[#FCD200] rounded-full py-2.5 text-[13px] text-center font-medium shadow-sm active:scale-95 transition-transform text-[#0F1111]"
        >
          Ver na Amazon
        </a>
      </div>
    </div>
  );
}