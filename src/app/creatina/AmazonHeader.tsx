"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Search } from "lucide-react";
import { useState, useEffect } from "react";

export function AmazonHeader() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [query, setQuery] = useState(searchParams.get("q") || "");

  useEffect(() => {
    setQuery(searchParams.get("q") || "");
  }, [searchParams]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());

    if (query.trim()) {
      params.set("q", query.trim());
    } else {
      params.delete("q");
    }

    router.push(`/creatina?${params.toString()}`);
  }

  return (
    <header className="bg-[#232f3e] text-white sticky top-0 z-40 w-full shadow-md">
      <div className="flex items-center px-3 h-14 gap-2 max-w-[1200px] mx-auto">
        
        <button
          onClick={() => router.back()}
          className="p-1 active:bg-white/10 rounded-full transition-colors flex-shrink-0"
          aria-label="Voltar para a página anterior"
        >
          <ArrowLeft className="w-6 h-6 stroke-[2.5px]" />
        </button>

        <form
          onSubmit={handleSearch}
          className="flex-1 flex items-center bg-white rounded-md px-3 py-1.5 shadow-inner"
          role="search"
        >
          <label htmlFor="creatina-search" className="sr-only">
            Pesquisar em Creatina
          </label>

          <Search className="w-5 h-5 text-zinc-500 mr-2 flex-shrink-0" />

          <input
            id="creatina-search"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Pesquisar em Creatinas"
            className="w-full bg-transparent text-[#0F1111] text-[16px] outline-none placeholder-zinc-500 font-normal"
            enterKeyHint="search"
            autoComplete="off"
          />
        </form>
      </div>
    </header>
  );
}
