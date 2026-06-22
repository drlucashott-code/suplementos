"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import SiteUserEntry from "@/components/SiteUserEntry";
import SiteNotificationsBell from "@/components/SiteNotificationsBell";
import {
  buildSearchCategories,
  filterCategorySuggestions,
  resolveCategoryTarget,
  type CategorySuggestion,
  type ExtraCategory,
} from "@/lib/client/categorySearch";

type AmazonHeaderProps = {
  extraCategories?: ExtraCategory[];
};

export function AmazonHeader({ extraCategories = [] }: AmazonHeaderProps = {}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const urlQuery = searchParams.get("q") || "";
  const [query, setQuery] = useState(urlQuery);
  const [suggestions, setSuggestions] = useState<CategorySuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const categories = useMemo(
    () => buildSearchCategories(extraCategories),
    [extraCategories]
  );

  useEffect(() => {
    setQuery(urlQuery);
  }, [urlQuery]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    setQuery(value);

    if (value.length > 0) {
      setSuggestions(filterCategorySuggestions(value, categories));
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();

    const trimmed = query.trim();
    if (!trimmed) return;

    const targetPath = resolveCategoryTarget(query, categories);

    if (targetPath) {
      router.push(`${targetPath}?q=${encodeURIComponent(query)}`);
    } else if (suggestions.length > 0) {
      router.push(suggestions[0].path);
    } else {
      // Sem categoria correspondente: mantém a busca dentro da página atual (?q=).
      const params = new URLSearchParams(searchParams.toString());
      params.set("q", trimmed);
      router.push(`${pathname}?${params.toString()}`);
    }

    setShowSuggestions(false);
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
                const content = (header?.nextElementSibling ??
                  header?.parentElement?.nextElementSibling) as HTMLElement | null;
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

          <div className="relative flex flex-1 items-stretch" ref={wrapperRef}>
            <form
              onSubmit={handleSearch}
              className="flex w-full items-stretch overflow-hidden rounded-md shadow-sm"
              role="search"
            >
              <div className="flex flex-1 items-center bg-white px-3">
                <input
                  type="text"
                  value={query}
                  onChange={handleInputChange}
                  onFocus={() => query.length > 0 && setShowSuggestions(true)}
                  placeholder="O que você está procurando?"
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

            {showSuggestions && suggestions.length > 0 ? (
              <div className="absolute left-0 top-full z-[100] mt-1 w-full overflow-hidden rounded-md border border-gray-200 bg-white text-[#0F1111] shadow-xl">
                {suggestions.map((cat) => (
                  <button
                    type="button"
                    key={`${cat.path}-${cat.name}`}
                    onClick={() => {
                      router.push(cat.path);
                      setQuery("");
                      setShowSuggestions(false);
                    }}
                    className="flex w-full cursor-pointer items-center gap-2 border-b px-4 py-3 text-left text-sm text-gray-800 hover:bg-gray-100 last:border-none"
                  >
                    <Search className="h-4 w-4 text-gray-400" />
                    <span>{cat.name}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <SiteNotificationsBell />
          <SiteUserEntry compact />
        </div>
      </header>
    </>
  );
}
