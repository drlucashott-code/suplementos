"use client";

import Image from "next/image";
import { useState } from "react";
import { sendGAEvent } from "@next/third-parties/google";

export type DrinkProduct = {
  id: string;
  name: string;
  imageUrl: string;
  flavor: string | null;
  doseWeight: number; // Volume em ml
  price: number | null;
  affiliateUrl: string;
  proteinPerDose: number;
  numberOfDoses: number | null; // Unidades no pack
  pricePerGramProtein: number;
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
  product: DrinkProduct;
  priority: boolean;
  isBest?: boolean;
}) {
  const [showTooltip, setShowTooltip] = useState(false);

  const hasPrice = typeof product.price === "number" && product.price > 0;
  const intCents = hasPrice ? product.price!.toFixed(2).split(".") : null;
  const rating = product.rating ?? 0;
  const reviewsCount = product.reviewsCount ?? 0;

  const formattedCount =
    reviewsCount >= 1000
      ? (reviewsCount / 1000).toFixed(1).replace(".", ",") + " mil"
      : reviewsCount.toString();

  const pricePerUnit =
    hasPrice && product.numberOfDoses && product.numberOfDoses > 0
      ? (product.price! / product.numberOfDoses).toFixed(2)
      : null;

  const handleTrackClick = () => {
    const asinMatch = product.affiliateUrl.match(/\/dp\/([A-Z0-9]{10})/);
    const asin = asinMatch ? asinMatch[1] : "SEM_ASIN";
    const nomeRelatorio = `${product.name} - ${asin}`;

    sendGAEvent("event", "click_na_oferta", {
      produto_nome: nomeRelatorio,
      produto_id: product.id,
      valor: product.price || 0,
      loja: "Amazon",
      asin,
      categoria: "bebidaproteica",
    });
  };

  return (
    <div className="flex gap-3 border-b border-gray-100 bg-white relative items-stretch min-h-[290px] font-sans">
      {/* Selo OFF - CORREÇÃO DO 0 AQUI */}
      {hasPrice && (product.discountPercent ?? 0) > 0 && (
        <div className="absolute top-4 left-0 z-10 bg-[#CC0C39] text-white text-[11px] font-bold px-2 py-0.5 rounded-r-sm shadow-sm">
          {product.discountPercent}% OFF
        </div>
      )}

      {/* Imagem */}
      <div className="w-[140px] bg-[#f3f3f3] flex-shrink-0 flex items-center justify-center p-2 relative">
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

      {/* Conteúdo */}
      <div className="flex flex-col flex-1 pr-2 py-4">
        {/* Título */}
        <h2 className="text-[14px] text-[#0F1111] leading-tight line-clamp-3 mb-1 font-normal">
          {product.name}
        </h2>

        {/* Avaliações */}
        <div className="flex items-center gap-1 mb-1 text-[12px]">
          <span className="font-normal text-[#0F1111]">
            {rating.toFixed(1)}
          </span>
          <div
            className="flex text-[#e47911] text-[10px] tracking-tighter"
            aria-hidden="true"
          >
            {[...Array(5)].map((_, i) => (
              <span key={i}>{i < Math.floor(rating) ? "★" : "☆"}</span>
            ))}
          </div>
          <span className="text-[#007185]">({formattedCount})</span>
        </div>

        {/* Sabor / Unidades */}
        <div className="flex flex-wrap items-center gap-x-1.5 text-[12px] text-zinc-600 mb-1">
          {product.flavor && (
            <span>
              Sabor:{" "}
              <b className="text-[#0F1111] font-medium">{product.flavor}</b>
            </span>
          )}
          {product.numberOfDoses && (
            <>
              {product.flavor && <span>•</span>}
              <b className="text-[#0F1111] font-medium">
                {product.numberOfDoses} {product.numberOfDoses > 1 ? "unidades" : "unidade"}
              </b>
            </>
          )}
        </div>

        {/* Tabela técnica (Adaptado para Bebida) */}
        <div className="bg-white border border-zinc-200 rounded p-2 mb-2">
          <p className="text-[10px] uppercase font-bold text-zinc-500 mb-2 tracking-wide text-center border-b border-zinc-200 pb-1">
            Análise por unidade ({product.doseWeight}ml)
          </p>

          <div className="flex items-center justify-around text-center pt-1">
            <div className="flex flex-col flex-1">
              <span className="text-[13px] font-bold text-[#0F1111] leading-none">
                {product.proteinPerDose}g
              </span>
              <span className="text-[9px] text-zinc-500 mt-0.5">
                proteína
              </span>
            </div>

            <div className="w-[1px] h-6 bg-zinc-300 mx-1"></div>

            <div className="flex flex-col flex-1">
              {pricePerUnit ? (
                <span className="text-[13px] font-bold text-green-700 leading-none">
                  R$ {pricePerUnit.replace(".", ",")}
                </span>
              ) : (
                <span className="text-[13px] font-bold text-zinc-400">-</span>
              )}
              <span className="text-[9px] text-green-700 font-medium mt-0.5">
                unidade
              </span>
            </div>
          </div>
        </div>

        {/* Preço mínimo */}
        {(product.isLowestPrice || product.isLowestPrice7d) && (
          <div className="mb-2">
            <span className="bg-[#CC0C39] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-sm">
              {product.isLowestPrice
                ? "Menor preço em 30 dias"
                : "Menor preço em 7 dias"}
            </span>
          </div>
        )}

        {/* Preço */}
        <div className="flex flex-col mt-auto">
          {hasPrice ? (
            <>
              <div className="flex items-baseline gap-2 flex-wrap">
                <div className="flex items-start">
                  <span
                    className={`text-[12px] mt-1.5 font-medium ${
                      (product.discountPercent ?? 0) > 0
                        ? "text-[#CC0C39]"
                        : "text-[#0F1111]"
                    }`}
                  >
                    R$
                  </span>
                  <span
                    className={`text-3xl font-medium tracking-tight leading-none ${
                      (product.discountPercent ?? 0) > 0
                        ? "text-[#CC0C39]"
                        : "text-[#0F1111]"
                    }`}
                  >
                    {intCents![0]}
                  </span>
                  <span
                    className={`text-[12px] mt-1.5 font-medium ${
                      (product.discountPercent ?? 0) > 0
                        ? "text-[#CC0C39]"
                        : "text-[#0F1111]"
                    }`}
                  >
                    {intCents![1]}
                  </span>
                </div>

                {product.avgPrice &&
                  Math.round(product.avgPrice * 100) >
                    Math.round(product.price! * 100) && (
                    <div className="relative flex items-center gap-1">
                      <span className="text-[12px] text-zinc-500">
                        De:{" "}
                        <span className="line-through">
                          R$
                          {product.avgPrice
                            .toFixed(2)
                            .replace(".", ",")}
                        </span>
                      </span>
                      <button
                        onClick={() => setShowTooltip(!showTooltip)}
                        className="text-zinc-400 p-0.5"
                      >
                        <svg
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          className="w-3 h-3"
                        >
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
                        </svg>
                      </button>
                      {showTooltip && (
                        <div className="absolute bottom-6 left-0 z-50 w-56 bg-white border border-gray-200 shadow-xl rounded p-2 text-[10px] text-zinc-600">
                          Preço médio dos últimos 30 dias na Amazon.
                        </div>
                      )}
                    </div>
                  )}
              </div>

              <div className="text-[12px] text-[#0F1111] mt-0.5 font-medium">
                (R${" "}
                {product.pricePerGramProtein
                  .toFixed(2)
                  .replace(".", ",")}{" "}
                / g de proteína)
              </div>

              <div className="mt-1 flex items-center">
                <span className="font-black italic text-[12px] leading-none flex items-center">
                  <span
                    className="not-italic text-[13px] text-[#FEBD69] mr-0.5"
                    aria-hidden="true"
                  >
                    ✓
                  </span>
                  <span className="text-[#00A8E1]">prime</span>
                </span>
              </div>
            </>
          ) : (
            <p className="text-[13px] text-zinc-800 italic">
              Preço indisponível
            </p>
          )}
        </div>

        {/* Botão */}
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
  );
}