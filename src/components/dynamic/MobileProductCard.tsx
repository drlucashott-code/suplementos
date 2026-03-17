"use client";

import Image from "next/image";
import { useState } from "react";
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
  avgPrice?: number | null;
  discountPercent?: number | null;
  attributes: Record<string, string | number | undefined>;
};

interface DisplayConfigField {
  key: string;
  label: string;
  type: "text" | "number" | "currency";
}

function Star({
  fillPercent,
}: {
  fillPercent: number;
}) {
  return (
    <span className="relative inline-flex h-[11px] w-[11px] shrink-0">
      <span className="absolute inset-0 text-[11px] leading-[11px] text-[#D5D9D9]">
        ★
      </span>
      <span
        className="absolute inset-y-0 left-0 overflow-hidden text-[11px] leading-[11px] text-[#DE7921]"
        style={{ width: `${fillPercent}%` }}
      >
        ★
      </span>
    </span>
  );
}

function AmazonStars({ rating }: { rating: number }) {
  let roundedRating = Math.round(rating * 2) / 2;

  if (rating >= 4.75) {
    roundedRating = 5;
  }

  return (
    <div className="flex items-center gap-0" aria-hidden="true">
      {[0, 1, 2, 3, 4].map((index) => {
        const diff = roundedRating - index;
        let fillPercent = 0;

        if (diff >= 1) fillPercent = 100;
        else if (diff >= 0.5) fillPercent = 50;

        return <Star key={index} fillPercent={fillPercent} />;
      })}
    </div>
  );
}

export function MobileProductCard({
  product,
  priority,
  displayConfig,
}: {
  product: DynamicProductType;
  priority: boolean;
  displayConfig: DisplayConfigField[];
}) {
  const [showTooltip, setShowTooltip] = useState(false);

  const hasPrice = typeof product.price === "number" && product.price > 0;
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
    <div className="flex gap-3 border-b border-gray-100 bg-white relative items-stretch min-h-[250px] font-sans">
      {(product.discountPercent ?? 0) > 0 && (
        <div className="absolute top-4 left-0 z-10 rounded-r-sm bg-[#CC0C39] px-3 py-1 text-[11px] font-bold text-white shadow-sm">
          Oferta
        </div>
      )}

      <div className="w-[160px] bg-[#f3f3f3] flex-shrink-0 flex items-center justify-center p-3 relative">
        {product.imageUrl ? (
          <div className="flex h-[220px] w-full items-center justify-center">
            <Image
              src={product.imageUrl}
              alt={product.name}
              width={260}
              height={260}
              sizes="160px"
              priority={priority}
              className="h-auto w-auto max-h-[190px] max-w-[120px] object-contain mix-blend-multiply"
            />
          </div>
        ) : (
          <span className="text-[10px] text-zinc-400">Sem imagem</span>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col pr-2 py-4">
        <h2 className="mb-1 line-clamp-3 text-[14px] font-normal leading-tight text-[#0F1111]">
          {product.name}
        </h2>

        {(rating > 0 || reviewsCount > 0) && (
          <div className="mb-3 flex items-center gap-1 text-[12px]">
            <span className="font-normal text-[#0F1111]">{rating.toFixed(1)}</span>
            <AmazonStars rating={rating} />
            <span className="text-[#007185]">({formattedCount})</span>
          </div>
        )}

        <div
          className={`mb-3 grid grid-cols-2 gap-2 divide-x divide-zinc-200 rounded border border-zinc-200 bg-white p-2 ${
            rating === 0 ? "mt-2" : ""
          }`}
        >
          {displayConfig.map((config) => {
            const rawValue = product.attributes[config.key];
            let displayValue = rawValue ? String(rawValue) : "-";
            let valueClass = "text-[#0F1111]";

            if (config.type === "currency") {
              const targetConfig = displayConfig.find((c) => c.type === "number");
              const quantity = targetConfig
                ? Number(product.attributes[targetConfig.key])
                : 0;

              if (quantity > 0 && hasPrice) {
                const calculated = product.price / quantity;
                const decimals = calculated < 0.1 ? 3 : 2;
                displayValue = `R$ ${calculated.toFixed(decimals).replace(".", ",")}`;
              } else {
                const numericRaw = Number(rawValue);
                displayValue =
                  rawValue !== undefined && !Number.isNaN(numericRaw)
                    ? `R$ ${numericRaw.toFixed(2).replace(".", ",")}`
                    : "R$ 0,00";
              }

              valueClass = "text-green-700";
            }

            return (
              <div key={config.key} className="flex flex-col overflow-hidden px-1 text-center">
                <span
                  className={`mb-1 truncate text-[13px] font-bold leading-none ${valueClass}`}
                >
                  {displayValue}
                </span>
                <span
                  className={`truncate text-[9px] font-bold uppercase tracking-wide ${
                    config.type === "currency" ? "text-green-700" : "text-zinc-500"
                  }`}
                >
                  {config.label}
                </span>
              </div>
            );
          })}
        </div>

        <div className="mt-auto flex flex-col">
          {hasPrice && intCents ? (
            <>
              {(product.discountPercent ?? 0) > 0 ? (
                <>
                  <div className="flex items-baseline gap-2">
                    <span className="text-[16px] font-normal text-[#CC0C39]">
                      -{product.discountPercent}%
                    </span>

                    <div className="flex items-start text-[#0F1111]">
                      <span className="mt-1 text-[13px] font-medium">R$</span>
                      <span className="text-3xl font-medium leading-none tracking-tight">
                        {intCents[0]}
                      </span>
                      <span className="mt-[3px] text-[14px] font-medium leading-none">
                        {intCents[1]}
                      </span>
                    </div>
                  </div>

                  {typeof product.avgPrice === "number" &&
                    Math.round(product.avgPrice * 100) > Math.round(product.price * 100) && (
                      <div className="relative mt-1 flex items-center gap-1">
                        <span className="text-[12px] text-zinc-500">
                          De:{" "}
                          <span className="line-through">
                            R$ {product.avgPrice.toFixed(2).replace(".", ",")}
                          </span>
                        </span>

                        <button
                          type="button"
                          onClick={() => setShowTooltip((prev) => !prev)}
                          className="p-0.5 text-zinc-400"
                          aria-label="Informações sobre o preço médio"
                        >
                          <svg
                            viewBox="0 0 24 24"
                            fill="currentColor"
                            className="h-3 w-3"
                          >
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
                          </svg>
                        </button>

                        {showTooltip && (
                          <div className="absolute bottom-6 left-0 z-50 w-56 rounded border border-gray-200 bg-white p-2 text-[10px] text-zinc-600 shadow-xl">
                            Preço médio dos últimos 30 dias na Amazon.
                          </div>
                        )}
                      </div>
                    )}
                </>
              ) : (
                <div className="flex items-baseline gap-2">
                  <div className="flex items-start text-[#0F1111]">
                    <span className="mt-1 text-[13px] font-medium">R$</span>
                    <span className="text-3xl font-medium leading-none tracking-tight">
                      {intCents[0]}
                    </span>
                    <span className="mt-[3px] text-[14px] font-medium leading-none">
                      {intCents[1]}
                    </span>
                  </div>
                </div>
              )}

              <div className="mt-1 flex items-center">
                <span className="flex items-center text-[12px] font-black italic leading-none">
                  <span
                    className="mr-0.5 text-[13px] not-italic text-[#FEBD69]"
                    aria-hidden="true"
                  >
                    ✓
                  </span>
                  <span className="text-[#00A8E1]">prime</span>
                </span>
              </div>
            </>
          ) : (
            <p className="text-[13px] italic text-zinc-800">Preço indisponível</p>
          )}

          <div className="mt-3">
            <a
              href={product.affiliateUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleTrackClick}
              className="block w-full rounded-full border border-[#FCD200] bg-[#FFD814] py-2.5 text-center text-[13px] font-medium text-[#0F1111] shadow-sm transition-transform active:scale-95"
            >
              Ver na Amazon
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
