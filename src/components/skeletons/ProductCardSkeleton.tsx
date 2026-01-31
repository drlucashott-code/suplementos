export function ProductCardSkeleton() {
  return (
    <div className="bg-white border border-zinc-200 rounded-xl p-3 flex flex-col h-full animate-pulse">
      {/* Área da Imagem (Quadrado Cinza) */}
      <div className="w-full aspect-square bg-zinc-200 rounded-lg mb-3" />

      {/* Linhas de Texto */}
      <div className="space-y-2 flex-1">
        <div className="h-3.5 bg-zinc-200 rounded w-full" /> {/* Título linha 1 */}
        <div className="h-3.5 bg-zinc-200 rounded w-2/3" />  {/* Título linha 2 */}
        
        <div className="h-3 bg-zinc-100 rounded w-1/3 mt-3" /> {/* Selo Sabor/Peso */}
      </div>

      {/* Preço e Botão */}
      <div className="mt-4 space-y-2">
        <div className="h-6 bg-zinc-200 rounded w-1/2" /> {/* Preço */}
        <div className="h-9 bg-zinc-200 rounded-full w-full" /> {/* Botão */}
      </div>
    </div>
  );
}