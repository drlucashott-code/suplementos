"use client";

import { MobileProductCard, BarraProduct } from "./MobileProductCard";
import { useEffect, useRef, useState } from "react";

export function ProductList({ products }: { products: BarraProduct[] }) {
  // 🚀 PERFORMANCE: Iniciamos com 3 itens para priorizar o LCP no mobile.
  const [visibleCount, setVisibleCount] = useState(3);
  const trackedRef = useRef(false);

  // Sentinela para o Infinite Scroll
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // 🔁 Resetar o estado ao mudar os filtros
  useEffect(() => {
    setVisibleCount(3);
    trackedRef.current = false;
  }, [products]);

  // 📊 Analytics Tracking (Adaptado para Barras)
  useEffect(() => {
    if (trackedRef.current || !products.length) return;

    if (typeof window !== "undefined" && "gtag" in window) {
      // @ts-ignore
      window.gtag("event", "view_barra_list", {
        total_products: products.length,
        best_product_name: products[0]?.name,
      });
    }

    trackedRef.current = true;
  }, [products]);

  // ♾️ Infinite Scroll Progressivo
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const firstEntry = entries[0];

        if (firstEntry.isIntersecting && products.length > visibleCount) {
          // Carrega mais 20 itens por vez
          setVisibleCount((prev) => prev + 20);
        }
      },
      { 
        threshold: 0.1,
        rootMargin: "300px" // Inicia o carregamento antes do fim da rolagem
      }
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
    <section className="flex-1 space-y-4" style={{ fontFamily: 'Arial, sans-serif' }}>
      {visibleProducts.map((product, index) => (
        <MobileProductCard
          key={product.id}
          product={product}
          // 🔥 PRIORIDADE DE CARREGAMENTO: 
          // Instruímos o Next.js a carregar as 3 primeiras imagens imediatamente (LCP).
          priority={index < 3} 
        />
      ))}

      {/* Sentinela com Visual de Carregamento Amazon */}
      {hasMore && (
        <div
          ref={loadMoreRef}
          className="h-28 flex items-center justify-center"
        >
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 border-2 border-zinc-200 border-t-[#007185] rounded-full animate-spin" />
            <p className="text-[12px] text-zinc-500 font-medium">
              Buscando mais ofertas de Barras...
            </p>
          </div>
        </div>
      )}

      {/* Estado Vazio Otimizado */}
      {products.length === 0 && (
        <div className="text-center py-20 bg-white rounded-xl border border-dashed border-zinc-300 mx-1">
          <p className="text-zinc-600 text-[15px] px-4">
            Nenhuma Barra de Proteína encontrada com estes filtros.
          </p>
          <button 
            onClick={() => window.location.href = '/barra'}
            className="mt-4 text-[#007185] font-bold hover:underline text-[14px]"
          >
            Limpar todos os filtros
          </button>
        </div>
      )}
    </section>
  );
}