"use client";

import Header from "@/app/Header";
import BestDealProductCard from "@/components/BestDealProductCard";
import type { SavedDeal } from "@/lib/client/savedDeals";
import { SAVED_DEALS_EVENT, getSavedDeals } from "@/lib/client/savedDeals";
import { useEffect, useState } from "react";

export default function SavedDealsPage() {
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
    <main className="min-h-screen bg-[#E3E6E6] pb-10">
      <Header />

      <div className="mx-auto max-w-[1500px] px-3 py-4 md:px-5">
        <section className="rounded-2xl border border-[#d5d9d9] bg-white p-4 shadow-sm md:p-5">
          <div className="mb-5">
            <h1 className="text-[24px] font-bold text-[#0F1111]">Ofertas salvas</h1>
            <p className="mt-1 text-[13px] text-[#565959]">
              {savedDeals.length} {savedDeals.length === 1 ? "produto salvo" : "produtos salvos"} neste navegador.
            </p>
          </div>

          {savedDeals.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 bg-[#F8FAFA] px-4 py-10 text-center">
              <p className="text-[16px] font-bold text-[#0F1111]">Nenhuma oferta salva ainda.</p>
              <p className="mt-2 text-[13px] text-[#565959]">
                Use o botão Salvar nos cards da home ou da página de ofertas.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
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
      </div>
    </main>
  );
}
