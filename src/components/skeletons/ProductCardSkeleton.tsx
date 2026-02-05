"use client";

export function ProductSkeleton() {
  return (
    <div className="flex gap-3 border-b border-gray-100 bg-white relative items-stretch min-h-[290px] animate-pulse font-sans">
      
      {/* Simulação do Selo % OFF */}
      <div className="absolute top-3 left-0 z-10 bg-gray-200 h-5 w-14 rounded-r-sm" />

      {/* Coluna da Imagem (Sincronizada com o novo padrão w-[130px]) */}
      <div className="w-[130px] bg-white flex-shrink-0 flex items-center justify-center p-2 relative">
        <div className="absolute inset-2 bg-zinc-50 rounded-lg -z-10" />
        <div className="w-full h-32 bg-gray-200 rounded-md" />
      </div>

      {/* Coluna de Informações */}
      <div className="flex flex-col flex-1 pr-3 py-3">
        
        {/* Título (2 linhas para bater com line-clamp-2) */}
        <div className="space-y-2 mb-2">
          <div className="h-4 bg-gray-200 rounded w-full" />
          <div className="h-4 bg-gray-200 rounded w-3/4" />
        </div>

        {/* Avaliações */}
        <div className="flex items-center gap-1 mb-2">
          <div className="h-3 bg-gray-200 rounded w-6" />
          <div className="h-3 bg-gray-200 rounded w-20" />
          <div className="h-3 bg-gray-200 rounded w-10" />
        </div>

        {/* Sabor e Doses / Unidades */}
        <div className="h-3 bg-gray-200 rounded w-1/2 mb-3" />

        {/* --- NOVO: Placeholder da TABELA TÉCNICA --- */}
        <div className="bg-zinc-50 border border-zinc-100 rounded p-2 mb-3">
           <div className="h-2 bg-gray-200 rounded w-2/3 mx-auto mb-3" />
           <div className="flex justify-around">
              <div className="h-4 bg-gray-200 rounded w-10" />
              <div className="h-4 bg-gray-200 rounded w-10" />
           </div>
        </div>

        {/* Selo de Menor Preço (30d/7d) */}
        <div className="h-5 bg-gray-200 rounded-sm w-36 mb-3" />

        {/* Bloco de Preço Estilo Amazon */}
        <div className="mt-auto space-y-2">
          {/* Simulação do "De: R$ ..." + Tooltip */}
          <div className="flex items-center gap-2">
             <div className="h-3 bg-gray-200 rounded w-20" />
             <div className="h-3 bg-gray-200 rounded-full w-3" />
          </div>

          <div className="flex items-baseline gap-1">
            <div className="h-4 bg-gray-200 rounded w-4" />
            <div className="h-8 bg-gray-200 rounded w-20" />
            <div className="h-4 bg-gray-200 rounded w-5" />
          </div>
          
          {/* Custo por grama/dose */}
          <div className="h-3 bg-gray-200 rounded w-32" />
        </div>

        {/* Rodapé: Prime + Botão */}
        <div className="mt-3 flex items-center justify-between gap-2">
            {/* Prime */}
            <div className="h-4 bg-gray-200 rounded w-14" />
            
            {/* Botão Amazon */}
            <div className="h-8 bg-gray-200 rounded-full w-28 flex-shrink-0" />
        </div>
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