"use client";

import { MobileProductCard, BarraProduct } from "./MobileProductCard";
import { useEffect, useRef, useState, useMemo } from "react";

// Interface para rastreio (GA / dataLayer)
interface CustomWindow extends Window {
  gtag?: (command: string, eventName: string, params: Record<string, unknown>) => void;
  dataLayer?: Record<string, unknown>[];
}

export function ProductList({
  products,
  viewEventName = "view_barra_list",
}: {
  products: BarraProduct[];
  viewEventName?: string;
}) {
  const [prevProducts, setPrevProducts] = useState(products);
  const [visibleCount, setVisibleCount] = useState(3);

  // Reset ao mudar filtros
  if (products !== prevProducts) {
    setPrevProducts(products);
    setVisibleCount(3);
  }

  const loadMoreRef = useRef<HTMLDivElement>(null);
  const trackedRef = useRef<string | null>(null);

  // 📊 Tracking de visualização (padrão creatina)
  useEffect(() => {
    if (!viewEventName || trackedRef.current === viewEventName) return;

    const win = window as unknown as CustomWindow;

    if (win.gtag) {
      win.gtag("event", viewEventName, {
        category: "barra",
        total_products: products.length,
      });
    } else {
      win.dataLayer = win.dataLayer || [];
      win.dataLayer.push({
        event: viewEventName,
        category: "barra",
        total_products: products.length,
      });
    }

    trackedRef.current = viewEventName;
  }, [products.length, viewEventName]);

  // ♾️ Scroll infinito (igual creatina)
  useEffect(() => {
    const currentTarget = loadMoreRef.current;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && products.length > visibleCount) {
          setVisibleCount((prev) => prev + 20);
        }
      },
      { threshold: 0.1, rootMargin: "200px" }
    );

    if (currentTarget) observer.observe(currentTarget);
    return () => {
      if (currentTarget) observer.unobserve(currentTarget);
    };
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
          priority={index < 3}
          isBest={index === 0}
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
            Nenhuma Barra de Proteína encontrada com estes filtros.
          </p>
        </div>
      )}
    </section>
  );
}

// Compatibilidade com import default
export default ProductList;
