"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import SiteUserEntry, { type SessionUser } from "@/components/SiteUserEntry";
import SiteNotificationsBell from "@/components/SiteNotificationsBell";
import {
  buildSearchCategories,
  filterCategorySuggestions,
  resolveCategoryTarget,
  type CategorySuggestion,
  type ExtraCategory,
} from "@/lib/client/categorySearch";

export type HeaderClientProps = {
  extraCategories?: ExtraCategory[];
  initialUser?: SessionUser | null;
};

export default function HeaderClient({
  extraCategories = [],
  initialUser,
}: HeaderClientProps) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<CategorySuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const router = useRouter();
  const wrapperRef = useRef<HTMLDivElement>(null);

  const categories = useMemo(
    () => buildSearchCategories(extraCategories),
    [extraCategories]
  );

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);

    if (value.length > 0) {
      setSuggestions(filterCategorySuggestions(value, categories));
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();

    if (!query.trim()) return;

    const targetPath = resolveCategoryTarget(query, categories);

    if (targetPath) {
      router.push(`${targetPath}?q=${encodeURIComponent(query)}`);
    } else if (suggestions.length > 0) {
      router.push(suggestions[0].path);
    } else {
      console.warn("Categoria não identificada para a busca:", query);
    }

    setShowSuggestions(false);
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-[#131921] px-3 py-3 shadow-md md:px-4">
      <div className="mx-auto max-w-[1500px]">
        <div className="flex shrink-0 cursor-pointer items-center" onClick={() => router.push("/")}>
          <h1 className="text-[24px] font-bold tracking-tight text-white">
            amazon<span className="text-[#febd69]">picks</span>
          </h1>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <div className="relative min-w-0 flex-1" ref={wrapperRef}>
            <form onSubmit={handleSearch} className="flex w-full items-center">
              <input
                type="text"
                value={query}
                onChange={handleInputChange}
                onFocus={() => query.length > 0 && setShowSuggestions(true)}
                placeholder="O que você está procurando?"
                className="h-11 w-full rounded-l-md border-none bg-white px-4 text-[16px] text-black outline-none"
              />
              <button
                type="submit"
                className="flex h-11 w-12 items-center justify-center rounded-r-md border-l border-zinc-200 bg-white text-[#232f3e] transition-colors hover:bg-zinc-50"
                aria-label="Buscar"
              >
                <Search className="h-5 w-5" />
              </button>
            </form>

            {showSuggestions && suggestions.length > 0 ? (
              <div className="absolute left-0 top-[46px] z-[100] w-full overflow-hidden rounded-md border border-gray-200 bg-white shadow-xl">
                {suggestions.map((cat) => (
                  <div
                    key={`${cat.path}-${cat.name}`}
                    onClick={() => {
                      router.push(cat.path);
                      setQuery("");
                      setShowSuggestions(false);
                    }}
                    className="flex cursor-pointer items-center gap-2 border-b px-4 py-3 text-sm text-gray-800 hover:bg-gray-100 last:border-none"
                  >
                    <Search className="h-4 w-4 text-gray-400" />
                    <span>{cat.name}</span>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <SiteNotificationsBell />
          <SiteUserEntry compact initialUser={initialUser} />
        </div>
      </div>
    </header>
  );
}
