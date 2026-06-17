"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import Link from "next/link";
import { Search } from "lucide-react";
import { useEffect, useState } from "react";
import SiteUserEntry from "@/components/SiteUserEntry";
import SiteNotificationsBell from "@/components/SiteNotificationsBell";

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
    <>
      <header className="sticky top-0 z-40 w-full bg-[#131921] text-white shadow-md">
        <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-2 px-3 md:gap-3">
          <Link
            href="/"
            className="flex flex-shrink-0 select-none items-baseline rounded px-1 text-[20px] font-bold leading-none tracking-tight sm:text-[22px]"
            aria-label="amazonpicks - inicio"
          >
            <span>amazon</span>
            <span className="text-[#FF9900]">picks</span>
          </Link>

          <form
            onSubmit={handleSearch}
            className="flex flex-1 items-stretch overflow-hidden rounded-md shadow-sm"
            role="search"
          >
            <div className="flex flex-1 items-center bg-white px-3">
              <Search className="mr-2 h-5 w-5 flex-shrink-0 text-zinc-500" aria-hidden="true" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Pesquisar nesta categoria..."
                className="w-full bg-transparent py-1.5 text-[16px] font-normal text-[#0F1111] outline-none placeholder-zinc-500"
                enterKeyHint="search"
              />
            </div>
            <button
              type="submit"
              className="flex flex-shrink-0 items-center justify-center bg-[#FEBD69] px-4 text-[#0F1111] transition hover:bg-[#F3A847]"
              aria-label="Buscar"
            >
              <Search className="h-5 w-5 stroke-[2.5px]" />
            </button>
          </form>

          <SiteNotificationsBell />
          <SiteUserEntry compact />
        </div>
      </header>
    </>
  );
}
