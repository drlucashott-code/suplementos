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
  prefix?: string;
  suffix?: string;
  hideLabel?: boolean;
  tableHeaderTemplate?: string;
}

function getNumericAttribute(
  attributes: Record<string, string | number | undefined>,
  key: string
) {
  const value = Number(attributes[key]);
  return Number.isNaN(value) ? 0 : value;
}

function getDerivedMetricValue(
  key: string,
  attributes: Record<string, string | number | undefined>,
  totalPrice: number
) {
  const explicitValue = getNumericAttribute(attributes, key);
  if (explicitValue > 0) {
    return explicitValue;
  }

  if (totalPrice <= 0) {
    return 0;
  }

  const unitsPerBox = getNumericAttribute(attributes, "unitsPerBox");
  const unitsPerPack = getNumericAttribute(attributes, "unitsPerPack");
  const numberOfDoses =
    getNumericAttribute(attributes, "numberOfDoses") ||
    getNumericAttribute(attributes, "doses");
  const totalProteinInGrams = getNumericAttribute(attributes, "totalProteinInGrams");
  const cafeinaTotalMg = getNumericAttribute(attributes, "cafeinaTotalMg");
  const gramasCreatinaPuraNoPote = getNumericAttribute(
    attributes,
    "gramasCreatinaPuraNoPote"
  );

  switch (key) {
    case "precoPorBarra":
      return unitsPerBox > 0 ? totalPrice / unitsPerBox : 0;
    case "precoPorUnidade":
      return unitsPerPack > 0 ? totalPrice / unitsPerPack : 0;
    case "precoPorDose":
      return numberOfDoses > 0 ? totalPrice / numberOfDoses : 0;
    case "precoPorGramaProteina":
      return totalProteinInGrams > 0 ? totalPrice / totalProteinInGrams : 0;
    case "precoPor100MgCafeina":
      return cafeinaTotalMg > 0 ? (totalPrice / cafeinaTotalMg) * 100 : 0;
    case "precoPorGramaCreatina":
      return gramasCreatinaPuraNoPote > 0 ? totalPrice / gramasCreatinaPuraNoPote : 0;
    default:
      return 0;
  }
}

function getFallbackCurrencyValue(
  key: string,
  attributes: Record<string, string | number | undefined>,
  totalPrice: number,
  displayConfig: DisplayConfigField[]
) {
  const derivedValue = getDerivedMetricValue(key, attributes, totalPrice);
  if (derivedValue > 0) {
    return derivedValue;
  }

  const quantityConfig = displayConfig.find((config) => config.type === "number");
  if (!quantityConfig || totalPrice <= 0) {
    return 0;
  }

  const quantity = getNumericAttribute(attributes, quantityConfig.key);
  return quantity > 0 ? totalPrice / quantity : 0;
}

function formatCurrencyValue(value: number) {
  const decimals = value > 0 && value < 0.1 ? 3 : 2;
  return `R$ ${value.toFixed(decimals).replace(".", ",")}`;
}

function formatRoundedNumber(value: number) {
  return Math.round(value).toString();
}

function formatDisplayValue(
  rawValue: string | number | undefined,
  config: DisplayConfigField
) {
  if (rawValue === undefined || rawValue === null || String(rawValue).trim() === "") {
    return "";
  }

  if (config.type === "number") {
    const numericValue = Number(rawValue);
    if (!Number.isNaN(numericValue)) {
      return `${config.prefix ?? ""}${formatRoundedNumber(numericValue)}${config.suffix ?? ""}`;
    }
  }

  return `${config.prefix ?? ""}${String(rawValue)}${config.suffix ?? ""}`;
}

function resolveTemplate(
  template: string,
  attributes: Record<string, string | number | undefined>
) {
  return template.replace(/\{([^}]+)\}/g, (_, key: string) => {
    const value = attributes[key];
    return value === undefined || value === null ? "" : String(value);
  });
}

function Star({ fillPercent }: { fillPercent: number }) {
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
  highlightConfig = [],
  analysisTitleTemplate,
}: {
  product: DynamicProductType;
  priority: boolean;
  displayConfig: DisplayConfigField[];
  highlightConfig?: DisplayConfigField[];
  analysisTitleTemplate?: string;
}) {
  const [showTooltip, setShowTooltip] = useState(false);

  const hasPrice = typeof product.price === "number" && product.price > 0;
  const intCents = hasPrice ? product.price.toFixed(2).split(".") : null;

  const rating = Number(product.ratingAverage) || 0;
  const reviewsCount = Number(product.ratingCount) || 0;

  const formattedCount =
    reviewsCount >= 1000
      ? `${(reviewsCount / 1000).toFixed(1).replace(".", ",")} mil`
      : reviewsCount.toString();

  const visibleHighlights = highlightConfig
    .map((config) => {
      const rawValue = product.attributes[config.key];
      const value = formatDisplayValue(rawValue, config);

      if (!value) {
        return null;
      }

      return {
        key: config.key,
        label: config.label,
        value,
        hideLabel: config.hideLabel ?? false,
      };
    })
    .filter(
      (
        item
      ): item is {
        key: string;
        label: string;
        value: string;
        hideLabel: boolean;
      } => item !== null
    );

  const tableHeaderTemplate =
    analysisTitleTemplate ||
    displayConfig.find((config) => config.tableHeaderTemplate)?.tableHeaderTemplate;

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
    <div className="relative flex min-h-[250px] items-stretch gap-3 border-b border-gray-100 bg-white font-sans">
      {(product.discountPercent ?? 0) > 0 && (
        <div className="absolute left-0 top-4 z-10 rounded-r-sm bg-[#CC0C39] px-2 py-0.5 text-[11px] font-bold text-white shadow-sm">
          {product.discountPercent}% OFF
        </div>
      )}

      <div className="relative flex w-[160px] flex-shrink-0 items-center justify-center bg-[#f3f3f3] p-3">
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

      <div className="flex min-w-0 flex-1 flex-col py-4 pr-2">
        <h2 className="mb-1 line-clamp-3 text-[14px] font-normal leading-tight text-[#0F1111]">
          {product.name}
        </h2>

        {(rating > 0 || reviewsCount > 0) && (
          <div className="mb-2 flex items-center gap-1 text-[12px]">
            <span className="font-normal text-[#0F1111]">{rating.toFixed(1)}</span>
            <AmazonStars rating={rating} />
            <span className="text-[#007185]">({formattedCount})</span>
          </div>
        )}

        {visibleHighlights.length > 0 && (
          <div className="mb-2 flex flex-wrap items-center gap-x-1.5 text-[12px] text-zinc-600">
            {visibleHighlights.map((item, index) => (
              <span key={item.key}>
                {index > 0 && <span className="mr-1">•</span>}
                {item.hideLabel ? (
                  <b className="font-medium text-[#0F1111]">{item.value}</b>
                ) : (
                  <>
                    {item.label}:{" "}
                    <b className="font-medium text-[#0F1111]">{item.value}</b>
                  </>
                )}
              </span>
            ))}
          </div>
        )}

        <div
          className={`mb-3 grid gap-2 divide-x divide-zinc-200 rounded border border-zinc-200 bg-white p-2 ${
            rating === 0 && visibleHighlights.length === 0 ? "mt-2" : ""
          }`}
          style={{
            gridTemplateColumns: `repeat(${Math.max(displayConfig.length, 1)}, minmax(0, 1fr))`,
          }}
        >
          {tableHeaderTemplate && (
            <div
              className="border-b border-zinc-200 pb-2 text-center text-[11px] font-bold uppercase tracking-wide text-zinc-500"
              style={{ gridColumn: "1 / -1" }}
            >
              {resolveTemplate(tableHeaderTemplate, product.attributes)}
            </div>
          )}

          {displayConfig.map((config) => {
            const rawValue = product.attributes[config.key];
            let displayValue = rawValue ? String(rawValue) : "-";
            let valueClass = "text-[#0F1111]";

            if (config.type === "currency") {
              const numericRaw = getFallbackCurrencyValue(
                config.key,
                product.attributes,
                product.price,
                displayConfig
              );

              if (!Number.isNaN(numericRaw) && numericRaw > 0) {
                displayValue = formatCurrencyValue(numericRaw);
              } else {
                displayValue = "R$ 0,00";
              }

              valueClass = "text-green-700";
            } else {
              displayValue = formatDisplayValue(rawValue, config) || "-";
            }

            return (
              <div
                key={config.key}
                className="flex flex-col overflow-hidden px-1 text-center"
              >
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
              <div className="flex items-baseline gap-2">
                <div className="flex items-start">
                  <span
                    className={`mt-1 text-[13px] font-medium ${
                      (product.discountPercent ?? 0) > 0
                        ? "text-[#CC0C39]"
                        : "text-[#0F1111]"
                    }`}
                  >
                    R$
                  </span>
                  <span
                    className={`text-3xl font-medium leading-none tracking-tight ${
                      (product.discountPercent ?? 0) > 0
                        ? "text-[#CC0C39]"
                        : "text-[#0F1111]"
                    }`}
                  >
                    {intCents[0]}
                  </span>
                  <span
                    className={`mt-[3px] text-[14px] font-medium leading-none ${
                      (product.discountPercent ?? 0) > 0
                        ? "text-[#CC0C39]"
                        : "text-[#0F1111]"
                    }`}
                  >
                    {intCents[1]}
                  </span>
                </div>
              </div>

              {typeof product.avgPrice === "number" &&
                Math.round(product.avgPrice * 100) >
                  Math.round(product.price * 100) && (
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
                      aria-label="Informacoes sobre o preco medio"
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
                        Preco medio dos ultimos 30 dias na Amazon.
                      </div>
                    )}
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
            <p className="text-[13px] italic text-zinc-800">Preco indisponivel</p>
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
