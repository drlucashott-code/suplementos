"use client";

import type { NextOfferProduct } from "@/lib/next-offers/types";
import { trackTopOfferClick } from "@/lib/client/productClickTracking";

export function notifyNextOfferClick(product: NextOfferProduct) {
  trackTopOfferClick({
    asin: product.asin,
    productName: product.title,
    categoryName: product.category,
    displayedPrice: product.currentPrice,
    displayedDiscount: product.discountPercent,
  });
}
