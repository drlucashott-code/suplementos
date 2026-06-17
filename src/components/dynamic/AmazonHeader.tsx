"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Search } from "lucide-react";
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

  function handleBack() {
    if (typeof window === "undefined") {
      router.replace("/");
      return;
    }

    const historyState = window.history.state as { idx?: number } | null;

    if (typeof historyState?.idx === "number") {
      if (historyState.idx > 0) {
        router.back();
        return;
      }

      router.replace("/");
      return;
    }

    try {
      if (document.referrer) {
        const referrerUrl = new URL(document.referrer);

        if (referrerUrl.origin === window.location.origin) {
          router.back();
          return;
        }
      }
    } catch {
      // Ignore invalid referrer URLs and fall back to the home page.
    }

    router.replace("/");
  }

  return (
    <>
      {/* MOBILE: header original (sem alterações) */}
      <header className="sticky top-0 z-40 w-full bg-[#232f3e] text-white shadow-md lg:hidden">
        <div className="mx-auto flex h-14 max-w-[1200px] items-center gap-2 px-3">
          <button
            onClick={handleBack}
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
          <SiteNotificationsBell />
          <SiteUserEntry compact />
        </div>
      </header>

      {/* DESKTOP: header novo (estilo Amazon) */}
      <header className="sticky top-0 z-40 hidden w-full bg-[#131921] text-white shadow-md lg:block">
        <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-3 px-3">
          <Link
            href="/"
            onClick={(event) => {
              if (pathname === "/") {
                event.preventDefault();
                window.scrollTo({ top: 0 });
                router.refresh();
                const header = event.currentTarget.closest("header");
                const content = header?.nextElementSibling as HTMLElement | null;
                if (content) {
                  content.style.animation = "none";
                  void content.offsetWidth;
                  content.style.animation = "refresh-flash 0.5s ease";
                }
              }
            }}
            className="flex flex-shrink-0 select-none items-baseline rounded px-1 text-[24px] font-bold leading-none tracking-tight"
            aria-label="amazonpicks - inicio"
          >
            <span>amazon</span>
            <span className="text-[#febd69]">picks</span>
          </Link>

          <form
            onSubmit={handleSearch}
            className="flex flex-1 items-stretch overflow-hidden rounded-md shadow-sm"
            role="search"
          >
            <div className="flex flex-1 items-center bg-white px-3">
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
