"use client";

export function ProductSkeleton() {
  return (
    <div className="flex gap-3 border-b border-gray-100 bg-white relative items-stretch min-h-[290px] animate-pulse font-sans">
      
      {/* Selo % OFF */}
      <div className="absolute top-4 left-0 z-10 bg-gray-200 h-5 w-16 rounded-r-sm" />

      {/* Coluna da Imagem (PADRÃO CREATINA) */}
      <div className="w-[140px] bg-[#f3f3f3] flex-shrink-0 flex items-center justify-center p-2 relative">
        <div className="w-full h-[180px] bg-gray-200 rounded-sm" />
      </div>

      {/* Coluna de Informações */}
      <div className="flex flex-col flex-1 pr-2 py-4">
        
        {/* Título */}
        <div className="space-y-2 mb-2">
          <div className="h-4 bg-gray-200 rounded w-full" />
          <div className="h-4 bg-gray-200 rounded w-4/5" />
          <div className="h-4 bg-gray-200 rounded w-3/5" />
        </div>

        {/* Avaliações */}
        <div className="flex items-center gap-2 mb-2">
          <div className="h-3 bg-gray-200 rounded w-8" />
          <div className="h-3 bg-gray-200 rounded w-16" />
          <div className="h-3 bg-gray-200 rounded w-10" />
        </div>

        {/* Sabor / doses */}
        <div className="h-3 bg-gray-200 rounded w-1/2 mb-2" />

        {/* TABELA TÉCNICA (IGUAL AO CARD REAL) */}
        <div className="bg-white border border-zinc-200 rounded p-2 mb-2">
          <div className="h-2 bg-gray-200 rounded w-2/3 mx-auto mb-2" />
          <div className="flex justify-around pt-1">
            <div className="h-4 bg-gray-200 rounded w-12" />
            <div className="h-4 bg-gray-200 rounded w-12" />
            <div className="h-4 bg-gray-200 rounded w-12" />
          </div>
        </div>

        {/* Menor preço */}
        <div className="h-5 bg-gray-200 rounded-sm w-36 mb-2" />

        {/* Bloco de preço */}
        <div className="mt-auto space-y-2">
          <div className="flex items-center gap-2">
            <div className="h-3 bg-gray-200 rounded w-20" />
            <div className="h-3 bg-gray-200 rounded-full w-3" />
          </div>

          <div className="flex items-baseline gap-1">
            <div className="h-4 bg-gray-200 rounded w-4" />
            <div className="h-8 bg-gray-200 rounded w-24" />
            <div className="h-4 bg-gray-200 rounded w-6" />
          </div>

          <div className="h-3 bg-gray-200 rounded w-32" />
        </div>

        {/* Prime + botão */}
        <div className="mt-3 flex items-center justify-between gap-2">
          <div className="h-4 bg-gray-200 rounded w-14" />
          <div className="h-10 bg-gray-200 rounded-full w-32" />
        </div>
      </div>
    </div>
  );
}

export function ProductListSkeleton() {
  return (
    <div className="flex flex-col w-full">
      {[...Array(6)].map((_, i) => (
        <ProductSkeleton key={i} />
      ))}
    </div>
  );
}
