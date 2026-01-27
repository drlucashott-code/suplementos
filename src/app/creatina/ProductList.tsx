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
  avg30Price?: number | null;
  rating?: number;
  reviewsCount?: number;
};

export function ProductList({ products }: { products: Product[] }) {
  // ✅ Começa com 5 produtos para priorizar o carregamento inicial
  const [visibleCount, setVisibleCount] = useState(5);
  const trackedRef = useRef(false);

  // Elemento sentinela para infinite scroll
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // 🔁 Resetar a contagem quando os filtros mudarem
  useEffect(() => {
    setVisibleCount(5);
    trackedRef.current = false;
  }, [products]);

  // 📊 Tracking de Analytics (Visualização da Lista)
  useEffect(() => {
    if (trackedRef.current || !products.length) return;

    if (typeof window !== "undefined" && "gtag" in window) {
      // @ts-ignore
      window.gtag("event", "view_product_list", {
        total_products: products.length,
        best_product_name: products[0]?.name,
      });
    }

    trackedRef.current = true;
  }, [products]);

  // ♾️ Lógica de Infinite Scroll progressivo
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const firstEntry = entries[0];

        if (firstEntry.isIntersecting && products.length > visibleCount) {
          // ✅ Carrega mais 20 produtos por vez ao rolar
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
          // 🔥 RESOLUÇÃO DO ERRO DE BUILD:
          // Agora passamos obrigatoriamente a prop priority.
          // Os 3 primeiros itens do ranking atual recebem prioridade de carregamento (LCP).
          priority={index < 3} 
        />
      ))}

      {/* Elemento invisível que dispara o carregamento de mais itens */}
      {hasMore && (
        <div
          ref={loadMoreRef}
          className="h-20 flex items-center justify-center"
        >
          <div className="flex flex-col items-center gap-2">
            <div className="w-6 h-6 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
            <p className="text-[12px] text-gray-500">
              A carregar mais resultados...
            </p>
          </div>
        </div>
      )}

      {/* Estado vazio quando os filtros não retornam nada */}
      {products.length === 0 && (
        <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-300">
          <p className="text-gray-500">
            Nenhum produto encontrado com estes filtros.
          </p>
        </div>
      )}
    </section>
  );
}