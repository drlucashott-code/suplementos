"use client";

import { useEffect, useRef } from "react";
import { MobileProductCard } from "./MobileProductCard";

export type WheyProductPublic = {
  id: string;
  name: string;
  imageUrl: string;
  flavor: string | null;

  price: number;
  affiliateUrl: string;

  protein: number; // g por dose
  dose: number; // g
  proteinPercent: number; // %
  pricePerProtein: number; // R$ / g proteína
};

export function ProductList({
  products,
}: {
  products: WheyProductPublic[];
}) {
  const trackedRef = useRef(false);

  useEffect(() => {
    if (trackedRef.current) return;
    if (!products || products.length === 0) return;

    if (typeof window !== "undefined" && "gtag" in window) {
      // @ts-ignore
      window.gtag("event", "view_product_list", {
        category: "whey",
        total_products: products.length,
        best_product_name: products[0]?.name,
      });
    }

    trackedRef.current = true;
  }, [products]);

  return (
    <section className="flex-1 space-y-6">
      {products.map((product, index) => (
        <MobileProductCard
          key={product.id}
          product={product}
          isBest={index === 0}
        />
      ))}
    </section>
  );
}
