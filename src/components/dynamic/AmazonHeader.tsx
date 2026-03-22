"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { ArrowLeft, Search } from "lucide-react";
import { useState } from "react";
import SavedDealsLink from "@/components/SavedDealsLink";

export function AmazonHeader() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const urlQuery = searchParams.get("q") || "";
  const [query, setQuery] = useState(urlQuery);
  const [prevUrlQuery, setPrevUrlQuery] = useState(urlQuery);

  if (urlQuery !== prevUrlQuery) {
    setQuery(urlQuery);
    setPrevUrlQuery(urlQuery);
  }

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

        <div className="flex shrink-0 items-center">
          <SavedDealsLink />
        </div>
      </div>
    </header>
  );
}
