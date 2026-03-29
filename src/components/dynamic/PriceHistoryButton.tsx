"use client";

import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Loader2,
  Minus,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type SupportedRange = 7 | 30 | 90 | 180 | 365;

type PriceHistoryResponse = {
  ok: boolean;
  range: SupportedRange;
  availableRanges: SupportedRange[];
  currentPrice: number;
  history: Array<{
    date: string;
    price: number;
  }>;
  stats: {
    avg: number | null;
    min: number | null;
    max: number | null;
  };
};

const RANGE_OPTIONS: Array<{ value: SupportedRange; label: string }> = [
  { value: 7, label: "7d" },
  { value: 30, label: "30d" },
  { value: 90, label: "90d" },
  { value: 180, label: "180d" },
  { value: 365, label: "1 ano" },
];

function formatCurrency(value: number | null) {
  if (value === null || Number.isNaN(value)) return "--";

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatDateLabel(value: string) {
  const date = new Date(`${value}T00:00:00`);
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  }).format(date);
}

function formatDeltaPercent(value: number | null) {
  if (value === null || Number.isNaN(value)) return null;
  return Math.round(Math.abs(value));
}

type PriceHistoryButtonProps = {
  productId: string;
  productName: string;
};

export function PriceHistoryButton({
  productId,
  productName,
}: PriceHistoryButtonProps) {
  const [open, setOpen] = useState(false);
  const [range, setRange] = useState<SupportedRange>(30);
  const [cache, setCache] = useState<Partial<Record<SupportedRange, PriceHistoryResponse>>>(
    {}
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const data = cache[range] ?? null;
  const availableRanges = useMemo(() => {
    const cachedResponses = Object.values(cache).filter(
      (response): response is PriceHistoryResponse => Boolean(response)
    );

    return cachedResponses.find((response) => response.availableRanges.length > 0)
      ?.availableRanges ?? [];
  }, [cache]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open || cache[range]) return;

    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(
          `/api/products/${productId}/price-history?range=${range}`,
          { cache: "no-store" }
        );

        if (!response.ok) {
          throw new Error(`price_history_${response.status}`);
        }

        const payload = (await response.json()) as PriceHistoryResponse;

        if (!cancelled) {
          setCache((previous) => ({
            ...previous,
            [range]: payload,
            [payload.range]: payload,
          }));

          if (payload.range !== range) {
            setRange(payload.range);
          }
        }
      } catch (loadError) {
        console.error("Erro ao carregar historico de preco:", loadError);
        if (!cancelled) {
          setError("Nao foi possivel carregar o historico agora.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [cache, open, productId, range]);

  useEffect(() => {
    if (!open || availableRanges.length === 0) return;
    if (availableRanges.includes(range)) return;

    setRange(availableRanges[0]);
  }, [availableRanges, open, range]);

  const chart = useMemo(() => {
    if (!data || data.history.length === 0) return null;

    const width = 560;
    const height = 210;
    const padding = { top: 18, right: 12, bottom: 28, left: 38 };
    const drawableWidth = width - padding.left - padding.right;
    const drawableHeight = height - padding.top - padding.bottom;

    const values = data.history.map((point) => point.price);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const spread = Math.max(maxValue - minValue, 1);
    const paddedMin = Math.max(0, minValue - spread * 0.12);
    const paddedMax = maxValue + spread * 0.12;
    const xStep = data.history.length > 1 ? drawableWidth / (data.history.length - 1) : 0;

    const points = data.history.map((point, index) => {
      const x =
        data.history.length === 1
          ? padding.left + drawableWidth / 2
          : padding.left + xStep * index;
      const normalizedY =
        drawableHeight -
        ((point.price - paddedMin) / Math.max(paddedMax - paddedMin, 1)) * drawableHeight;
      const y = padding.top + normalizedY;

      return {
        ...point,
        x,
        y,
      };
    });

    const path = points
      .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
      .join(" ");

    const averageY =
      data.stats.avg !== null
        ? padding.top +
          (drawableHeight -
            ((data.stats.avg - paddedMin) / Math.max(paddedMax - paddedMin, 1)) *
              drawableHeight)
        : null;

    const minIndex =
      data.stats.min !== null
        ? points.findIndex((point) => Math.abs(point.price - data.stats.min!) < 0.001)
        : -1;
    const currentIndex = points.length - 1;
    const gridLines = [0, 0.5, 1].map((ratio) => ({
      y: padding.top + drawableHeight * ratio,
    }));

    return {
      width,
      height,
      padding,
      points,
      path,
      averageY,
      minIndex,
      currentIndex,
      gridLines,
      minLabel: formatCurrency(minValue),
      maxLabel: formatCurrency(maxValue),
    };
  }, [data]);

  const hoveredPoint =
    chart && hoveredIndex !== null && hoveredIndex >= 0 ? chart.points[hoveredIndex] : null;

  const deltaFromAverage =
    data?.stats.avg && data.stats.avg > 0
      ? ((data.currentPrice - data.stats.avg) / data.stats.avg) * 100
      : null;
  const deltaDirection =
    deltaFromAverage === null
      ? "flat"
      : deltaFromAverage <= -5
        ? "down"
        : deltaFromAverage >= 5
          ? "up"
          : "flat";
  const deltaPercent = formatDeltaPercent(deltaFromAverage);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[#E5E7EB] bg-white text-[#6B7280] transition hover:border-[#D1D5DB] hover:bg-[#FAFAFA] hover:text-[#374151]"
        aria-label="Ver histórico de preço"
        title="Ver histórico de preço"
      >
        <BarChart3 className="h-3 w-3" />
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/45 backdrop-blur-[2px] px-3 py-4 sm:px-4 sm:py-6"
          onClick={() => setOpen(false)}
        >
          <div
            className="flex max-h-[calc(100vh-2rem)] w-full max-w-3xl flex-col overflow-hidden rounded-[28px] bg-white shadow-[0_28px_90px_rgba(15,17,17,0.26)] sm:max-h-[calc(100vh-3rem)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="border-b border-[#EEF2F2] bg-[linear-gradient(180deg,#FAFCFC_0%,#F4F8F8_100%)] px-4 py-4 sm:px-6 sm:py-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#007185]">
                    Histórico de preço
                  </p>
                  <h3 className="mt-1 line-clamp-2 text-[15px] font-bold text-[#0F1111] sm:text-[17px]">
                    {productName}
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#E5E7EB] bg-white text-[#6B7280] shadow-sm transition hover:border-[#D1D5DB] hover:text-[#374151]"
                  aria-label="Fechar histórico"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="space-y-4 overflow-y-auto bg-[#FCFDFD] px-4 py-4 sm:px-6 sm:py-5">
              {availableRanges.length > 1 ? (
                <div className="flex flex-wrap items-center gap-2">
                  {RANGE_OPTIONS.filter((option) => availableRanges.includes(option.value)).map(
                    (option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setRange(option.value)}
                        className={`rounded-full px-3 py-1.5 text-[12px] font-semibold transition ${
                          range === option.value
                            ? "bg-[#0F1111] text-white shadow-sm"
                            : "border border-[#E5E7EB] bg-white text-gray-600 hover:border-[#D1D5DB] hover:bg-[#FAFAFA]"
                        }`}
                      >
                        {option.label}
                      </button>
                    )
                  )}
                </div>
              ) : availableRanges.length === 1 ? (
                <div className="flex items-center">
                  <span className="inline-flex rounded-full border border-[#E5E7EB] bg-white px-3 py-1 text-[11px] font-medium text-[#6B7280]">
                    Histórico de {RANGE_OPTIONS.find((option) => option.value === availableRanges[0])?.label}
                  </span>
                </div>
              ) : null}

              {loading && !data ? (
                <div className="flex min-h-[320px] items-center justify-center rounded-[24px] border border-[#E6ECEC] bg-white">
                  <div className="flex flex-col items-center gap-2 text-sm text-zinc-600">
                    <Loader2 className="h-5 w-5 animate-spin text-[#007185]" />
                    Carregando histórico...
                  </div>
                </div>
              ) : error ? (
                <div className="rounded-[24px] border border-red-100 bg-red-50 px-4 py-10 text-center text-sm font-medium text-red-600">
                  {error}
                </div>
              ) : !data || !chart ? (
                <div className="rounded-[24px] border border-dashed border-[#D5D9D9] bg-white px-4 py-10 text-center text-sm text-zinc-500">
                  Ainda não há histórico suficiente para exibir.
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                    <div className="rounded-[18px] border border-[#E6ECEC] bg-[linear-gradient(180deg,#FFFFFF_0%,#F7FAFA_100%)] px-3 py-2.5">
                      <p className="text-[9px] font-black uppercase tracking-[0.14em] text-zinc-500">
                        Preço atual
                      </p>
                      <p className="mt-1 text-[17px] font-bold tracking-tight text-[#0F1111]">
                        {formatCurrency(data.currentPrice)}
                      </p>
                    </div>

                    <div className="rounded-[18px] border border-[#E6ECEC] bg-[linear-gradient(180deg,#FFFFFF_0%,#F7FAFA_100%)] px-3 py-2.5">
                      <p className="text-[9px] font-black uppercase tracking-[0.14em] text-zinc-500">
                        Mínimo
                      </p>
                      <p className="mt-1 text-[17px] font-bold tracking-tight text-[#166534]">
                        {formatCurrency(data.stats.min)}
                      </p>
                    </div>

                    <div className="rounded-[18px] border border-[#DCEFE2] bg-[linear-gradient(180deg,#FFFFFF_0%,#F4FBF6_100%)] px-3 py-2.5">
                      <p className="text-[9px] font-black uppercase tracking-[0.14em] text-zinc-500">
                        Média
                      </p>
                      <p className="mt-1 text-[17px] font-bold tracking-tight text-[#0F1111]">
                        {formatCurrency(data.stats.avg)}
                      </p>
                    </div>

                    <div className="rounded-[18px] border border-[#E6ECEC] bg-[linear-gradient(180deg,#FFFFFF_0%,#F7FAFA_100%)] px-3 py-2.5">
                      <p className="text-[9px] font-black uppercase tracking-[0.14em] text-zinc-500">
                        Máximo
                      </p>
                      <p className="mt-1 text-[17px] font-bold tracking-tight text-[#0F1111]">
                        {formatCurrency(data.stats.max)}
                      </p>
                    </div>
                  </div>

                  {deltaDirection === "down" ? (
                    <div className="flex items-center">
                      <p className="inline-flex items-center gap-1.5 rounded-full border border-[#D8F0E0] bg-[#F5FBF7] px-3 py-1.5 text-[12px] font-semibold text-[#166534]">
                        <ArrowDownRight className="h-3.5 w-3.5" />
                        {deltaPercent}% abaixo da média
                      </p>
                    </div>
                  ) : null}

                  {deltaDirection === "up" ? (
                    <div className="flex items-center">
                      <p className="inline-flex items-center gap-1.5 rounded-full border border-[#FED7AA] bg-[#FFF7ED] px-3 py-1.5 text-[12px] font-semibold text-[#C2410C]">
                        <ArrowUpRight className="h-3.5 w-3.5" />
                        {deltaPercent}% acima da média
                      </p>
                    </div>
                  ) : null}

                  {deltaDirection === "flat" && deltaPercent !== null ? (
                    <div className="flex items-center">
                      <p className="inline-flex items-center gap-1.5 rounded-full border border-[#E5E7EB] bg-white px-3 py-1.5 text-[12px] font-semibold text-[#52525B]">
                        <Minus className="h-3.5 w-3.5" />
                        Preço dentro do normal
                      </p>
                    </div>
                  ) : null}

                  <div className="rounded-[24px] bg-white px-2 py-2 sm:px-3">
                    <div className="relative rounded-[18px] bg-[#FBFDFD] px-2 py-3 sm:px-3">
                      <svg
                        viewBox={`0 0 ${chart.width} ${chart.height}`}
                        className="block aspect-[16/7] w-full"
                        role="img"
                        aria-label={`Historico de preco de ${productName}`}
                      >
                        {chart.gridLines.map((line, index) => (
                          <line
                            key={`grid-${index}`}
                            x1={chart.padding.left}
                            y1={line.y}
                            x2={chart.width - chart.padding.right}
                            y2={line.y}
                            stroke="#F1F5F5"
                          />
                        ))}

                        <line
                          x1={chart.padding.left}
                          y1={chart.height - chart.padding.bottom}
                          x2={chart.width - chart.padding.right}
                          y2={chart.height - chart.padding.bottom}
                          stroke="#E4E4E7"
                        />

                        {chart.averageY !== null ? (
                          <line
                            x1={chart.padding.left}
                            y1={chart.averageY}
                            x2={chart.width - chart.padding.right}
                            y2={chart.averageY}
                            stroke="#94A3B8"
                            strokeDasharray="5 4"
                            strokeWidth="1.25"
                          />
                        ) : null}

                        <path
                          d={chart.path}
                          fill="none"
                          stroke="#007185"
                          strokeWidth="2.25"
                          strokeLinejoin="round"
                          strokeLinecap="round"
                        />

                        {chart.points.map((point, index) => {
                          const isCurrent = index === chart.currentIndex;

                          return (
                            <g key={`${point.date}-${point.price}-${index}`}>
                              {isCurrent ? (
                                <circle
                                  cx={point.x}
                                  cy={point.y}
                                  r={5}
                                  fill="#FFD814"
                                  stroke="#0F172A"
                                  strokeWidth={2.2}
                                  onMouseEnter={() => setHoveredIndex(index)}
                                  onMouseLeave={() => setHoveredIndex(null)}
                                />
                              ) : null}
                              <circle
                                cx={point.x}
                                cy={point.y}
                                r={12}
                                fill="transparent"
                                onMouseEnter={() => setHoveredIndex(index)}
                                onMouseLeave={() => setHoveredIndex(null)}
                              />
                            </g>
                          );
                        })}

                        <text x={10} y={chart.padding.top + 6} fontSize="11" fill="#71717A">
                          {chart.maxLabel}
                        </text>
                        <text
                          x={10}
                          y={chart.height - chart.padding.bottom}
                          fontSize="11"
                          fill="#71717A"
                        >
                          {chart.minLabel}
                        </text>

                        {chart.points.length > 1 ? (
                          <>
                            <text
                              x={chart.points[0]?.x ?? chart.padding.left}
                              y={chart.height - 8}
                              fontSize="11"
                              textAnchor="start"
                              fill="#71717A"
                            >
                              {formatDateLabel(chart.points[0]?.date ?? "")}
                            </text>
                            <text
                              x={chart.points[Math.floor(chart.points.length / 2)]?.x ?? chart.width / 2}
                              y={chart.height - 8}
                              fontSize="11"
                              textAnchor="middle"
                              fill="#A1A1AA"
                            >
                              {formatDateLabel(
                                chart.points[Math.floor(chart.points.length / 2)]?.date ?? ""
                              )}
                            </text>
                            <text
                              x={chart.points[chart.points.length - 1]?.x ?? chart.width}
                              y={chart.height - 8}
                              fontSize="11"
                              textAnchor="end"
                              fill="#71717A"
                            >
                              {formatDateLabel(chart.points[chart.points.length - 1]?.date ?? "")}
                            </text>
                          </>
                        ) : null}
                      </svg>

                      {hoveredPoint ? (
                        <div className="pointer-events-none absolute right-3 top-3 rounded-2xl border border-[#DCE7E9] bg-white/98 px-3 py-2 text-[11px] shadow-[0_10px_30px_rgba(15,17,17,0.12)]">
                          <p className="font-semibold text-[#0F1111]">
                            {formatDateLabel(hoveredPoint.date)}
                          </p>
                          <p className="mt-0.5 font-semibold text-[#007185]">
                            {formatCurrency(hoveredPoint.price)}
                          </p>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

export default PriceHistoryButton;
