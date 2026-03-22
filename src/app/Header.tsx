"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bookmark, Search } from "lucide-react";
import SavedDealsPanel from "@/components/SavedDealsPanel";
import { SAVED_DEALS_EVENT, getSavedDeals } from "@/lib/client/savedDeals";

const removeAccents = (str: string) => {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
};

type SearchCategory = {
  name: string;
  path: string;
  keywords: string[];
};

type HeaderProps = {
  extraCategories?: Array<{
    title: string;
    path: string;
  }>;
};

const BASE_CATEGORIES: SearchCategory[] = [
  { name: "Creatina", path: "/suplementos/creatina", keywords: ["creatina", "creatine"] },
  { name: "Whey Protein", path: "/suplementos/whey", keywords: ["whey", "protein", "proteina"] },
  { name: "Barra de proteína", path: "/suplementos/barra", keywords: ["barra", "barrinha"] },
  { name: "Pré-treino", path: "/suplementos/pre-treino", keywords: ["pre", "treino", "pretreino"] },
  { name: "Bebida proteica", path: "/suplementos/bebidaproteica", keywords: ["bebida", "pronta"] },
  { name: "Café funcional", path: "/suplementos/cafe-funcional", keywords: ["cafe", "funcional"] },
];

export default function Header({ extraCategories = [] }: HeaderProps) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Array<{ name: string; path: string }>>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [savedCount, setSavedCount] = useState(0);
  const [savedOpen, setSavedOpen] = useState(false);
  const router = useRouter();
  const wrapperRef = useRef<HTMLDivElement>(null);

  const categories = useMemo<SearchCategory[]>(() => {
    const normalizedExtras = extraCategories.map((category) => {
      const normalizedTitle = removeAccents(category.title.toLowerCase());
      const slugKeywords = category.path
        .split("/")
        .filter(Boolean)
        .flatMap((part) => removeAccents(part.toLowerCase()).split("-"));
      const titleKeywords = normalizedTitle.split(/[\s/&-]+/).filter(Boolean);

      return {
        name: category.title,
        path: category.path,
        keywords: Array.from(new Set([normalizedTitle, ...titleKeywords, ...slugKeywords])),
      };
    });

    return [...BASE_CATEGORIES, ...normalizedExtras];
  }, [extraCategories]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);

    if (value.length > 0) {
      const normalizedValue = removeAccents(value.toLowerCase());
      const filtered = categories.filter((cat) =>
        removeAccents(cat.name.toLowerCase()).includes(normalizedValue)
      );
      setSuggestions(filtered);
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();

    const searchString = removeAccents(query.trim().toLowerCase());
    if (!searchString) return;

    let targetPath: string | null = null;

    for (const category of categories) {
      if (category.keywords.some((keyword) => searchString.includes(keyword))) {
        targetPath = category.path;
        break;
      }
    }

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
    <>
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
                  className="h-11 w-full rounded-l-md border-none bg-white px-4 text-[15px] text-black outline-none"
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
                      key={cat.path}
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
        </div>
      </header>

      {savedOpen ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-[55] bg-black/35"
            aria-label="Fechar ofertas salvas"
            onClick={() => setSavedOpen(false)}
          />
          <div className="fixed inset-x-0 top-[104px] z-[60] px-3 md:top-[116px] md:px-5">
            <div className="mx-auto max-w-[1500px]">
              <div className="max-h-[calc(100vh-124px)] overflow-hidden rounded-2xl">
                <SavedDealsPanel onClose={() => setSavedOpen(false)} />
              </div>
            </div>
          </div>
        </>
      ) : null}
    </>
  );
}
