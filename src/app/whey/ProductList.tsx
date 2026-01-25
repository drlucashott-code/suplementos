"use client";

import { useEffect, useRef } from "react";
import { MobileProductCard } from "./MobileProductCard";

export function ProductList({ products }: { products: any[] }) {
  const trackedRef = useRef(false);

  useEffect(() => {
    if (trackedRef.current || !products.length) return;
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
    <section className="flex flex-col">
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