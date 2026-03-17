"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { ArrowLeft, Search, Camera } from "lucide-react";
import { useEffect, useState } from "react";

export function AmazonHeader() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const urlQuery = searchParams.get("q") || "";
  const [query, setQuery] = useState(urlQuery);

  useEffect(() => {
    setQuery(urlQuery);
  }, [urlQuery]);

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
    <header className="sticky top-0 z-40 w-full bg-[#131921] text-white shadow-sm">
      <div className="mx-auto flex h-[68px] max-w-[1200px] items-center gap-3 px-3">
        <button
          onClick={() => router.back()}
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full active:bg-white/10"
          aria-label="Voltar"
        >
          <ArrowLeft className="h-6 w-6 stroke-[2.4px]" />
        </button>

        <form
          onSubmit={handleSearch}
          className="flex h-[46px] flex-1 items-center rounded-full bg-white pl-4 pr-3 shadow-[0_1px_2px_rgba(0,0,0,0.18)]"
          role="search"
        >
          <Search
            className="mr-3 h-5 w-5 flex-shrink-0 text-[#0F1111]"
            aria-hidden="true"
          />

          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Pesquisar produtos"
            className="w-full bg-transparent text-[15px] text-[#0F1111] outline-none placeholder:text-[#666]"
            enterKeyHint="search"
          />

          <button
            type="submit"
            className="ml-2 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-[#0F1111] active:bg-zinc-100"
            aria-label="Buscar"
          >
            <Camera className="h-5 w-5" />
          </button>
        </form>
      </div>
    </header>
  );
}
