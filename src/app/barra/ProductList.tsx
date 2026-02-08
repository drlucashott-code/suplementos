"use client";

import { MobileProductCard, BarraProduct } from "./MobileProductCard";
import { useEffect, useRef, useState, useMemo } from "react";

export function ProductList({
  products,
  viewEventName = "view_barra_list",
}: {
  products: BarraProduct[];
  viewEventName?: string;
}) {
  const [visibleCount, setVisibleCount] = useState(3);
  const [prevProducts, setPrevProducts] = useState(products);
  
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const trackedRef = useRef<string | null>(null);

  /**
   * CORREÇÃO: Sincronização durante a renderização.
   * Resetamos o estado local quando os produtos mudam.
   * Não alteramos o ref aqui para evitar o erro 'react-hooks/refs'.
   */
  if (products !== prevProducts) {
    setPrevProducts(products);
    setVisibleCount(3);
  }

  // 📊 Tracking de visualização
  useEffect(() => {
    // CORREÇÃO: O reset do trackedRef.current acontece aqui dentro do Effect
    // Toda vez que 'products' muda, este efeito roda. Se os produtos mudarem,
    // limpamos o tracking antigo para permitir um novo disparo.
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
        category: "barra",
        total_products: products.length,
      });
    } else if (win.dataLayer) {
      win.dataLayer.push({
        event: viewEventName,
        category: "barra",
        total_products: products.length,
      });
    }

    trackedRef.current = viewEventName;
  }, [products.length, viewEventName]);

  // ♾️ Scroll infinito
  useEffect(() => {
    const currentTarget = loadMoreRef.current;
    if (!currentTarget) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && products.length > visibleCount) {
          setVisibleCount((prev) => prev + 20);
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

export default ProductList;