"use client";

import { MobileProductCard } from "./MobileProductCard";
import { CreatineForm } from "@prisma/client";
import { useEffect, useRef } from "react";

type Product = {
  id: string;
  name: string;
  imageUrl: string;
  flavor: string | null;
  form: CreatineForm;

  price: number;
  affiliateUrl: string;

  doses: number;
  pricePerGram: number;          // ✅ ADICIONADO
  discountPercent?: number | null;
};

export function ProductList({
  products,
}: {
  products: Product[];
}) {
  const trackedRef = useRef(false);

  useEffect(() => {
    if (trackedRef.current) return;
    if (!products.length) return;

    if (typeof window !== "undefined" && "gtag" in window) {
      // @ts-ignore
      window.gtag("event", "view_product_list", {
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
