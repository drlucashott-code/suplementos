"use client";

import HeaderClient from "@/components/HeaderClient";
import BestDealProductCard from "@/components/BestDealProductCard";
import Link from "next/link";
import { useEffect, useState } from "react";
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
  const averagePrice30d = item.product.averagePrice30d ?? item.product.totalPrice;
  const discountPercent =
    averagePrice30d > item.product.totalPrice
      ? Math.round(((averagePrice30d - item.product.totalPrice) / averagePrice30d) * 100)
      : 0;

  return {
    id: item.product.id,
    asin: item.product.asin,
    name: item.product.name,
    imageUrl: item.product.imageUrl ?? "",
    url: item.product.url,
    totalPrice: item.product.totalPrice,
    averagePrice30d,
    discountPercent,
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

export default function SavedDealsPage() {
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
    <main className="min-h-screen bg-[#E3E6E6] pb-10">
      <HeaderClient />

      <div className="mx-auto max-w-[1500px] px-3 py-4 md:px-5">
        <section className="rounded-2xl border border-[#d5d9d9] bg-white p-4 shadow-sm md:p-5">
          <div className="mb-5">
            <h1 className="text-[24px] font-bold text-[#0F1111]">Ofertas salvas</h1>
            <p className="mt-1 text-[13px] text-[#565959]">
              {savedDeals.length} {savedDeals.length === 1 ? "produto salvo" : "produtos salvos"} na sua conta.
            </p>
          </div>

          {!authenticated ? (
            <div className="rounded-xl border border-dashed border-gray-200 bg-[#F8FAFA] px-4 py-10 text-center">
              <p className="text-[16px] font-bold text-[#0F1111]">Entre para usar favoritos.</p>
              <p className="mt-2 text-[13px] text-[#565959]">
                Agora os produtos salvos ficam vinculados à sua conta, não mais ao navegador.
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
                Use o botão Salvar nos cards para acompanhar os produtos pela sua conta.
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
