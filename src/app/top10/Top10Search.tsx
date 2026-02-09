"use client";

import { Search } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export function Top10Search() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") || "");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/top10?q=${encodeURIComponent(query)}`);
    } else {
      router.push("/top10");
    }
  };

  return (
    <form onSubmit={handleSearch} className="relative flex-1 max-w-[500px]">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar no Top 10..."
        className="w-full h-10 px-4 py-2 rounded-lg text-sm text-black border border-gray-300 focus:outline-none focus:ring-1 focus:ring-[#e47911] shadow-sm"
      />
      <button type="submit" className="absolute right-0 top-0 h-full px-3 bg-[#febd69] rounded-r-lg hover:bg-[#f3a847] transition-colors">
        <Search className="w-5 h-5 text-[#232f3e]" />
      </button>
    </form>
  );
}