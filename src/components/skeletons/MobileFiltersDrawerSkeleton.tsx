"use client";

/**
 * MobileFiltersDrawerSkeleton
 * Versão corrigida: utiliza larguras estáticas para evitar Math.random()
 * garantindo paridade entre Server e Client (Hydration Fix).
 */
export function MobileFiltersDrawerSkeleton() {
  // Array de larguras fixas para simular o efeito visual de tags variadas
  const skeletonWidths = [
    "80px", "65px", "90px", "70px", "85px", "60px", 
    "95px", "75px", "88px", "62px", "82px", "78px"
  ];

  return (
    <>
      {/* Overlay Estático: Fundo escurecido */}
      <div className="fixed inset-0 bg-black/60 z-[60]" aria-hidden="true" />

      {/* Drawer Container */}
      <div 
        className="fixed bottom-0 left-0 right-0 z-[70] bg-white rounded-t-2xl flex flex-col overflow-hidden shadow-2xl" 
        style={{ height: "85vh", fontFamily: "Arial, sans-serif" }}
      >
        
        {/* Header Skeleton: Botão de fechar e Título */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-200 bg-[#f0f2f2] animate-pulse">
          <div className="h-5 bg-zinc-300 rounded w-24" />
          <div className="h-8 w-8 bg-zinc-300 rounded-full" />
        </div>

        {/* Corpo do Filtro (Layout de Duas Colunas Estilo Amazon) */}
        <div className="flex flex-1 overflow-hidden">
          
          {/* Navegação Lateral Skeleton */}
          <nav className="w-[130px] bg-[#f0f2f2] border-r border-zinc-200 animate-pulse overflow-y-auto">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="px-4 py-5 border-b border-zinc-100 flex items-center">
                 <div className="h-3 bg-zinc-300 rounded w-full" />
              </div>
            ))}
          </nav>

          {/* Área de Opções (Tags) Skeleton */}
          <div className="flex-1 p-4 bg-white overflow-hidden animate-pulse">
            <div className="flex flex-wrap gap-2 content-start">
              {skeletonWidths.map((width, i) => (
                <div 
                  key={i} 
                  className="h-9 bg-zinc-100 border border-zinc-200 rounded-lg"
                  style={{ width }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Rodapé Skeleton: Botões de Ação */}
        <div className="p-3 bg-white border-t border-zinc-200 flex items-center gap-3 pb-8 animate-pulse">
          <div className="flex-1 h-12 bg-zinc-200 rounded-full" />
          <div className="flex-[2] h-12 bg-zinc-200 rounded-full" />
        </div>
      </div>
    </>
  );
}