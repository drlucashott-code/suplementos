import { AmazonHeaderSkeleton } from "@/components/skeletons/AmazonHeaderSkeleton";
import { ProductListSkeleton } from "@/components/skeletons/ProductCardSkeleton";

/**
 * Loading State para o Top 10 Ofertas
 * Ajustado para ser idêntico ao layout simplificado da page.tsx
 */
export default function Loading() {
  return (
    <main className="bg-[#EAEDED] min-h-screen">
      {/* Skeleton do Header com busca e botão voltar */}
      <AmazonHeaderSkeleton />

      {/* Ajustado para max-w-xl para alinhar perfeitamente com o 
        container de cards da página principal 
      */}
      <div className="max-w-xl mx-auto pt-4 px-2">
        
        {/* Removido o FloatingFiltersBarSkeleton e o contador de resultados 
          para manter o layout "limpo" como solicitado na página final.
        */}

        <div className="space-y-4">
          {/* Renderiza a lista de cards pulsantes. 
            Como é o Top 10, o skeleton cobrirá a área dos 10 itens.
          */}
          <ProductListSkeleton />
        </div>
      </div>
    </main>
  );
}