export function FloatingFiltersBarSkeleton() {
  return (
    <div className="sticky top-14 z-30 bg-white border-b border-zinc-200 py-2 px-3 shadow-sm h-[58px]">
      <div className="flex items-center gap-3 max-w-[1200px] mx-auto animate-pulse">
        
        {/* Botão de Filtros (Quadrado arredondado) */}
        <div className="w-[42px] h-[42px] bg-gray-200 rounded-lg flex-shrink-0" />

        {/* Bloco de Classificação */}
        <div className="flex-1 flex items-center gap-2">
          {/* Label "Classificar:" */}
          <div className="h-3 bg-gray-200 rounded w-16" />
          
          {/* Select Placeholder */}
          <div className="flex-1 h-[38px] bg-gray-100 border border-gray-200 rounded-lg" />
        </div>
      </div>
    </div>
  );
}