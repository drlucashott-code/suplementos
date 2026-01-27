"use client";

import Image from "next/image";

export type WheyProduct = {
  id: string;
  name: string;
  imageUrl: string;
  flavor: string | null;
  
  price: number | null;
  affiliateUrl: string;

  proteinPerDose: number;
  proteinPercentage: number;
  numberOfDoses: number | null;
  pricePerGramProtein: number;
  
  discountPercent?: number | null;
  avg30Price?: number | null;

  rating?: number;
  reviewsCount?: number;
};

export function MobileProductCard({
  product,
  isBest,
  priority,
}: {
  product: WheyProduct;
  isBest?: boolean;
  priority: boolean;
}) {
  const hasPrice =
    typeof product.price === "number" &&
    product.price > 0;

  const intCents = hasPrice
    ? product.price!.toFixed(2).split(".")
    : null;

  const rating = product.rating ?? 0;
  const reviewsCount = product.reviewsCount ?? 0;
  
  const proteinPct = typeof product.proteinPercentage === "number" 
    ? product.proteinPercentage.toFixed(0) 
    : "0";

  const formattedCount =
    reviewsCount >= 1000
      ? (reviewsCount / 1000)
          .toFixed(1)
          .replace(".", ",") + " mil"
      : reviewsCount.toString();

  return (
    <div className="flex gap-3 border-b border-gray-100 bg-white relative items-stretch min-h-[240px]">
      
      {/* Selo de Desconto (Estilo Amazon - Vermelho de Alta Conversão) */}
      {hasPrice && product.discountPercent && (
        <div className="absolute top-4 left-0 z-10 bg-[#CC0C39] text-white text-[11px] font-bold px-2 py-0.5 rounded-r-sm shadow-sm">
          {product.discountPercent}% OFF
        </div>
      )}

      {/* Coluna da Imagem: Coluna fixa para evitar que o texto empurre a imagem */}
      <div className="w-[140px] bg-[#f3f3f3] flex-shrink-0 flex items-center justify-center overflow-hidden">
        <Image
          src={product.imageUrl}
          alt={product.name}
          width={230}
          height={230}
          // 🚀 PERFORMANCE: sizes="140px" impede o download de imagens pesadas no mobile.
          sizes="140px"
          priority={priority} 
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : "low"}
          className="w-full h-full max-h-[220px] object-contain mix-blend-multiply p-1"
        />
      </div>

      {/* Coluna de Informações */}
      <div className="flex flex-col flex-1 pr-2 py-4">
        <h2 className="text-[14px] text-[#0F1111] leading-tight line-clamp-3 mb-1 font-normal">
          {product.name}
        </h2>

        {/* Avaliações e Social Proof (Acessibilidade: aria-hidden nas estrelas) */}
        <div className="flex items-center gap-1 mb-1 text-[12px]">
          <span className="font-normal text-[#0F1111]">
            {rating.toFixed(1)}
          </span>

          <div className="flex text-[#e47911] text-[10px] tracking-tighter" aria-hidden="true">
            {[...Array(5)].map((_, i) => (
              <span key={i}>
                {i < Math.floor(rating) ? "★" : "☆"}
              </span>
            ))}
          </div>

          <span className="text-[#007185]">
            ({formattedCount})
          </span>
        </div>

        {/* Informações de Sabor e Doses (Acessibilidade: text-zinc-800) */}
        <div className="flex flex-wrap gap-x-2 text-[12px] text-zinc-800 mb-1">
          {product.flavor && (
            <span>
              Sabor:{" "}
              <b className="text-[#0F1111] font-medium">
                {product.flavor}
              </b>
            </span>
          )}

          {product.numberOfDoses && (
            <>
              {product.flavor && <span aria-hidden="true">•</span>}
              <b className="text-[#0F1111] font-medium">
                {Math.floor(product.numberOfDoses)} doses
              </b>
            </>
          )}
        </div>

        {/* Selos de Concentração e Dose (Identidade Visual do Whey) */}
        <div className="flex flex-wrap gap-1.5 mb-2">
          <span className="text-[10px] bg-blue-50 text-blue-800 px-1.5 py-0.5 rounded border border-blue-200 font-bold uppercase tracking-tight">
            {proteinPct}% PROTEÍNA
          </span>
          <span className="text-[10px] bg-zinc-50 text-zinc-600 px-1.5 py-0.5 rounded border border-zinc-200 font-medium italic">
            {product.proteinPerDose}g proteína / dose
          </span>
        </div>

        {/* Bloco de Preço: Estilo Amazon */}
        <div className="flex flex-col mt-1">
          {hasPrice ? (
            <>
              <div className="flex items-start">
                <span
                  className={`text-[11px] mt-1 font-medium ${
                    product.discountPercent ? "text-[#CC0C39]" : "text-[#0F1111]"
                  }`}
                >
                  R$
                </span>

                <span
                  className={`text-3xl font-medium tracking-tighter leading-none ${
                    product.discountPercent ? "text-[#CC0C39]" : "text-[#0F1111]"
                  }`}
                >
                  {intCents![0]}
                </span>

                <span
                  className={`text-[11px] mt-1 font-medium ${
                    product.discountPercent ? "text-[#CC0C39]" : "text-[#0F1111]"
                  }`}
                >
                  {intCents![1]}
                </span>
              </div>

              {/* Custo Real: Acessibilidade Zinc-950 para contraste máximo */}
              <p className="text-[12px] text-zinc-950 font-medium">
                (R$ {product.pricePerGramProtein.toFixed(2)} / g de proteína)
              </p>

              {product.avg30Price && product.discountPercent && (
                <p className="text-[11px] text-zinc-800 mt-0.5">
                  Média últimos 30 dias:{" "}
                  <span className="line-through">
                    R$ {product.avg30Price.toFixed(2)}
                  </span>
                </p>
              )}
            </>
          ) : (
            <p className="text-[13px] text-zinc-800 italic">
              Preço indisponível no momento
            </p>
          )}
        </div>

        {/* Selo Prime (SVG ou Caractere com cor Amazon) */}
        <div className="mt-1 flex items-center gap-1">
          <span className="font-black italic text-[14px] leading-none" aria-hidden="true">
            <span className="not-italic text-[16px] text-[#FEBD69] mr-0.5">✓</span>
            <span className="text-[#00A8E1]">prime</span>
          </span>
        </div>

        {/* Botão de Conversão */}
        <a
          href={product.affiliateUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-auto bg-[#FFD814] border border-[#FCD200] rounded-full py-2 text-[13px] text-center font-medium shadow-sm hover:bg-[#F7CA00] active:scale-95 transition-transform text-[#0F1111]"
        >
          Ver na Amazon
        </a>
      </div>
    </div>
  );
}