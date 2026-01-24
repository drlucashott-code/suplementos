"use client";

export function MobileProductCard({ product, isBest }: { product: any; isBest?: boolean }) {
  const [int, cents] = product.price.toFixed(2).split(".");

  // Formatação para exibir (23,5 mil)
  const formattedCount = product.reviewsCount >= 1000 
    ? (product.reviewsCount / 1000).toFixed(1).replace('.', ',') + ' mil' 
    : product.reviewsCount;

  return (
    <div className="flex gap-3 border-b border-gray-100 bg-white relative items-stretch min-h-[240px]">
      {/* Selo de Desconto */}
      {product.discountPercent && (
        <div className="absolute top-4 left-0 z-10 bg-[#CC0C39] text-white text-[11px] font-bold px-2 py-0.5 rounded-r-sm shadow-sm">
          {product.discountPercent}% OFF
        </div>
      )}

      {/* Coluna da Imagem com Fundo Cinza Vertical */}
      <div className="w-[140px] bg-[#f3f3f3] flex-shrink-0 flex items-center justify-center p-2">
        <img 
          src={product.imageUrl} 
          alt={product.name} 
          className="max-h-[180px] max-w-full object-contain mix-blend-multiply" 
        />
      </div>

      {/* Coluna de Informações */}
      <div className="flex flex-col flex-1 pr-2 py-4">
        <h2 className="text-[14px] text-[#0F1111] leading-tight line-clamp-3 mb-1 font-normal">
          {product.name}
        </h2>

        {/* Avaliações Dinâmicas */}
        <div className="flex items-center gap-1 mb-1 text-[12px]">
          <span className="font-normal text-[#0F1111]">{product.rating.toFixed(1)}</span>
          <div className="flex text-[#e47911] text-[10px] tracking-tighter">
            {[...Array(5)].map((_, i) => (
              <span key={i}>
                {i < Math.floor(product.rating) ? "★" : "☆"}
              </span>
            ))}
          </div>
          <span className="text-[#007185]">({formattedCount})</span>
        </div>

        {/* Informações Extras */}
        <div className="flex flex-wrap gap-x-2 text-[12px] text-[#565959] mb-1">
          {product.flavor && <span>Sabor: <b className="text-[#0F1111] font-medium">{product.flavor}</b></span>}
          <span>•</span>
          <span>Rendimento: <b className="text-[#0F1111] font-medium">{Math.floor(product.doses)} doses</b></span>
        </div>

        {/* Bloco de Preço Completo */}
        <div className="flex flex-col mt-1">
          <div className="flex items-start">
            <span className={`text-[11px] mt-1 font-medium ${product.discountPercent ? 'text-[#CC0C39]' : ''}`}>R$</span>
            <span className={`text-3xl font-medium tracking-tighter leading-none ${product.discountPercent ? 'text-[#CC0C39]' : ''}`}>
              {int}
            </span>
            <span className={`text-[11px] mt-1 font-medium ${product.discountPercent ? 'text-[#CC0C39]' : ''}`}>
              {cents}
            </span>
          </div>
          
          {/* Preço por Grama */}
          <p className="text-[12px] text-[#565959]">
            (R$ {product.pricePerGram.toFixed(2)} / grama)
          </p>

          {/* Comparativo 30 dias (DE VOLTA AQUI) */}
          {product.avg30Price && product.discountPercent && (
            <p className="text-[11px] text-[#565959] mt-0.5">
              Média de 30 dias: <span className="line-through">R$ {product.avg30Price.toFixed(2)}</span>
            </p>
          )}
        </div>

        {/* Selo Prime (Laranja e Azul) */}
        <div className="mt-1 flex items-center gap-1">
          <span className="font-black italic text-[14px] leading-none">
            <span className="not-italic text-[16px] text-[#FEBD69] mr-0.5">✓</span>
            <span className="text-[#00A8E1]">prime</span>
          </span>
        </div>

        {/* Botão Amazon */}
        <a 
          href={product.affiliateUrl}
          target="_blank"
          className="mt-auto bg-[#FFD814] border border-[#FCD200] rounded-full py-2 text-[13px] text-center font-medium shadow-sm hover:bg-[#F7CA00] active:scale-95 transition-transform text-[#0F1111]"
        >
          Ver na Amazon
        </a>
      </div>
    </div>
  );
}