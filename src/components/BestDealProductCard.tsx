"use client";

import Image from "next/image";
import { AlertTriangle, Bookmark, X } from "lucide-react";
import { useEffect, useState } from "react";
import TrackedDealLink from "@/components/TrackedDealLink";
import { PriceHistoryButton } from "@/components/dynamic/PriceHistoryButton";
import type { BestDeal } from "@/lib/bestDeals";
import { SAVED_DEALS_EVENT, isDealSaved, toggleSavedDeal } from "@/lib/client/savedDeals";
import { getOptimizedAmazonUrl } from "@/lib/utils";

const REPORT_REASONS = [
  "Preço desatualizado",
  "Produto indisponível",
  "Informação incorreta",
  "Outro",
] as const;

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatPriceParts(value: number) {
  const [whole, cents] = value.toFixed(2).split(".");
  return { whole, cents };
}

function formatCount(value: number) {
  return value.toLocaleString("pt-BR");
}

function StarRow({ rating }: { rating: number }) {
  const rounded = Math.round(rating * 2) / 2;

  return (
    <div className="flex items-center gap-[1px] text-[14px] leading-none text-[#DE7921]">
      {[0, 1, 2, 3, 4].map((index) => {
        const diff = rounded - index;
        const fillWidth = diff >= 1 ? "100%" : diff >= 0.5 ? "50%" : "0%";

        return (
          <span key={index} className="relative inline-flex">
            <span className="text-[#D5D9D9]">★</span>
            <span
              className="absolute inset-y-0 left-0 overflow-hidden text-[#DE7921]"
              style={{ width: fillWidth }}
            >
              ★
            </span>
          </span>
        );
      })}
    </div>
  );
}

export default function BestDealProductCard({
  item,
  category,
  compact = false,
  showActions = true,
}: {
  item: BestDeal;
  category: string;
  compact?: boolean;
  showActions?: boolean;
}) {
  const price = formatPriceParts(item.totalPrice);
  const hasRating = (item.ratingAverage || 0) > 0 && (item.ratingCount || 0) > 0;
  const [saved, setSaved] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reason, setReason] = useState<(typeof REPORT_REASONS)[number]>(
    "Preço desatualizado"
  );
  const [details, setDetails] = useState("");
  const [reportState, setReportState] = useState<"idle" | "submitting" | "success" | "error">(
    "idle"
  );

  useEffect(() => {
    setSaved(isDealSaved(item.asin));
  }, [item.asin]);

  useEffect(() => {
    const syncSaved = () => setSaved(isDealSaved(item.asin));

    window.addEventListener("storage", syncSaved);
    window.addEventListener(SAVED_DEALS_EVENT, syncSaved);

    return () => {
      window.removeEventListener("storage", syncSaved);
      window.removeEventListener(SAVED_DEALS_EVENT, syncSaved);
    };
  }, [item.asin]);

  async function submitReport() {
    if (reportState === "submitting") return;

    try {
      setReportState("submitting");

      const response = await fetch("/api/product-issue-reports", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          asin: item.asin,
          reason,
          details,
          pagePath: window.location.pathname,
        }),
      });

      if (!response.ok) {
        throw new Error("report_failed");
      }

      setReportState("success");
      setDetails("");

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
      <div className="relative h-full">
        {showActions ? (
          <div className="absolute right-2 top-2 z-10 flex items-center gap-2">
            <button
              type="button"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setReportOpen(true);
                setReportState("idle");
              }}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 shadow-sm transition hover:text-[#0F1111]"
              aria-label="Reportar problema"
            >
              <AlertTriangle className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setSaved(toggleSavedDeal(item));
              }}
              className={`inline-flex h-8 w-8 items-center justify-center rounded-full border shadow-sm transition ${
                saved
                  ? "border-[#f0c14b] bg-[#fff7d6] text-[#b77900]"
                  : "border-gray-200 bg-white text-gray-500 hover:text-[#0F1111]"
              }`}
              aria-label={saved ? "Remover dos salvos" : "Salvar oferta"}
            >
              <Bookmark className={`h-4 w-4 ${saved ? "fill-current" : ""}`} />
            </button>
          </div>
        ) : null}

        <TrackedDealLink
          asin={item.asin}
          href={item.url}
          productId={item.id}
          productName={item.name}
          value={item.totalPrice}
          category={category}
          className="group flex h-full flex-col rounded-xl border border-[#d5d9d9] bg-white p-3 text-left transition hover:border-[#c7cfd0] hover:shadow-sm"
        >
          <div
            className={`relative overflow-hidden rounded-lg bg-white ${
              compact ? "h-[78px]" : "h-[108px]"
            }`}
          >
            <Image
              src={getOptimizedAmazonUrl(item.imageUrl, compact ? 240 : 320)}
              alt={item.name}
              fill
              sizes={
                compact ? "(max-width: 768px) 42vw, 180px" : "(max-width: 768px) 42vw, 220px"
              }
              className="object-contain p-2"
              unoptimized
            />
          </div>

          <p
            className={`mt-1.5 h-[40px] font-medium leading-[20px] text-[#2162A1] group-hover:text-[#174e87] ${
              compact ? "text-[12px]" : "text-[14px]"
            }`}
            style={{
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              maxHeight: "40px",
            }}
          >
            {item.name}
          </p>

          <div className="mt-auto">
            <div className="min-h-[16px]">
              {hasRating ? (
                <div className="flex items-center gap-1.5">
                  <StarRow rating={Number(item.ratingAverage)} />
                  <span className="text-[12px] text-[#2162A1]">
                    {formatCount(Number(item.ratingCount))}
                  </span>
                </div>
              ) : null}
            </div>

            <div className="flex min-h-[40px] items-end gap-2">
              <div className="flex items-end gap-1 font-variant-numeric-tabular">
                <span className="pb-[4px] text-[12px] font-medium leading-none text-[#CC0C39]">-</span>
                <span className="text-[18px] font-medium leading-none text-[#CC0C39]">
                  {item.discountPercent}%
                </span>
                <span className="pb-[5px] pl-1 text-[12px] leading-none text-[#565959]">R$</span>
                <span className="text-[24px] font-normal leading-none text-[#0F1111]">
                  {price.whole}
                </span>
                <span className="pb-[7px] text-[12px] leading-none text-[#0F1111]">
                  {price.cents}
                </span>
              </div>
            </div>

            <div className="mt-0.5 flex min-h-[18px] items-center gap-1.5 text-[12px] text-[#565959]">
              <p>
                De: <span className="line-through">{formatCurrency(item.averagePrice30d)}</span>
              </p>
              <div
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                }}
                className="inline-flex shrink-0"
              >
                <PriceHistoryButton productId={item.id} productName={item.name} />
              </div>
            </div>

          </div>
        </TrackedDealLink>
      </div>

      {showActions && reportOpen ? (
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
                <p className="mt-1 text-sm text-gray-500">{item.name}</p>
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
                    onClick={() => setReason(option)}
                    className={`rounded-xl border px-3 py-2 text-left text-sm font-semibold transition ${
                      reason === option
                        ? "border-blue-200 bg-blue-50 text-blue-700"
                        : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>

              <textarea
                value={details}
                onChange={(event) => setDetails(event.target.value)}
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
                  onClick={submitReport}
                  disabled={reportState === "submitting"}
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
