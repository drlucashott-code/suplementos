"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

// Função utilitária para remover acentos de qualquer texto
const removeAccents = (str: string) => {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
};

// Categorias disponíveis e suas palavras-chave (já sem acento para facilitar a busca)
const CATEGORIES = [
  { name: "Creatina", path: "/creatina", keywords: ["creatina", "creatine"] },
  { name: "Whey Protein", path: "/whey", keywords: ["whey", "protein", "proteina"] },
  { name: "Barra de Proteína", path: "/barra", keywords: ["barra", "barrinha"] },
  { name: "Pré-Treino", path: "/pre-treino", keywords: ["pre", "treino", "pretreino"] },
  { name: "Bebida Proteica", path: "/bebidaproteica", keywords: ["bebida", "pronta"] },
  { name: "Café Funcional", path: "/cafe-funcional", keywords: ["cafe", "funcional"] },
];

export default function Header() {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<{name: string, path: string}[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const router = useRouter();
  const wrapperRef = useRef<HTMLDivElement>(null);

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
      const normalizedValue = removeAccents(value.toLowerCase());
      const filtered = CATEGORIES.filter(cat =>
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
    
    // Removemos os acentos do que o usuário digitou para comparar com as palavras-chave
    const searchString = removeAccents(query.trim().toLowerCase());
    
    if (!searchString) return;

    let targetPath = null;
    
    for (const category of CATEGORIES) {
      if (category.keywords.some(keyword => searchString.includes(keyword))) {
        targetPath = category.path;
        break; 
      }
    }

    if (targetPath) {
      router.push(`${targetPath}?q=${encodeURIComponent(query)}`);
    } else {
      if (suggestions.length > 0) {
        router.push(suggestions[0].path);
      } else {
        console.warn("Categoria não identificada para a busca:", query);
      }
    }

    setShowSuggestions(false);
  };

  return (
    <header className="bg-[#232f3e] w-full py-3 px-4 shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-center gap-4 lg:gap-8">
        
        <div 
          className="flex-shrink-0 cursor-pointer" 
          onClick={() => router.push("/")}
        >
          <h1 className="text-white text-xl font-bold tracking-tight">
            amazon<span className="text-[#febd69]">picks</span>
          </h1>
        </div>

        <div className="relative flex w-full max-w-[600px]" ref={wrapperRef}>
          <form onSubmit={handleSearch} className="flex flex-grow items-center">
            <input
              type="text"
              value={query}
              onChange={handleInputChange}
              onFocus={() => query.length > 0 && setShowSuggestions(true)}
              placeholder="O que você está procurando?"
              className="w-full h-10 px-3 rounded-l-sm border-none outline-none text-black text-base bg-white"
            />
            <button type="submit" className="bg-[#febd69] h-10 px-4 rounded-r-sm hover:bg-[#f3a847] transition-colors">
              <Search className="w-5 h-5 text-[#232f3e]" />
            </button>
          </form>

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