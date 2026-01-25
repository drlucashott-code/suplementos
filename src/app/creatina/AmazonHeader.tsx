"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Search } from "lucide-react";
import { useState, useEffect } from "react";

export function AmazonHeader() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Sincroniza o input com o que já estiver na URL (caso o usuário recarregue)
  const [query, setQuery] = useState(searchParams.get("q") || "");

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    
    if (query) {
      params.set("q", query);
    } else {
      params.delete("q");
    }
    
    router.push(`/creatina?${params.toString()}`);
  }

  return (
    <header className="bg-[#232f3e] text-white sticky top-0 z-40">
      <div className="flex items-center px-3 h-14 gap-2">
        
        {/* Botão de Voltar */}
        <button 
          onClick={() => router.back()}
          className="p-1 active:bg-white/10 rounded-full transition-colors flex-shrink-0"
          aria-label="Voltar"
        >
          <ArrowLeft className="w-6 h-6 stroke-[2.5px]" />
        </button>
        
        {/* Barra de Busca Estilo Amazon */}
        <form 
          onSubmit={handleSearch}
          className="flex-1 flex items-center bg-white rounded-md px-3 py-1.5 shadow-inner"
        >
          <Search className="w-5 h-5 text-gray-500 mr-2" />
          <input 
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Pesquisar em Creatinas"
            className="w-full bg-transparent text-[#0F1111] text-[15px] outline-none placeholder-gray-500"
          />
        </form>

      </div>
    </header>
  );
}