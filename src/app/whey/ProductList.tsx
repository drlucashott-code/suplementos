"use client";

import { MobileProductCard, WheyProduct } from "./MobileProductCard";
import { useEffect, useRef, useState } from "react";

export function ProductList({ products }: { products: WheyProduct[] }) {
  // ✅ Começa com 5 produtos para performance inicial
  const [visibleCount, setVisibleCount] = useState(5);
  const trackedRef = useRef(false);

  // Elemento sentinela para o infinite scroll
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // 🔁 Resetar a contagem quando os filtros mudarem
  useEffect(() => {
    setVisibleCount(5);
    trackedRef.current = false;
  }, [products]);

  // 📊 Tracking (Analytics) - Adaptado para evento de Whey
  useEffect(() => {
    if (trackedRef.current || !products.length) return;

    if (typeof window !== "undefined" && "gtag" in window) {
      // @ts-ignore
      window.gtag("event", "view_whey_list", {
        total_products: products.length,
        best_product_name: products[0]?.name,
      });
    }

    trackedRef.current = true;
  }, [products]);

  // ♾️ Infinite scroll progressivo
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const firstEntry = entries[0];

        if (firstEntry.isIntersecting && products.length > visibleCount) {
          // ✅ Carrega mais 20 por vez conforme o scroll atinge o fim
          setVisibleCount((prev) => prev + 20);
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => {
      if (loadMoreRef.current) {
        observer.unobserve(loadMoreRef.current);
      }
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
          isBest={index === 0}
        />
      ))}

      {/* Sentinela do infinite scroll com visual Amazon */}
      {hasMore && (
        <div
          ref={loadMoreRef}
          className="h-24 flex items-center justify-center"
        >
          <div className="flex flex-col items-center gap-2">
            <div className="w-7 h-7 border-2 border-gray-200 border-t-[#007185] rounded-full animate-spin" />
            <p className="text-[13px] text-gray-500 font-medium">
              Carregando mais resultados...
            </p>
          </div>
        </div>
      )}

      {/* Estado Vazio (Empty State) */}
      {products.length === 0 && (
        <div className="text-center py-24 bg-white rounded-xl border border-dashed border-gray-300 mx-1">
          <p className="text-[#565959] text-[15px]">
            Nenhum Whey Protein encontrado com estes filtros.
          </p>
          <button 
            onClick={() => window.location.href = '/whey'}
            className="mt-4 text-[#007185] font-medium hover:underline text-[14px]"
          >
            Limpar todos os filtros
          </button>
        </div>
      )}
    </section>
  );
}