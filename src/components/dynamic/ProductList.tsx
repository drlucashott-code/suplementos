"use client";

import { MobileProductCard, type DynamicProductType } from "./MobileProductCard";
import { useEffect, useRef, useState, useMemo } from "react";

// Tipagem do DisplayConfig para não dar erro de any
interface DisplayConfigField {
  key: string;
  label: string;
  type: "text" | "number" | "currency";
}

export function ProductList({
  products,
  viewEventName = "view_catalog_list", // 🚀 Nome padrão mais genérico
  displayConfig,
}: {
  products: DynamicProductType[];
  viewEventName?: string;
  displayConfig: DisplayConfigField[];
}) {
  const [visibleCount, setVisibleCount] = useState(6);
  const [prevProducts, setPrevProducts] = useState(products);
  
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const trackedRef = useRef<string | null>(null);

  // Sincronização inteligente: reseta o scroll ao mudar categoria ou filtro
  if (products !== prevProducts) {
    setPrevProducts(products);
    setVisibleCount(6); 
  }

  // Tracking de GA4 (Google Analytics)
  useEffect(() => {
    trackedRef.current = null; 
  }, [products]);

  useEffect(() => {
    if (!viewEventName || trackedRef.current === viewEventName) return;

    const win = window as typeof window & { 
      gtag?: (c: string, e: string, p: Record<string, unknown>) => void;
      dataLayer?: object[];
    };

    // 🚀 Ajustado para enviar a categoria como 'dinamica' ou baseada no evento
    if (win.gtag) {
      win.gtag("event", viewEventName, {
        category: "catalog",
        total_products: products.length,
      });
    } else if (win.dataLayer) {
      win.dataLayer.push({
        event: viewEventName,
        category: "catalog",
        total_products: products.length,
      });
    }

    trackedRef.current = viewEventName;
  }, [products.length, viewEventName]);

  // 🚀 Implementação do Intersection Observer para Scroll Infinito
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
          priority={index < 4} // LCP optimization
          displayConfig={displayConfig}
        />
      ))}

      {/* 🚀 Gatilho do Scroll Infinito */}
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

      {/* Empty State */}
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