"use client";

import { useEffect, useState } from "react";
import TrackedDealLink from "@/components/TrackedDealLink";

// Barra fixa no rodapé (apenas mobile) com preço + CTA de afiliado.
// Aparece depois que o usuário rola um pouco, para não cobrir o conteúdo
// logo de cara. Padrão de CRO de marketplace.
export function ProductStickyCta({
  asin,
  href,
  productId,
  productName,
  totalPrice,
  category = "produto_detalhe",
}: {
  asin: string;
  href: string;
  productId: string;
  productName: string;
  totalPrice: number;
  category?: string;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 420);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (totalPrice <= 0) return null;

  const [whole, cents] = totalPrice.toFixed(2).split(".");

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-40 border-t border-[#D5D9D9] bg-white/95 px-4 pb-[env(safe-area-inset-bottom)] pt-2.5 shadow-[0_-6px_20px_rgba(0,0,0,0.10)] backdrop-blur transition-transform duration-300 lg:hidden ${
        visible ? "translate-y-0" : "translate-y-full"
      }`}
    >
      <div className="flex items-center gap-3 pb-2.5">
        <div className="flex items-end gap-1 font-variant-numeric-tabular leading-none text-[#0F1111]">
          <span className="pb-[3px] text-[12px]">R$</span>
          <span className="text-[22px] font-bold">{whole}</span>
          <span className="pb-[3px] text-[12px]">,{cents}</span>
        </div>
        <TrackedDealLink
          asin={asin}
          href={href}
          productId={productId}
          productName={productName}
          value={totalPrice}
          category={category}
          className="ml-auto flex flex-1 items-center justify-center rounded-[10px] border border-[#FCD200] bg-[#FFD814] px-4 py-3 text-center text-[15px] font-bold text-[#0F1111] shadow-sm transition hover:bg-[#F7CA00]"
        >
          Ver oferta na Amazon
        </TrackedDealLink>
      </div>
    </div>
  );
}
