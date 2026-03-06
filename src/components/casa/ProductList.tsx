"use client";

import { MobileProductCard, CasaProduct } from "./MobileProductCard";
import { useEffect, useRef, useState, useMemo } from "react";

// Tipagem do DisplayConfig para não dar erro de any
interface DisplayConfigField {
  key: string;
  label: string;
  type: "text" | "number" | "currency";
}

export function ProductList({
  products,
  viewEventName = "view_casa_list",
  displayConfig,
}: {
  products: CasaProduct[];
  viewEventName?: string;
  displayConfig: DisplayConfigField[];
}) {
  const [visibleCount, setVisibleCount] = useState(6);
  const [prevProducts, setPrevProducts] = useState(products);
  
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const trackedRef = useRef<string | null>(null);

  if (products !== prevProducts) {
    setPrevProducts(products);
    setVisibleCount(6); // Reseta a contagem ao trocar de categoria/filtro
  }

  // Tracking de GA4
  useEffect(() => {
    trackedRef.current = null; 
  }, [products]);

  useEffect(() => {
    if (!viewEventName || trackedRef.current === viewEventName) return;

    const win = window as typeof window & { 
      gtag?: (c: string, e: string, p: Record<string, unknown>) => void;
      dataLayer?: object[];
    };

    if (win.gtag) {
      win.gtag("event", viewEventName, {
        category: "casa",
        total_products: products.length,
      });
    } else if (win.dataLayer) {
      win.dataLayer.push({
        event: viewEventName,
        category: "casa",
        total_products: products.length,
      });
    }

    trackedRef.current = viewEventName;
  }, [products.length, viewEventName]);

  // Scroll infinito super leve
  useEffect(() => {
    const currentTarget = loadMoreRef.current;
    if (!currentTarget) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && products.length > visibleCount) {
          setVisibleCount((prev) => prev + 10);
        }
      },
      { threshold: 0.1, rootMargin: "200px" }
    );

    observer.observe(currentTarget);
    return () => observer.disconnect();
  }, [visibleCount, products.length]);

  const visibleProducts = useMemo(
    () => products.slice(0, visibleCount),
    [products, visibleCount]
  );

  const hasMore = products.length > visibleCount;

  return (
    <section className="flex-1 space-y-4">
      {visibleProducts.map((product, index) => (
        <MobileProductCard
          key={product.id}
          product={product}
          priority={index < 4}
          displayConfig={displayConfig}
        />
      ))}

      {hasMore && (
        <div ref={loadMoreRef} className="h-28 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <div className="w-6 h-6 border-2 border-zinc-300 border-t-blue-500 rounded-full animate-spin" />
            <p className="text-[12px] text-zinc-600 font-medium">
              Buscando mais ofertas...
            </p>
          </div>
        </div>
      )}

      {products.length === 0 && (
        <div className="text-center py-20 bg-white rounded-xl border border-dashed border-zinc-300 mx-1">
          <p className="text-zinc-500 text-[14px]">
            Nenhum produto encontrado com estes filtros.
          </p>
        </div>
      )}
    </section>
  );
}