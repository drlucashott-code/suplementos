"use client";

import Image from "next/image";
import { AlertTriangle, Bookmark, X } from "lucide-react";
import { useEffect, useState } from "react";
import { trackProductClick } from "@/lib/client/productClickTracking";
import type { SaveableDeal } from "@/lib/client/savedDeals";
import { SAVED_DEALS_EVENT, isDealSaved, toggleSavedDeal } from "@/lib/client/savedDeals";
import { PriceHistoryButton } from "@/components/dynamic/PriceHistoryButton";
import type { PriceHistoryChartRange } from "@/lib/dynamicPriceHistory";
import type { PriceDecision } from "@/lib/priceDecision";
import { getOptimizedAmazonUrl } from "@/lib/utils";

export type DynamicProductType = {
  id: string;
  name: string;
  imageUrl: string;
  price: number;
  affiliateUrl: string;
  pricePerUnit: number;
  ratingAverage?: number | null;
  ratingCount?: number | null;
  likeCount?: number;
  dislikeCount?: number;
  avgPrice?: number | null;
  lowestPrice30d?: number | null;
  highestPrice30d?: number | null;
  lowestPrice365d?: number | null;
  discountPercent?: number | null;
  priceDecision?: PriceDecision | null;
  historyAvailableRanges?: PriceHistoryChartRange[];
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

const REPORT_REASONS = [
  "Preço desatualizado",
  "Produto indisponível",
  "Informação incorreta",
  "Outro",
] as const;

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
  if (explicitValue > 0) return explicitValue;
  if (totalPrice <= 0) return 0;

  const unitsPerBox = getNumericAttribute(attributes, "unitsPerBox");
  const unitsPerPack = getNumericAttribute(attributes, "unitsPerPack");
  const units =
    getNumericAttribute(attributes, "units") ||
    getNumericAttribute(attributes, "unidades") ||
    getNumericAttribute(attributes, "quantidade");
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
      return unitsPerPack > 0
        ? totalPrice / unitsPerPack
        : units > 0
          ? totalPrice / units
          : 0;
    case "precoPorDose":
      return numberOfDoses > 0 ? totalPrice / numberOfDoses : 0;
    case "precoPorMl":
      return getNumericAttribute(attributes, "volumeMl") > 0
        ? totalPrice / getNumericAttribute(attributes, "volumeMl")
        : 0;
    case "precoPorGrama":
      return getNumericAttribute(attributes, "weightGrams") > 0
        ? totalPrice / getNumericAttribute(attributes, "weightGrams")
        : 0;
    case "precoPorMetro":
      return getNumericAttribute(attributes, "meters") > 0
        ? totalPrice / getNumericAttribute(attributes, "meters")
        : 0;
    case "precoPorLavagem":
      return getNumericAttribute(attributes, "washes") > 0
        ? totalPrice / getNumericAttribute(attributes, "washes")
        : 0;
    case "precoPorCapsula":
      return getNumericAttribute(attributes, "capsules") > 0
        ? totalPrice / getNumericAttribute(attributes, "capsules")
        : 0;
    case "precoPorGramaProteina":
      return totalProteinInGrams > 0 ? totalPrice / totalProteinInGrams : 0;
    case "precoPor100MgCafeina":
      return cafeinaTotalMg > 0 ? (totalPrice / cafeinaTotalMg) * 100 : 0;
    case "precoPorGramaCreatina": {
      const creatinaPorDose = getNumericAttribute(attributes, "creatinaPorDose");
      const explicitPricePerDose = getNumericAttribute(attributes, "precoPorDose");
      const derivedPricePerDose =
        explicitPricePerDose > 0
          ? explicitPricePerDose
          : numberOfDoses > 0
            ? totalPrice / numberOfDoses
            : 0;

      return creatinaPorDose > 0 && derivedPricePerDose > 0
        ? derivedPricePerDose / creatinaPorDose
        : 0;
    }
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
  if (derivedValue > 0) return derivedValue;

  const quantityConfig = displayConfig.find((config) => config.type === "number");
  if (!quantityConfig || totalPrice <= 0) return 0;

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

function formatPetTypeValue(value: string) {
  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, "");

  if (normalized === "cachorro" || normalized === "cao") return "Cão";
  if (normalized === "gato") return "Gato";
  if (
    normalized === "cachorro/gato" ||
    normalized === "cachorroegato" ||
    normalized === "cachorro,gato" ||
    normalized === "cao/gato" ||
    normalized === "caoegato"
  ) {
    return "Cão/gato";
  }

  return value;
}

function formatDisplayValue(
  rawValue: string | number | undefined,
  config: DisplayConfigField
) {
  if (rawValue === undefined || rawValue === null || String(rawValue).trim() === "") {
    return "";
  }

  if (config.key === "tipo_pet") {
    return formatPetTypeValue(String(rawValue));
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

function getPriceDecisionStyles(decision: PriceDecision["level"]) {
  switch (decision) {
    case "excellent":
      return {
        badge:
          "border-[#CC0C39] bg-[#CC0C39] text-white shadow-none",
        badgeDot: "bg-[#16A34A]",
        insight: "text-[#CC0C39]",
        insightBox: "border-[#F5C8D4] bg-[#FFF5F8]",
      };
    case "good":
      return {
        badge: "border-[#BFDBFE] bg-[#EFF6FF] text-[#1D4ED8]",
        badgeDot: "bg-[#2563EB]",
        insight: "text-[#1D4ED8]",
        insightBox: "border-[#DBEAFE] bg-[#F8FBFF]",
      };
    case "expensive":
      return {
        badge: "border-[#FECDD3] bg-[#FFF1F2] text-[#BE123C]",
        badgeDot: "bg-[#E11D48]",
        insight: "text-[#BE123C]",
        insightBox: "border-[#FFE4E6] bg-[#FFF7F8]",
      };
    default:
      return {
        badge: "border-[#E4E4E7] bg-[#F4F4F5] text-[#52525B]",
        badgeDot: "bg-[#71717A]",
        insight: "text-[#52525B]",
        insightBox: "border-[#E4E4E7] bg-[#FAFAFA]",
      };
  }
}

function Star({ fillPercent }: { fillPercent: number }) {
  return (
    <span className="relative inline-flex h-[11px] w-[11px] shrink-0">
      <span className="absolute inset-0 text-[11px] leading-[11px] text-[#D5D9D9]">★</span>
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
  if (rating >= 4.75) roundedRating = 5;

  return (
    <div className="flex items-center gap-0" aria-hidden="true">
      {[0, 1, 2, 3, 4].map((index) => {
        const diff = roundedRating - index;
        const fillPercent = diff >= 1 ? 100 : diff >= 0.5 ? 50 : 0;
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
  const [saved, setSaved] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState<(typeof REPORT_REASONS)[number]>(
    "Preço desatualizado"
  );
  const [reportDetails, setReportDetails] = useState("");
  const [reportState, setReportState] = useState<"idle" | "submitting" | "success" | "error">(
    "idle"
  );

  const hasPrice = typeof product.price === "number" && product.price > 0;
  const intCents = hasPrice ? product.price.toFixed(2).split(".") : null;
  const asinMatch = product.affiliateUrl.match(/\/dp\/([A-Z0-9]{10})/);
  const asin = asinMatch ? asinMatch[1] : "";

  const rating = Number(product.ratingAverage) || 0;
  const reviewsCount = Number(product.ratingCount) || 0;
  const formattedCount =
    reviewsCount >= 1000
      ? `${(reviewsCount / 1000).toFixed(1).replace(".", ",")} mil`
      : reviewsCount.toString();
  const priceDecision = product.priceDecision ?? null;
  const priceDecisionStyles = priceDecision
    ? getPriceDecisionStyles(priceDecision.level)
    : null;
  const shouldShowDecisionMessage =
    priceDecision && priceDecision.message !== priceDecision.label;
  const canShowPriceHistory =
    Array.isArray(product.historyAvailableRanges) &&
    product.historyAvailableRanges.length > 0;
  const showReferencePrice =
    canShowPriceHistory &&
    typeof product.avgPrice === "number" &&
    Math.round(product.avgPrice * 100) > Math.round(product.price * 100);

  useEffect(() => {
    if (!asin) return;
    setSaved(isDealSaved(asin));
  }, [asin]);

  useEffect(() => {
    if (!asin) return;

    const syncSaved = () => setSaved(isDealSaved(asin));

    window.addEventListener("storage", syncSaved);
    window.addEventListener(SAVED_DEALS_EVENT, syncSaved);

    return () => {
      window.removeEventListener("storage", syncSaved);
      window.removeEventListener(SAVED_DEALS_EVENT, syncSaved);
    };
  }, [asin]);

  const visibleHighlights = highlightConfig
    .map((config) => {
      const rawValue = product.attributes[config.key];
      const value = formatDisplayValue(rawValue, config);

      if (!value) return null;

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
    if (!asin) return;

    trackProductClick({
      asin,
      productId: product.id,
      productName: product.name,
      value: product.price || 0,
      category: "dinamica",
    });
  };

  function buildSaveableDeal(): SaveableDeal | null {
    if (!asin) return null;

    return {
      id: product.id,
      asin,
      name: product.name,
      imageUrl: product.imageUrl,
      url: product.affiliateUrl,
      totalPrice: product.price,
      averagePrice30d: product.avgPrice ?? product.price,
      discountPercent: product.discountPercent ?? 0,
      ratingAverage: product.ratingAverage ?? null,
      ratingCount: product.ratingCount ?? null,
      likeCount: 0,
      dislikeCount: 0,
      categoryName: "Categoria",
      categoryGroup: "dinamica",
      categorySlug: "",
    };
  }

  async function handleSubmitReport() {
    if (!asin || reportState === "submitting") return;

    try {
      setReportState("submitting");

      const response = await fetch("/api/product-issue-reports", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          asin,
          reason: reportReason,
          details: reportDetails,
          pagePath: window.location.pathname,
        }),
      });

      if (!response.ok) throw new Error("report_failed");

      setReportState("success");
      setReportDetails("");

      window.setTimeout(() => {
        setReportOpen(false);
        setReportState("idle");
      }, 1200);
    } catch (error) {
      console.error("Erro ao reportar problema:", error);
      setReportState("error");
    }
  }

  return (
    <>
      <div className="relative flex min-h-[250px] items-stretch gap-3 border-b border-gray-100 bg-white font-sans">
        {(product.discountPercent ?? 0) > 0 && (
          <div className="absolute left-0 top-4 z-10 bg-[#CC0C39] px-2 py-0.5 text-[11px] font-bold text-white">
            {product.discountPercent}% OFF
          </div>
        )}

        <div className="relative flex w-[160px] flex-shrink-0 flex-col items-center justify-center bg-[#f3f3f3] p-3">
          {product.imageUrl ? (
            <div className="flex h-[220px] w-full items-center justify-center">
              <Image
                src={getOptimizedAmazonUrl(product.imageUrl, 320)}
                alt={product.name}
                width={260}
                height={260}
                sizes="160px"
                priority={priority}
                className="h-auto w-auto max-h-[190px] max-w-[120px] object-contain mix-blend-multiply"
                unoptimized
              />
            </div>
          ) : (
            <span className="text-[10px] text-zinc-400">Sem imagem</span>
          )}

          <div className="mt-2 flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => {
                setReportOpen(true);
                setReportState("idle");
              }}
              className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-gray-600 transition hover:border-gray-300"
              aria-label="Reportar problema"
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              Reportar
            </button>

            <button
              type="button"
              onClick={() => {
                const deal = buildSaveableDeal();
                if (!deal) return;
                setSaved(toggleSavedDeal(deal));
              }}
              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition ${
                saved
                  ? "border-[#f0c14b] bg-[#fff7d6] text-[#b77900]"
                  : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
              }`}
              aria-label={saved ? "Remover dos salvos" : "Salvar oferta"}
            >
              <Bookmark className={`h-3.5 w-3.5 ${saved ? "fill-current" : ""}`} />
              {saved ? "Salvo" : "Salvar"}
            </button>
          </div>
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
            <div className="mb-2 flex flex-wrap items-center gap-x-1.5 text-[11px] text-zinc-500">
              {visibleHighlights.map((item, index) => (
                <span key={item.key}>
                  {index > 0 && <span className="mr-1">•</span>}
                  {item.hideLabel ? (
                    <b className="font-medium text-zinc-700">{item.value}</b>
                  ) : (
                    <>
                      {item.label}: <b className="font-medium text-zinc-700">{item.value}</b>
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

                displayValue =
                  !Number.isNaN(numericRaw) && numericRaw > 0
                    ? formatCurrencyValue(numericRaw)
                    : "R$ 0,00";

                valueClass = "text-green-700";
              } else {
                displayValue = formatDisplayValue(rawValue, config) || "-";
              }

              return (
                <div key={config.key} className="flex flex-col overflow-hidden px-1 text-center">
                  <span className={`mb-1 truncate text-[12px] font-semibold leading-none ${valueClass}`}>
                    {displayValue}
                  </span>
                  <span
                    className={`truncate text-[9px] font-bold uppercase tracking-wide ${
                      config.type === "currency" ? "text-green-600" : "text-zinc-400"
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
                {priceDecision && priceDecisionStyles ? (
                  <div className="mb-1.5 flex flex-col items-start gap-0.5">
                    <span
                      className={`inline-flex items-center border px-2.5 py-1 text-[11px] font-semibold leading-none ${priceDecisionStyles.badge}`}
                    >
                      {priceDecision.label}
                    </span>
                    {shouldShowDecisionMessage ? (
                      <p
                        className={`text-[10px] font-medium leading-snug ${priceDecisionStyles.insight} opacity-80`}
                      >
                        {priceDecision.message}
                      </p>
                    ) : null}
                  </div>
                ) : null}

                <div className="flex items-start">
                  <div className="flex items-start">
                    <span
                      className={`mt-1 text-[13px] font-medium ${
                        (product.discountPercent ?? 0) > 0 ? "text-[#CC0C39]" : "text-[#0F1111]"
                      }`}
                    >
                      R$
                    </span>
                    <span
                      className={`text-3xl font-medium leading-none tracking-tight ${
                        (product.discountPercent ?? 0) > 0 ? "text-[#CC0C39]" : "text-[#0F1111]"
                      }`}
                    >
                      {intCents[0]}
                    </span>
                    <span
                      className={`mt-[3px] text-[14px] font-medium leading-none ${
                        (product.discountPercent ?? 0) > 0 ? "text-[#CC0C39]" : "text-[#0F1111]"
                      }`}
                    >
                      {intCents[1]}
                    </span>
                  </div>

                  {!showReferencePrice && canShowPriceHistory ? (
                    <div className="ml-2 mt-1 shrink-0">
                      <PriceHistoryButton
                        productId={product.id}
                        productName={product.name}
                      />
                    </div>
                  ) : null}
                </div>

                {showReferencePrice ? (
                  <div className="relative mt-0.5 flex items-center gap-1 text-[11px] text-zinc-500">
                    <span className="font-medium">De:</span>
                    <span className="line-through">
                      R$ {product.avgPrice!.toFixed(2).replace(".", ",")}
                    </span>
                    {canShowPriceHistory ? (
                      <PriceHistoryButton
                        productId={product.id}
                        productName={product.name}
                      />
                    ) : null}
                  </div>
                ) : null}

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

            <div className="mt-2">
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

      {reportOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4"
          onClick={() => {
            setReportOpen(false);
            setReportState("idle");
          }}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-black text-gray-900">Reportar problema</h3>
                <p className="mt-1 text-sm text-gray-500">{product.name}</p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setReportOpen(false);
                  setReportState("idle");
                }}
                className="rounded-full p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
                aria-label="Fechar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {REPORT_REASONS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setReportReason(option)}
                    className={`rounded-xl border px-3 py-2 text-left text-sm font-semibold transition ${
                      reportReason === option
                        ? "border-blue-200 bg-blue-50 text-blue-700"
                        : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>

              <textarea
                value={reportDetails}
                onChange={(event) => setReportDetails(event.target.value)}
                rows={4}
                maxLength={1000}
                placeholder="Detalhe opcional"
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-blue-300"
              />

              {reportState === "success" ? (
                <p className="text-sm font-semibold text-green-600">Problema registrado.</p>
              ) : null}

              {reportState === "error" ? (
                <p className="text-sm font-semibold text-red-600">
                  Falha ao enviar. Tente de novo.
                </p>
              ) : null}

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setReportOpen(false);
                    setReportState("idle");
                  }}
                  className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSubmitReport}
                  disabled={reportState === "submitting" || !asin}
                  className="rounded-xl bg-[#FFD814] px-4 py-2 text-sm font-semibold text-[#0F1111] transition hover:bg-[#F7CA00] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {reportState === "submitting" ? "Enviando..." : "Enviar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}


