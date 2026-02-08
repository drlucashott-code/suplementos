"use client";

import { MobileProductCard, DrinkProduct } from "./MobileProductCard";
import { useEffect, useRef, useState, useMemo } from "react";

/* Tipagem segura para GA */
type GtagWindow = Window & {
  gtag?: (command: string, event: string, params: Record<string, unknown>) => void;
  dataLayer?: object[];
};

export function ProductList({
  products,
  viewEventName = "view_drink_list",
}: {
  products: DrinkProduct[];
  viewEventName?: string;
}) {
  const [visibleCount, setVisibleCount] = useState(3);
  const [prevProducts, setPrevProducts] = useState(products);
  
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const trackedRef = useRef<string | null>(null);

  /**
   * Sincronização: Resetamos o estado local quando os produtos (filtros) mudam.
   */
  if (products !== prevProducts) {
    setPrevProducts(products);
    setVisibleCount(3);
  }

  // Tracking de visualização
  useEffect(() => {
    trackedRef.current = null; 
  }, [products]);

  useEffect(() => {
    if (!viewEventName || trackedRef.current === viewEventName) return;

    const win = window as GtagWindow;

    const payload = {
      category: "bebidaproteica",
      total_products: products.length,
    };

    if (win.gtag) {
      win.gtag("event", viewEventName, payload);
    } else if (win.dataLayer) {
      win.dataLayer.push({
        event: viewEventName,
        ...payload
      });
    }

    trackedRef.current = viewEventName;
  }, [products.length, viewEventName]);

  // ♾️ Scroll infinito (Intersection Observer)
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
      {/* Lista Vertical: Cada card ocupa a largura total.
         A análise técnica interna (2 colunas) está dentro do MobileProductCard.
      */}
      {visibleProducts.map((product, index) => (
        <MobileProductCard
          key={product.id}
          product={product}
          priority={index < 3}
          isBest={index === 0}
        />
      ))}

      {/* Loader de Infinite Scroll */}
      {hasMore && (
        <div ref={loadMoreRef} className="h-28 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <div className="w-6 h-6 border-2 border-zinc-300 border-t-blue-500 rounded-full animate-spin" />
            <p className="text-[12px] text-zinc-600 font-medium">
              Buscando mais bebidas...
            </p>
          </div>
        </div>
      )}

      {/* Estado Vazio */}
      {products.length === 0 && (
        <div className="text-center py-20 bg-white rounded-xl border border-dashed border-zinc-300 mx-1">
          <p className="text-zinc-500 text-[14px]">
            Nenhuma Bebida Proteica encontrada com estes filtros.
          </p>
          <button
            onClick={() => (window.location.href = "/bebidaproteica")}
            className="mt-4 text-[#007185] font-bold hover:underline text-[14px]"
          >
            Limpar todos os filtros
          </button>
        </div>
      )}
    </section>
  );
}

export default ProductList;