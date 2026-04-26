"use client";

import Link from "next/link";
import { Bookmark, X } from "lucide-react";
import { useEffect, useState } from "react";
import BestDealProductCard from "@/components/BestDealProductCard";
import {
  ACCOUNT_FAVORITES_EVENT,
  fetchAccountFavorites,
  getCurrentSessionState,
  type AccountFavoriteCardItem,
} from "@/lib/client/accountFavorites";

type SavedDeal = {
  id: string;
  asin: string;
  name: string;
  imageUrl: string;
  url: string;
  totalPrice: number;
  averagePrice30d: number;
  discountPercent: number;
  ratingAverage: number | null;
  ratingCount: number | null;
  likeCount: number;
  dislikeCount: number;
  categoryName: string;
  categoryGroup: string;
  categorySlug: string;
  savedAt: string;
};

function mapAccountFavoriteToSavedDeal(item: AccountFavoriteCardItem): SavedDeal {
  return {
    id: item.product.id,
    asin: item.product.asin,
    name: item.product.name,
    imageUrl: item.product.imageUrl ?? "",
    url: item.product.url,
    totalPrice: item.product.totalPrice,
    averagePrice30d: item.product.averagePrice30d ?? item.product.totalPrice,
    discountPercent: 0,
    ratingAverage: item.product.ratingAverage,
    ratingCount: item.product.ratingCount,
    likeCount: 0,
    dislikeCount: 0,
    categoryName: item.product.category.name,
    categoryGroup: item.product.category.group,
    categorySlug: item.product.category.slug,
    savedAt: item.savedAt,
  };
}

export default function SavedDealsPanel({ onClose }: { onClose?: () => void }) {
  const [savedDeals, setSavedDeals] = useState<SavedDeal[]>([]);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    const sync = async () => {
      const session = await getCurrentSessionState();
      setAuthenticated(Boolean(session.authenticated));

      if (!session.authenticated) {
        setSavedDeals([]);
        return;
      }

      const favorites = await fetchAccountFavorites();
      setSavedDeals(favorites.map(mapAccountFavoriteToSavedDeal));
    };

    void sync();
    window.addEventListener(ACCOUNT_FAVORITES_EVENT, sync);

    return () => {
      window.removeEventListener(ACCOUNT_FAVORITES_EVENT, sync);
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
              {savedDeals.length} {savedDeals.length === 1 ? "produto salvo" : "produtos salvos"} na sua conta.
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

      {!authenticated ? (
        <div className="rounded-xl border border-dashed border-gray-200 bg-[#F8FAFA] px-4 py-10 text-center">
          <p className="text-[16px] font-bold text-[#0F1111]">Entre para salvar produtos.</p>
          <p className="mt-2 text-[13px] text-[#565959]">
            Os favoritos agora ficam vinculados à sua conta.
          </p>
          <Link
            href="/entrar"
            className="mt-4 inline-flex h-10 items-center rounded-xl bg-[#FFD814] px-4 text-sm font-black text-[#0F1111] transition hover:bg-[#F7CA00]"
          >
            Entrar
          </Link>
        </div>
      ) : savedDeals.length === 0 ? (
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
