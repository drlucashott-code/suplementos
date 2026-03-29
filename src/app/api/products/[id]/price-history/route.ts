import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getDynamicDisplayPrice,
  getDynamicFallbackConfig,
  type DynamicProductFallbackState,
} from "@/lib/dynamicFallback";

const RANGE_OPTIONS = [7, 30, 90, 180, 365] as const;
const VALID_RANGES = new Set<number>(RANGE_OPTIONS);

function formatDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function roundPrice(value: number | null) {
  if (value === null || Number.isNaN(value)) return null;
  return Math.round(value * 100) / 100;
}

function diffInDays(start: Date, end: Date) {
  const startUtc = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
  const endUtc = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
  return Math.floor((endUtc - startUtc) / 86_400_000);
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const { searchParams } = new URL(request.url);
    const requestedRange = Number(searchParams.get("range") || "30");

    const product = await prisma.dynamicProduct.findUnique({
      where: { id },
      select: {
        id: true,
        totalPrice: true,
        averagePrice30d: true,
        lowestPrice30d: true,
        highestPrice30d: true,
        lastValidPrice: true,
        lastValidPriceAt: true,
        availabilityStatus: true,
        priceHistory: {
          where: {
            date: {
              gte: (() => {
                const maxSince = new Date();
                maxSince.setHours(0, 0, 0, 0);
                maxSince.setDate(maxSince.getDate() - 364);
                return maxSince;
              })(),
            },
            price: {
              gt: 0,
            },
          },
          orderBy: { date: "asc" },
          select: {
            date: true,
            price: true,
          },
        },
      },
    });

    if (!product) {
      return NextResponse.json(
        { ok: false, error: "product_not_found" },
        { status: 404 }
      );
    }

    const fallbackConfig = await getDynamicFallbackConfig();
    const fallbackState: DynamicProductFallbackState = {
      lastValidPrice: product.lastValidPrice,
      lastValidPriceAt: product.lastValidPriceAt,
      availabilityStatus: product.availabilityStatus,
    };

    const currentPrice = getDynamicDisplayPrice({
      currentPrice: product.totalPrice,
      fallbackState,
      config: fallbackConfig,
    });

    const historyByDate = new Map<string, number>();

    for (const point of product.priceHistory) {
      const dateKey = formatDateKey(point.date);
      const price = roundPrice(point.price) ?? 0;
      historyByDate.set(dateKey, price);
    }

    const todayKey = formatDateKey(new Date());

    if (currentPrice > 0) {
      historyByDate.set(todayKey, roundPrice(currentPrice) ?? currentPrice);
    }

    const fullHistory = Array.from(historyByDate.entries())
      .map(([date, price]) => ({ date, price }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const oldestPoint = fullHistory[0]
      ? new Date(`${fullHistory[0].date}T00:00:00`)
      : null;
    const historySpanDays = oldestPoint ? diffInDays(oldestPoint, today) + 1 : 0;

    const availableRanges: Array<(typeof RANGE_OPTIONS)[number]> =
      historySpanDays >= 30
        ? RANGE_OPTIONS.filter((option) => option >= 30 && option <= historySpanDays)
        : historySpanDays >= 7
          ? [7]
          : [];

    const range =
      VALID_RANGES.has(requestedRange) && availableRanges.includes(requestedRange as (typeof RANGE_OPTIONS)[number])
        ? requestedRange
        : availableRanges[0] ?? (VALID_RANGES.has(requestedRange) ? requestedRange : 7);

    const since = new Date(today);
    since.setDate(since.getDate() - (range - 1));

    const history = fullHistory.filter((point) => {
      const pointDate = new Date(`${point.date}T00:00:00`);
      return pointDate >= since;
    });

    const prices = history
      .map((point) => point.price)
      .filter((value) => typeof value === "number" && value > 0);

    const avg =
      prices.length > 0
        ? roundPrice(prices.reduce((sum, value) => sum + value, 0) / prices.length)
        : null;
    const min = prices.length > 0 ? roundPrice(Math.min(...prices)) : null;
    const max = prices.length > 0 ? roundPrice(Math.max(...prices)) : null;

    const stats =
      range === 30
        ? {
            avg: roundPrice(product.averagePrice30d) ?? avg,
            min: roundPrice(product.lowestPrice30d) ?? min,
            max: roundPrice(product.highestPrice30d) ?? max,
          }
        : {
            avg,
            min,
            max,
          };

    return NextResponse.json({
      ok: true,
      range,
      availableRanges,
      currentPrice: roundPrice(currentPrice) ?? 0,
      history,
      stats,
    });
  } catch (error) {
    console.error("Erro ao buscar historico de preco:", error);

    return NextResponse.json(
      { ok: false, error: "price_history_failed" },
      { status: 500 }
    );
  }
}
