import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getDynamicDisplayPrice,
  getDynamicFallbackConfig,
  type DynamicProductFallbackState,
} from "@/lib/dynamicFallback";
import {
  getAvailablePriceHistoryChartRangesFromDateKeys,
  type PriceHistoryChartRange,
  getPriceHistoryBusinessDateKey,
  shiftPriceHistoryDateKey,
} from "@/lib/dynamicPriceHistory";

function formatDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function roundPrice(value: number | null) {
  if (value === null || Number.isNaN(value)) return null;
  return Math.round(value * 100) / 100;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const { searchParams } = new URL(request.url);
    const rawRequestedRange = Number(searchParams.get("range") || "30");
    const requestedRange =
      Number.isInteger(rawRequestedRange) && rawRequestedRange >= 1 && rawRequestedRange <= 365
        ? rawRequestedRange
        : 30;

    const product = await prisma.dynamicProduct.findUnique({
      where: { id },
      select: {
        id: true,
        totalPrice: true,
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

    const recordedHistoryByDate = new Map<string, number>();

    for (const point of product.priceHistory) {
      const dateKey = formatDateKey(point.date);
      const price = roundPrice(point.price) ?? 0;
      recordedHistoryByDate.set(dateKey, price);
    }

    const todayKey = getPriceHistoryBusinessDateKey();
    const effectiveHistoryDateKeys = Array.from(recordedHistoryByDate.keys());

    if (currentPrice > 0 && !recordedHistoryByDate.has(todayKey)) {
      effectiveHistoryDateKeys.push(todayKey);
    }

    const availableRanges = getAvailablePriceHistoryChartRangesFromDateKeys(
      effectiveHistoryDateKeys
    );

    const range =
      availableRanges.includes(requestedRange as PriceHistoryChartRange)
        ? requestedRange
        : availableRanges[0] ?? requestedRange;

    const history =
      availableRanges.length > 0
        ? (() => {
            const historyByDate = new Map(recordedHistoryByDate);

            if (currentPrice > 0) {
              historyByDate.set(todayKey, roundPrice(currentPrice) ?? currentPrice);
            }

            const fullHistory = Array.from(historyByDate.entries())
              .map(([date, price]) => ({ date, price }))
              .sort((a, b) => a.date.localeCompare(b.date));

            const sinceKey = shiftPriceHistoryDateKey(todayKey, -(range - 1));

            return fullHistory.filter((point) => {
              return point.date >= sinceKey && point.date <= todayKey;
            });
          })()
        : [];

    const prices = history
      .map((point) => point.price)
      .filter((value) => typeof value === "number" && value > 0);

    const avg =
      prices.length > 0
        ? roundPrice(prices.reduce((sum, value) => sum + value, 0) / prices.length)
        : null;
    const min = prices.length > 0 ? roundPrice(Math.min(...prices)) : null;
    const max = prices.length > 0 ? roundPrice(Math.max(...prices)) : null;

    const stats = {
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
