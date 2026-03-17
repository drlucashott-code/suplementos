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
  avgPrice?: number | null;
  discountPercent?: number | null;
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
  displayConfig,
}: {
  product: DynamicProductType;
  priority: boolean;
  displayConfig: DisplayConfigField[];
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
    <article className="border-b border-[#E7E7E7] bg-white px-2 py-3">
      <div className="overflow-hidden rounded-md border border-[#E7E7E7] bg-white">
        <div className="grid min-h-[250px] grid-cols-[42%_58%]">
          <div className="relative flex items-center justify-center bg-[#f3f3f3] p-3">
            {product.imageUrl ? (
              <Image
                src={product.imageUrl}
                alt={product.name}
                width={260}
                height={260}
                sizes="40vw"
                priority={priority}
                className="h-auto max-h-[220px] w-full object-contain mix-blend-multiply"
              />
            ) : (
              <span className="text-[11px] text-zinc-400">Sem imagem</span>
            )}
          </div>

          <div className="flex min-w-0 flex-col p-3">
            <h2 className="mb-1 line-clamp-3 text-[14px] leading-tight text-[#0F1111]">
              {product.name}
            </h2>

            {(rating > 0 || reviewsCount > 0) && (
              <div className="mb-3 flex items-center gap-1 text-[12px] leading-none">
                <span className="text-[#0F1111]">{rating.toFixed(1)}</span>
                <div
                  className="flex text-[10px] tracking-[-0.08em] text-[#e47911]"
                  aria-hidden="true"
                >
                  {[...Array(5)].map((_, i) => (
                    <span key={i}>{i < Math.floor(rating) ? "★" : "☆"}</span>
                  ))}
                </div>
                <span className="text-[#007185]">({formattedCount})</span>
              </div>
            )}

            <div
              className={`mb-3 grid grid-cols-2 overflow-hidden rounded-md border border-zinc-200 bg-white ${
                rating === 0 ? "mt-2" : ""
              }`}
            >
              {displayConfig.map((config, index) => {
                const rawValue = product.attributes[config.key];
                let displayValue = rawValue ? String(rawValue) : "-";

                if (config.type === "currency") {
                  const targetConfig = displayConfig.find((c) => c.type === "number");
                  const quantity = targetConfig
                    ? Number(product.attributes[targetConfig.key])
                    : 0;

                  if (quantity > 0) {
                    const calculated = product.price / quantity;
                    const decimals = calculated < 0.1 ? 3 : 2;
                    displayValue = `R$ ${calculated.toFixed(decimals).replace(".", ",")}`;
                  } else {
                    displayValue = rawValue
                      ? `R$ ${Number(rawValue).toFixed(2).replace(".", ",")}`
                      : "R$ 0,00";
                  }
                }

                return (
                  <div
                    key={config.key}
                    className={`flex flex-col overflow-hidden px-1 py-2 text-center ${
                      index % 2 === 0 ? "border-r border-zinc-200" : ""
                    } ${index < displayConfig.length - 2 ? "border-b border-zinc-200" : ""}`}
                  >
                    <span className="mb-1 truncate text-[13px] font-bold leading-none text-[#0F1111]">
                      {displayValue}
                    </span>
                    <span className="truncate text-[9px] font-bold uppercase tracking-wide text-zinc-500">
                      {config.label}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="mt-auto flex flex-col">
              {hasPrice ? (
                <>
                  {product.discountPercent && product.discountPercent >= 5 && (
                    <div className="mb-0.5 flex items-center gap-2">
                      <span className="rounded bg-[#CC0C39] px-1.5 py-0.5 text-[10px] font-black uppercase tracking-tight text-white">
                        {product.discountPercent}% OFF
                      </span>
                      {product.avgPrice && (
                        <span className="text-[11px] font-medium text-zinc-500 line-through">
                          R$ {product.avgPrice.toFixed(2).replace(".", ",")}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="flex items-baseline gap-2">
                    <div className="flex items-start text-[#0F1111] leading-none">
                      <span className="mt-1 text-[12px] font-medium">R$</span>
                      <span className="text-[31px] font-medium tracking-[-0.03em]">
                        {intCents![0]}
                      </span>
                      <span className="mt-1 text-[12px] font-medium">{intCents![1]}</span>
                    </div>
                  </div>

                  <div className="mt-1 flex items-center">
                    <span className="flex items-center text-[12px] font-black italic leading-none text-[#00A8E1]">
                      <span
                        className="mr-0.5 text-[13px] not-italic text-[#FEBD69]"
                        aria-hidden="true"
                      >
                        ✓
                      </span>
                      prime
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
      </div>
    </article>
  );
}
