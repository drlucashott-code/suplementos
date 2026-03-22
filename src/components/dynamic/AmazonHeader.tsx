"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { ArrowLeft, Bookmark, Search } from "lucide-react";
import { useEffect, useState } from "react";
import SavedDealsPanel from "@/components/SavedDealsPanel";
import { SAVED_DEALS_EVENT, getSavedDeals } from "@/lib/client/savedDeals";

export function AmazonHeader() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const urlQuery = searchParams.get("q") || "";
  const [query, setQuery] = useState(urlQuery);
  const [prevUrlQuery, setPrevUrlQuery] = useState(urlQuery);
  const [savedCount, setSavedCount] = useState(0);
  const [savedOpen, setSavedOpen] = useState(false);

  if (urlQuery !== prevUrlQuery) {
    setQuery(urlQuery);
    setPrevUrlQuery(urlQuery);
  }

  useEffect(() => {
    const sync = () => setSavedCount(getSavedDeals().length);

    sync();
    window.addEventListener("storage", sync);
    window.addEventListener(SAVED_DEALS_EVENT, sync);

    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener(SAVED_DEALS_EVENT, sync);
    };
  }, []);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());

    if (query.trim()) {
      params.set("q", query.trim());
    } else {
      params.delete("q");
    }

    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <>
      <header className="sticky top-0 z-40 w-full bg-[#232f3e] text-white shadow-md">
        <div className="mx-auto flex h-14 max-w-[1200px] items-center gap-2 px-3">
          <button
            onClick={() => router.back()}
            className="flex-shrink-0 rounded-full p-1 transition-colors active:bg-white/10"
            aria-label="Voltar"
          >
            <ArrowLeft className="h-6 w-6 stroke-[2.5px]" />
          </button>

          <form
            onSubmit={handleSearch}
            className="flex flex-1 items-center rounded-md bg-white px-3 py-1.5 shadow-inner"
            role="search"
          >
            <Search className="mr-2 h-5 w-5 flex-shrink-0 text-zinc-500" aria-hidden="true" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Pesquisar nesta categoria..."
              className="w-full bg-transparent text-[16px] font-normal text-[#0F1111] outline-none placeholder-zinc-500"
              enterKeyHint="search"
            />
          </form>

          <button
            type="button"
            onClick={() => setSavedOpen((current) => !current)}
            className={`relative inline-grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-md transition ${
              savedOpen
                ? "bg-[#f3a847] text-[#131921]"
                : "bg-[#febd69] text-[#131921] hover:bg-[#f3a847]"
            }`}
            aria-label={savedOpen ? "Fechar ofertas salvas" : "Abrir ofertas salvas"}
            aria-expanded={savedOpen}
          >
            <Bookmark className="h-5 w-5" />
            <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#131921] px-1 text-[10px] font-bold text-white">
              {savedCount}
            </span>
          </button>
        </div>
      </header>

      {savedOpen ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-[45] bg-black/35"
            aria-label="Fechar ofertas salvas"
            onClick={() => setSavedOpen(false)}
          />
          <div className="fixed inset-x-0 top-[88px] z-[50] px-3">
            <div className="mx-auto max-w-[1200px]">
              <div className="max-h-[calc(100vh-108px)] overflow-hidden rounded-2xl">
                <SavedDealsPanel onClose={() => setSavedOpen(false)} />
              </div>
            </div>
          </div>
        </>
      ) : null}
    </>
  );
}
