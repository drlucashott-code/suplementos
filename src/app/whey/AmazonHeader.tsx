"use client";

import { Search, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function AmazonHeader() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const path = `/whey${query.trim() ? `?q=${encodeURIComponent(query)}` : ""}`;
    router.push(path);
  };

  return (
    <header className="bg-[#232f3e] p-3 sticky top-0 z-40">
      <div className="flex items-center gap-3">
        <button onClick={() => router.push('/')} className="text-white">
          <ArrowLeft className="w-6 h-6" />
        </button>
        
        <form onSubmit={handleSearch} className="flex-1 flex items-center bg-white rounded-lg px-3 py-2 gap-2 shadow-md">
          <Search className="w-5 h-5 text-gray-400" />
          <input 
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Pesquisar em Whey Protein"
            className="flex-1 text-[#0F1111] text-[15px] outline-none"
          />
        </form>
      </div>
    </header>
  );
}