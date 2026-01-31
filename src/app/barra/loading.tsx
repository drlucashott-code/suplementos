import { AmazonHeader } from "../barra/AmazonHeader"; // Ajuste o caminho se necessário
import { ProductCardSkeleton } from "@/components/skeletons/ProductCardSkeleton";

export default function Loading() {
  return (
    <main className="bg-[#EAEDED] min-h-screen pb-10">
      {/* Mantemos o Header fixo para não dar um "pulo" na tela */}
      <AmazonHeader />

      <div className="max-w-[1200px] mx-auto">
        {/* Simula a barra de filtros no topo (Mobile/Desktop) */}
        <div className="sticky top-14 z-20 bg-white border-b border-zinc-200 py-3 px-3 shadow-sm mb-4">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-zinc-100 rounded-lg animate-pulse" /> {/* Botão Filtro */}
             <div className="flex-1 h-10 bg-zinc-100 rounded-lg animate-pulse" /> {/* Select Ordenação */}
          </div>
        </div>

        <div className="px-3">
          {/* Layout Grid (Igual ao da Home) */}
          <div className="flex flex-col lg:flex-row gap-6 mt-4">
            
            {/* Esqueleto da Sidebar (Só aparece no Desktop) */}
            <div className="hidden lg:block w-64 space-y-4">
               <div className="h-screen bg-white rounded-xl border border-zinc-200 animate-pulse" />
            </div>

            {/* A Grade de Produtos Carregando */}
            <div className="w-full">
               <div className="h-4 bg-zinc-200 rounded w-48 mb-4 animate-pulse" /> {/* "X produtos encontrados" */}

               {/* Grid Responsivo: 2 colunas no mobile, até 5 no desktop */}
               <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                 {/* Geramos 8 esqueletos para preencher a tela */}
                 {Array.from({ length: 8 }).map((_, i) => (
                   <ProductCardSkeleton key={i} />
                 ))}
               </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}