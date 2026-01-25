"use client";

export function MobileProductCard({
  product,
  isBest,
}: {
  product: any;
  isBest?: boolean;
}) {
  const hasPrice = typeof product.price === "number" && product.price > 0;
  const intCents = hasPrice ? product.price.toFixed(2).split(".") : null;

  const formattedCount = (product.reviewsCount ?? 0) >= 1000 
    ? (product.reviewsCount / 1000).toFixed(1).replace('.', ',') + ' mil' 
    : (product.reviewsCount ?? 0).toString();

  return (
    <div className="flex gap-3 border-b border-gray-100 bg-white relative items-stretch min-h-[250px]">
      {/* Selo de Desconto */}
      {product.discountPercent && (
        <div className="absolute top-4 left-0 z-10 bg-[#CC0C39] text-white text-[11px] font-bold px-2 py-0.5 rounded-r-sm shadow-sm">
          {product.discountPercent}% OFF
        </div>
      )}

      {/* Coluna da Imagem (Fundo Cinza Vertical) */}
      <div className="w-[140px] bg-[#f3f3f3] flex-shrink-0 flex items-center justify-center p-2">
        <img 
          src={product.imageUrl} 
          alt={product.name} 
          className="w-full h-full max-h-[200px] object-contain mix-blend-multiply" 
        />
      </div>

      {/* Coluna de Informações */}
      <div className="flex flex-col flex-1 pr-2 py-4">
        <h2 className="text-[14px] text-[#0F1111] leading-tight line-clamp-3 mb-1 font-normal">
          {product.name}
        </h2>

        {/* Avaliações */}
        <div className="flex items-center gap-1 mb-1 text-[12px]">
          <span className="font-normal text-[#0F1111]">{product.rating.toFixed(1)}</span>
          <div className="flex text-[#e47911] text-[10px] tracking-tighter">
            {[...Array(5)].map((_, i) => (
              <span key={i}>{i < Math.floor(product.rating) ? "★" : "☆"}</span>
            ))}
          </div>
          <span className="text-[#007185]">({formattedCount})</span>
        </div>

        {/* Informações Técnicas */}
        <div className="flex flex-col gap-1 mb-2">
          <div className="flex flex-wrap gap-x-2 text-[12px] text-[#565959]">
            {product.flavor && (
              <span>
                Sabor: <b className="text-[#0F1111] font-medium">{product.flavor}</b>
              </span>
            )}
            {product.numberOfDoses && (
              <>
                {product.flavor && <span>•</span>}
                <b className="text-[#0F1111] font-medium">
                  {Math.floor(product.numberOfDoses)} doses
                </b>
              </>
            )}
          </div>
          
          {/* Selos de Qualidade */}
          <div className="flex gap-2 mt-1">
            <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-200 font-bold uppercase tracking-tight">
              {product.proteinPercent.toFixed(0)}% Proteína
            </span>
            <span className="text-[10px] bg-gray-50 text-gray-600 px-1.5 py-0.5 rounded border border-gray-200 font-medium italic">
              {product.protein}g de proteína / dose
            </span>
          </div>
        </div>

        {/* Bloco de Preço */}
        <div className="flex flex-col mt-1">
          {hasPrice ? (
            <>
              <div className="flex items-start">
                <span className={`text-[11px] mt-1 font-medium ${product.discountPercent ? 'text-[#CC0C39]' : ''}`}>R$</span>
                <span className={`text-3xl font-medium tracking-tighter leading-none ${product.discountPercent ? 'text-[#CC0C39]' : ''}`}>
                  {intCents![0]}
                </span>
                <span className={`text-[11px] mt-1 font-medium ${product.discountPercent ? 'text-[#CC0C39]' : ''}`}>
                  {intCents![1]}
                </span>
              </div>
              
              {/* Preço por grama de proteína em CINZA (#565959) */}
              <p className="text-[12px] text-[#565959] font-normal mt-0.5">
                (R$ {product.pricePerGramProtein.toFixed(2)} / g de proteína)
              </p>

              {product.avg30Price && product.discountPercent && (
                <p className="text-[11px] text-[#565959] mt-0.5">
                  Média 30 dias: <span className="line-through">R$ {product.avg30Price.toFixed(2)}</span>
                </p>
              )}
            </>
          ) : (
            <p className="text-[13px] text-[#565959] italic">Preço indisponível</p>
          )}
        </div>

        {/* Selo Prime */}
        <div className="mt-2 flex items-center gap-1">
          <span className="font-black italic text-[14px] leading-none">
            <span className="not-italic text-[16px] text-[#FEBD69] mr-0.5">✓</span>
            <span className="text-[#00A8E1]">prime</span>
          </span>
        </div>

        {/* Botão Amazon */}
        <a 
          href={product.affiliateUrl} 
          target="_blank" 
          className="mt-auto bg-[#FFD814] border border-[#FCD200] rounded-full py-2 text-[13px] text-center font-medium shadow-sm active:scale-95 transition-transform text-[#0F1111]"
        >
          Ver na Amazon
        </a>
      </div>
    </div>
  );
}