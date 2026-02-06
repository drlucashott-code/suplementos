"use client";

import { MobileProductCard, BebidaProduct } from "./MobileProductCard";
import { useEffect, useRef, useState, useMemo } from "react";

interface CustomWindow extends Window {
  gtag?: (command: string, eventName: string, params: Record<string, unknown>) => void;
  dataLayer?: Record<string, unknown>[];
}

export function ProductList({ 
  products, 
  viewEventName 
}: { 
  products: BebidaProduct[]; 
  viewEventName?: string; 
}) {
  // 🚀 PERFORMANCE: Reset de estado durante a renderização para evitar "flicker" e cascading renders
  const [prevProducts, setPrevProducts] = useState(products);
  const [visibleCount, setVisibleCount] = useState(3);

  if (products !== prevProducts) {
    setPrevProducts(products);
    setVisibleCount(3);
  }

  const trackedRef = useRef<string | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // 📊 Analytics Tracking (Utilizando a prop viewEventName vinda da Page)
  useEffect(() => {
    const eventToTrack = viewEventName || "view_bebida_list";
    
    if (trackedRef.current === eventToTrack || !products.length) return;

    const win = window as unknown as CustomWindow;

    if (win.gtag) {
      win.gtag("event", eventToTrack, {
        category: "bebida_proteica",
        total_products: products.length,
        best_product_name: products[0]?.name,
      });
    }

    trackedRef.current = eventToTrack;
  }, [products, viewEventName]);

  // ♾️ Infinite Scroll Progressivo
  useEffect(() => {
    const currentTarget = loadMoreRef.current;
    
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && products.length > visibleCount) {
          setVisibleCount((prev) => prev + 20);
        }
      },
      { 
        threshold: 0.1,
        rootMargin: "300px" 
      }
    );

    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [visibleCount, products.length]);

  const visibleProducts = useMemo(() => products.slice(0, visibleCount), [products, visibleCount]);
  const hasMore = products.length > visibleCount;

  return (
    <section className="flex-1 space-y-4" style={{ fontFamily: 'Arial, sans-serif' }}>
      {visibleProducts.map((product, index) => (
        <MobileProductCard
          key={product.id}
          product={product}
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
              Buscando mais ofertas de Bebidas...
            </p>
          </div>
        </div>
      )}

      {/* Estado Vazio Otimizado */}
      {products.length === 0 && (
        <div className="text-center py-20 bg-white rounded-xl border border-dashed border-zinc-300 mx-1">
          <p className="text-zinc-600 text-[15px] px-4">
            Nenhuma Bebida Proteica encontrada com estes filtros.
          </p>
          <button 
            onClick={() => window.location.href = '/bebidaproteica'}
            className="mt-4 text-[#007185] font-bold hover:underline text-[14px]"
          >
            Limpar todos os filtros
          </button>
        </div>
      )}
    </section>
  );
}