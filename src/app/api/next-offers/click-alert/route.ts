import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { sendDynamicClickAlertEmail } from "@/lib/dynamicClickAlerts";

const ASIN_PATTERN = /^[A-Z0-9]{10}$/;

function cleanText(value: unknown, maxLength: number) {
  return typeof value === "string"
    ? value.replace(/[\r\n\t]+/g, " ").trim().slice(0, maxLength)
    : "";
}

function optionalNumber(value: unknown, min: number, max: number) {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) && number >= min && number <= max
    ? number
    : null;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const asin = cleanText(body.asin, 10).toUpperCase();
    const productName = cleanText(body.productName, 300);

    if (!ASIN_PATTERN.test(asin) || !productName) {
      return NextResponse.json({ ok: false, error: "invalid_product" }, { status: 400 });
    }

    await sendDynamicClickAlertEmail({
      asin,
      productName,
      categoryName: cleanText(body.categoryName, 120) || null,
      pagePath: cleanText(body.pagePath, 300) || "/ofertas",
      source: "Top Ofertas",
      productUrl: `https://www.amazon.com.br/dp/${asin}`,
      displayedPrice: optionalNumber(body.displayedPrice, 0, 10_000_000),
      displayedDiscount: optionalNumber(body.displayedDiscount, 0, 100),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Erro ao processar alerta de clique das Top Ofertas:", error);
    return NextResponse.json({ ok: false, error: "alert_failed" }, { status: 500 });
  }
}
