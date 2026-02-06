"use client";

import { MobileProductCard, WheyProduct } from "./MobileProductCard";
import { useEffect, useRef, useState } from "react";

/* Tipagem segura para GA */
type GtagWindow = Window & {
  gtag?: (command: string, event: string, params: Record<string, unknown>) => void;
};

export function ProductList({ products }: { products: WheyProduct[] }) {
  // 🚀 PERFORMANCE: inicia com 3 itens para priorizar LCP
  const [visibleCount, setVisibleCount] = useState(3);

  const trackedRef = useRef(false);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  /* =========================
     📊 TRACKING DE VISUALIZAÇÃO
     ========================= */
  useEffect(() => {
    if (trackedRef.current || products.length === 0) return;

    const win = window as GtagWindow;

    win.gtag?.("event", "view_whey_list", {
      total_products: products.length,
      best_product_name: products[0]?.name,
    });

    trackedRef.current = true;
  }, [products]);

  /* =========================
     ♾️ INFINITE SCROLL
     ========================= */
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && products.length > visibleCount) {
          setVisibleCount((prev) => prev + 20);
        }
      },
      {
        threshold: 0.1,
        rootMargin: "300px",
      }
    );

    const current = loadMoreRef.current;
    if (current) observer.observe(current);

    return () => {
      if (current) observer.unobserve(current);
    };
  }, [visibleCount, products.length]);

  const visibleProducts = products.slice(0, visibleCount);
  const hasMore = products.length > visibleCount;

  return (
    <section className="flex-1 space-y-4">
      {visibleProducts.map((product, index) => (
        <MobileProductCard
          key={product.id}
          product={product}
          isBest={index === 0} // apenas compatibilidade
          priority={index < 3}
        />
      ))}

      {/* Loader */}
      {hasMore && (
        <div ref={loadMoreRef} className="h-28 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 border-2 border-zinc-200 border-t-[#007185] rounded-full animate-spin" />
            <p className="text-[12px] text-zinc-500 font-medium">
              Buscando mais ofertas de Whey...
            </p>
          </div>
        </div>
      )}

      {/* Estado vazio */}
      {products.length === 0 && (
        <div className="text-center py-20 bg-white rounded-xl border border-dashed border-zinc-300 mx-1">
          <p className="text-zinc-600 text-[15px] px-4">
            Nenhum Whey Protein encontrado com estes filtros.
          </p>
          <button
            onClick={() => (window.location.href = "/whey")}
            className="mt-4 text-[#007185] font-bold hover:underline text-[14px]"
          >
            Limpar todos os filtros
          </button>
        </div>
      )}
    </section>
  );
}
