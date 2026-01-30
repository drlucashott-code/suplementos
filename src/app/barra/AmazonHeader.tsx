"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Search } from "lucide-react";
import { useState, useEffect } from "react";

export function AmazonHeader() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Sincroniza o input com o valor da URL ("q")
  const [query, setQuery] = useState(searchParams.get("q") || "");

  // Atualiza o estado interno se a URL mudar externamente (ex: limpar filtros)
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
    
    // Mantém a navegação dentro da categoria de barra de proteína
    router.push(`/barra?${params.toString()}`);
  }

  return (
    <header className="bg-[#232f3e] text-white sticky top-0 z-40 w-full shadow-md">
      <div className="flex items-center px-3 h-14 gap-2 max-w-[1200px] mx-auto">
        
        {/* Botão de Voltar: Acessível para leitores de tela */}
        <button 
          onClick={() => router.back()}
          className="p-1 active:bg-white/10 rounded-full transition-colors flex-shrink-0"
          aria-label="Voltar para a página anterior"
        >
          <ArrowLeft className="w-6 h-6 stroke-[2.5px]" />
        </button>
        
        {/* Barra de Busca Estilo Amazon */}
        <form 
          onSubmit={handleSearch}
          className="flex-1 flex items-center bg-white rounded-md px-3 py-1.5 shadow-inner"
          role="search"
        >
          <label htmlFor="barra-search" className="sr-only">
            Pesquisar em Barra de Proteína
          </label>
          <Search className="w-5 h-5 text-zinc-500 mr-2 flex-shrink-0" aria-hidden="true" />
          <input 
            id="barra-search"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Pesquisar em Barra de Proteína"
            className="w-full bg-transparent text-[#0F1111] text-[15px] outline-none placeholder-zinc-500 font-normal"
            enterKeyHint="search"
          />
        </form>

      </div>
    </header>
  );
}