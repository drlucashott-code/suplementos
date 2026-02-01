"use client";

import { MobileProductCard } from "./MobileProductCard";
import { CreatineForm } from "@prisma/client";
import { useEffect, useRef, useState } from "react";

export type Product = {
  id: string;
  name: string;
  imageUrl: string;
  flavor: string | null;
  form: CreatineForm;
  price: number | null;
  affiliateUrl: string;
  doses: number | null;
  pricePerGram: number;
  discountPercent?: number | null;
  avgPrice?: number | null; 
  isLowestPrice?: boolean;  
  isLowestPrice7d?: boolean; // ✅ Adicionado para compatibilidade
  rating?: number;
  reviewsCount?: number;
  hasCarbs?: boolean;        // ✅ Adicionado para compatibilidade
};

// 1. Recebe "viewEventName" (ex: "view_creatina_list") vindo da página
export function ProductList({ 
  products, 
  viewEventName 
}: { 
  products: Product[]; 
  viewEventName?: string; 
}) {
  // 🚀 PERFORMANCE RADICAL: 
  const [visibleCount, setVisibleCount] = useState(3);
  
  // Elemento invisível que serve como gatilho para carregar mais itens
  const loadMoreRef = useRef<HTMLDivElement>(null);
  
  // Controle para não disparar eventos duplicados
  const trackedRef = useRef(false);

  // 🔁 Resetar a contagem e o tracking sempre que a lista de produtos (filtros) mudar
  useEffect(() => {
    setVisibleCount(3);
    trackedRef.current = false;
  }, [products]);

  // 📊 RASTREIO CORRIGIDO: Dispara o evento específico passado pela página
  useEffect(() => {
    // Se já rastreou ou não foi passado um nome de evento, ignora
    if (trackedRef.current || !viewEventName) return;

    if (typeof window !== "undefined") {
      // Prioriza GTAG para garantir envio rápido
      if ((window as any).gtag) {
        (window as any).gtag("event", viewEventName, {
          category: "creatina",
          total_products: products.length
        });
      } 
      // Fallback para DataLayer
      else {
        (window as any).dataLayer = (window as any).dataLayer || [];
        (window as any).dataLayer.push({
          event: viewEventName,
          category: "creatina",
          total_products: products.length
        });
      }
    }

    trackedRef.current = true;
  }, [products, viewEventName]);

  // ♾️ Lógica de Infinite Scroll com Intersection Observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const firstEntry = entries[0];

        // Se o sentinela entrar na viewport, carregamos mais 20 produtos
        if (firstEntry.isIntersecting && products.length > visibleCount) {
          setVisibleCount((prev) => prev + 20);
        }
      },
      { 
        threshold: 0.1,
        // rootMargin de 200px faz o carregamento começar ANTES do usuário chegar no fim
        rootMargin: "200px" 
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
    <section className="flex-1 space-y-4">
      {/* Listagem de Cards */}
      {visibleProducts.map((product, index) => (
        <MobileProductCard
          key={product.id}
          product={product}
          isBest={index === 0}
          /* ⚡ ESTRATÉGIA LCP: 
              Apenas os 3 primeiros produtos recebem prioridade de carregamento de imagem.
          */
          priority={index < 3} 
        />
      ))}

      {/* Indicador de Carregamento (Sentinela) */}
      {hasMore && (
        <div
          ref={loadMoreRef}
          className="h-28 flex items-center justify-center"
        >
          <div className="flex flex-col items-center gap-2">
            <div className="w-6 h-6 border-2 border-zinc-300 border-t-blue-500 rounded-full animate-spin" />
            <p className="text-[12px] text-zinc-600 font-medium">
              Buscando mais ofertas...
            </p>
          </div>
        </div>
      )}

      {/* Estado Vazio (Zero Results) com Cores de Alto Contraste */}
      {products.length === 0 && (
        <div className="text-center py-20 bg-white rounded-xl border border-dashed border-zinc-300 mx-1">
          <p className="text-zinc-500 text-[14px]">
            Nenhum suplemento encontrado com estes filtros.
          </p>
        </div>
      )}
    </section>
  );
}