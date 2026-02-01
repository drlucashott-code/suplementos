"use client";

export function AmazonHeaderSkeleton() {
  return (
    <header className="bg-[#232f3e] sticky top-0 z-40 w-full shadow-md h-14">
      <div className="flex items-center px-3 h-full gap-2 max-w-[1200px] mx-auto animate-pulse">
        
        {/* Placeholder do Botão de Voltar */}
        <div className="w-8 h-8 bg-white/10 rounded-full flex-shrink-0" />

        {/* Placeholder da Barra de Busca */}
        <div className="flex-1 flex items-center bg-white/20 rounded-md h-9 px-3">
          {/* Ícone da Lupa */}
          <div className="w-5 h-5 bg-white/20 rounded-full mr-2 flex-shrink-0" />
          
          {/* Texto de placeholder */}
          <div className="w-32 h-4 bg-white/20 rounded" />
        </div>
      </div>
    </header>
  );
}