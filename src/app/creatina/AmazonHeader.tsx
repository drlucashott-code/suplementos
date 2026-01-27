"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Search } from "lucide-react";
import { useState, useEffect } from "react";

export function AmazonHeader() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Sincroniza o input com o que já estiver na URL
  const [query, setQuery] = useState(searchParams.get("q") || "");

  // Atualiza o estado se a URL mudar externamente
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
    
    // Limpa a página de filtros ao buscar algo novo
    router.push(`/creatina?${params.toString()}`);
  }

  return (
    <header className="bg-[#232f3e] text-white sticky top-0 z-40">
      <div className="flex items-center px-3 h-14 gap-2">
        
        {/* Botão de Voltar */}
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
          <label htmlFor="search-input" className="sr-only">Pesquisar creatinas</label>
          <Search className="w-5 h-5 text-zinc-500 mr-2 flex-shrink-0" aria-hidden="true" />
          
          <input 
            id="search-input"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Pesquisar em Creatinas"
            autoComplete="off"
            enterKeyHint="search"
            /* 🚀 SOLUÇÃO DO ZOOM: 
               Mudamos de text-[15px] para text-[16px]. 
               Isso impede que o iOS force o zoom ao focar no campo. 
            */
            className="w-full bg-transparent text-[#0F1111] text-[16px] outline-none placeholder-zinc-500 appearance-none"
          />
        </form>

      </div>
    </header>
  );
}