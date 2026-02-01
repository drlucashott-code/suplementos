"use client";

export function ProductSkeleton() {
  return (
    <div className="flex gap-3 border-b border-gray-100 bg-white relative items-stretch min-h-[260px] animate-pulse">
      
      {/* Simulação do Selo % OFF */}
      <div className="absolute top-4 left-0 z-10 bg-gray-200 h-5 w-14 rounded-r-sm" />

      {/* Coluna da Imagem (Sincronizada com w-[140px]) */}
      <div className="w-[140px] bg-[#f3f3f3] flex-shrink-0 flex items-center justify-center p-2">
        <div className="w-full h-32 bg-gray-200 rounded-md" />
      </div>

      {/* Coluna de Informações */}
      <div className="flex flex-col flex-1 pr-2 py-4">
        
        {/* Título (3 linhas de placeholder) */}
        <div className="space-y-2 mb-2">
          <div className="h-4 bg-gray-200 rounded w-full" />
          <div className="h-4 bg-gray-200 rounded w-5/6" />
          <div className="h-4 bg-gray-200 rounded w-2/3" />
        </div>

        {/* Avaliações */}
        <div className="flex items-center gap-1 mb-2">
          <div className="h-3 bg-gray-200 rounded w-6" />
          <div className="h-3 bg-gray-200 rounded w-16" />
          <div className="h-3 bg-gray-200 rounded w-10" />
        </div>

        {/* Sabor e Doses */}
        <div className="h-3 bg-gray-200 rounded w-1/2 mb-3" />

        {/* Selo de Preço (30 dias) */}
        <div className="h-5 bg-gray-200 rounded-sm w-32 mb-3" />

        {/* Bloco de Preço */}
        <div className="space-y-2">
          <div className="flex items-baseline gap-1">
            <div className="h-4 bg-gray-200 rounded w-4" />
            <div className="h-8 bg-gray-200 rounded w-16" />
            <div className="h-4 bg-gray-200 rounded w-4" />
          </div>
          {/* Preço por grama */}
          <div className="h-3 bg-gray-200 rounded w-40" />
        </div>

        {/* Selo Prime */}
        <div className="h-4 bg-gray-200 rounded w-16 mt-3" />

        {/* Botão de Conversão (Arredondado como o original) */}
        <div className="mt-auto h-10 bg-gray-200 border border-gray-200 rounded-full w-full" />
      </div>
    </div>
  );
}

/**
 * Componente para preencher a lista de produtos (ex: 6 itens)
 */
export function ProductListSkeleton() {
  return (
    <div className="flex flex-col w-full">
      {[...Array(6)].map((_, i) => (
        <ProductSkeleton key={i} />
      ))}
    </div>
  );
}