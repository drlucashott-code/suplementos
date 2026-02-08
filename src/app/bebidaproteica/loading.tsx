import { AmazonHeaderSkeleton } from "@/components/skeletons/AmazonHeaderSkeleton";
import { FloatingFiltersBarSkeleton } from "@/components/skeletons/FloatingFiltersBarSkeleton";
import { ProductListSkeleton } from "@/components/skeletons/ProductCardSkeleton";

/**
 * Loading State para Bebida Proteica
 * Mantém a consistência visual com as outras categorias (Whey, Creatina)
 * utilizando os mesmos componentes de skeleton.
 */
export default function Loading() {
  return (
    <main className="bg-[#EAEDED] min-h-screen">
      {/* Skeleton do Topo (Barra de busca e navegação) */}
      <AmazonHeaderSkeleton />

      <div className="max-w-[1200px] mx-auto">
        {/* Skeleton da barra de filtros rápidos (Preço, Ordenação) */}
        <FloatingFiltersBarSkeleton />

        <div className="px-3">
          {/* Skeleton do contador de resultados (ex: "Buscando produtos...") */}
          <div className="mt-4 mb-2 px-1">
            <div className="h-4 bg-gray-200 rounded w-56 animate-pulse" />
          </div>

          {/* Lista de Cards de Produto vazios/pulsantes */}
          <ProductListSkeleton />
        </div>
      </div>
    </main>
  );
}