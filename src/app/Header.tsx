"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

// Categorias disponíveis no seu sistema
const CATEGORIES = [
  { name: "Creatina", path: "/creatina" },
  { name: "Whey Protein", path: "/whey" },
  { name: "Barrinhas", path: "/barrinhas" },
];

export default function Header() {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<{name: string, path: string}[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const router = useRouter();
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Fecha as sugestões se clicar fora do componente
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filtra as categorias conforme o usuário digita
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);

    if (value.length > 0) {
      const filtered = CATEGORIES.filter(cat =>
        cat.name.toLowerCase().includes(value.toLowerCase())
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
    if (suggestions.length > 0) {
      router.push(suggestions[0].path);
      setShowSuggestions(false);
    }
  };

  return (
    <header className="bg-[#232f3e] w-full py-3 px-4 shadow-md sticky top-0 z-50">
      <div className="flex items-center justify-between gap-4 max-w-7xl mx-auto">
        
        <div className="flex-shrink-0 cursor-pointer" onClick={() => router.push("/")}>
          <h1 className="text-white text-xl font-bold tracking-tight">
            amazon<span className="text-[#febd69]">picks</span>
          </h1>
        </div>

        <div className="relative flex flex-grow max-w-[500px]" ref={wrapperRef}>
          <form onSubmit={handleSearch} className="flex flex-grow items-center">
            <input
              type="text"
              value={query}
              onChange={handleInputChange}
              onFocus={() => query.length > 0 && setShowSuggestions(true)}
              placeholder="O que você está procurando?"
              className="w-full h-10 px-3 rounded-l-sm border-none outline-none text-black text-sm bg-white"
            />
            <button type="submit" className="bg-[#febd69] h-10 px-4 rounded-r-sm hover:bg-[#f3a847]">
              <Search className="w-5 h-5 text-[#232f3e]" />
            </button>
          </form>

          {/* LISTA DE SUGESTÕES */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute top-11 left-0 w-full bg-white shadow-xl rounded-md overflow-hidden z-[100] border border-gray-200">
              {suggestions.map((cat) => (
                <div
                  key={cat.path}
                  onClick={() => {
                    router.push(cat.path);
                    setQuery("");
                    setShowSuggestions(false);
                  }}
                  className="px-4 py-3 hover:bg-gray-100 cursor-pointer text-sm text-gray-800 flex items-center gap-2 border-b last:border-none"
                >
                  <Search className="w-4 h-4 text-gray-400" />
                  <span>{cat.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}