"use client";

import type { NextOfferProduct } from "@/lib/next-offers/types";

export function notifyNextOfferClick(
  product: NextOfferProduct,
  page: "home" | "offers",
) {
  const payload = JSON.stringify({
    asin: product.asin,
    productName: product.title,
    categoryName: product.category,
    displayedPrice: product.currentPrice,
    displayedDiscount: product.discountPercent,
    pagePath:
      typeof window === "undefined"
        ? page === "home"
          ? "/"
          : "/ofertas"
        : `${window.location.pathname}${window.location.search}`,
  });

  void fetch("/api/next-offers/click-alert", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload,
    keepalive: true,
  }).catch(() => {
    // O aviso nunca deve impedir a abertura da oferta na Amazon.
  });
}
