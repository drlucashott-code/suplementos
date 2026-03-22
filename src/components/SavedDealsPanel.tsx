"use client";

import { Bookmark, X } from "lucide-react";
import { useEffect, useState } from "react";
import BestDealProductCard from "@/components/BestDealProductCard";
import type { SavedDeal } from "@/lib/client/savedDeals";
import { SAVED_DEALS_EVENT, getSavedDeals } from "@/lib/client/savedDeals";

export default function SavedDealsPanel({ onClose }: { onClose?: () => void }) {
  const [savedDeals, setSavedDeals] = useState<SavedDeal[]>([]);

  useEffect(() => {
    const sync = () => setSavedDeals(getSavedDeals());

    sync();
    window.addEventListener("storage", sync);
    window.addEventListener(SAVED_DEALS_EVENT, sync);

    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener(SAVED_DEALS_EVENT, sync);
    };
  }, []);

  return (
    <section className="rounded-2xl border border-[#d5d9d9] bg-white p-4 shadow-sm md:p-5">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#fff4d6] text-[#b77900]">
            <Bookmark className="h-4.5 w-4.5 fill-current" />
          </span>
          <div>
            <h2 className="text-[24px] font-bold text-[#0F1111]">Ofertas salvas</h2>
            <p className="mt-1 text-[13px] text-[#565959]">
              {savedDeals.length}{" "}
              {savedDeals.length === 1 ? "produto salvo" : "produtos salvos"} neste
              navegador.
            </p>
          </div>
        </div>

        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 transition hover:bg-gray-50 hover:text-[#0F1111]"
            aria-label="Fechar ofertas salvas"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      {savedDeals.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 bg-[#F8FAFA] px-4 py-10 text-center">
          <p className="text-[16px] font-bold text-[#0F1111]">Nenhuma oferta salva ainda.</p>
          <p className="mt-2 text-[13px] text-[#565959]">
            Use o ícone de salvar nos cards para montar sua seleção.
          </p>
        </div>
      ) : (
        <div className="grid max-h-[70vh] grid-cols-2 gap-3 overflow-y-auto pr-1 md:grid-cols-3 xl:grid-cols-5">
          {savedDeals.map((item) => (
            <BestDealProductCard
              key={item.asin}
              item={{ ...item, attributes: {} }}
              category="salvos"
            />
          ))}
        </div>
      )}
    </section>
  );
}
