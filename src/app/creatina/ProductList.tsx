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
  avgPrice?: number | null; // Ajustado: Nome simplificado para "Média"
  isLowestPrice?: boolean;  // Adicionado: Flag para o selo "Menor preço em 30 dias"
  rating?: number;
  reviewsCount?: number;
};

export function ProductList({ products }: { products: Product[] }) {
  // 🚀 PERFORMANCE RADICAL: 
  // Iniciamos com 3 itens. Isso minimiza o tempo de execução do JavaScript inicial 
  // e reduz o peso do DOM, melhorando o FCP (First Contentful Paint).
  const [visibleCount, setVisibleCount] = useState(3);

  // Elemento invisível que serve como gatilho para carregar mais itens
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // 🔁 Resetar a contagem sempre que a lista de produtos (filtros) mudar
  useEffect(() => {
    setVisibleCount(3);
  }, [products]);

  // ⚠️ NOTA: O useEffect de Analytics foi removido daqui para evitar conflito.
  // O evento correto (view_creatina_list) agora é disparado exclusivamente
  // pelo componente TrackCreatinaView no arquivo page.tsx.

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
              Isso remove o atraso de descoberta do navegador para o conteúdo "Above the Fold".
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