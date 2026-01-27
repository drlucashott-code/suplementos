"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { SlidersHorizontal, ChevronDown } from "lucide-react";
import { useScrollDirection } from "@/hooks/useScrollDirection";

export function FloatingFiltersBar() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const scrollDirection = useScrollDirection();

  // Padrão da creatina: custo por grama
  const order = searchParams.get("order") ?? "gram";

  function openFilters() {
    window.dispatchEvent(new CustomEvent("open-filters"));
  }

  function changeOrder(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("order", value);
    router.push(`/creatina?${params.toString()}`);
  }

  const isVisible = scrollDirection !== "down";

  return (
    <div
      className={`sticky top-14 z-30 bg-white border-b border-zinc-200 py-2 px-3 shadow-sm transition-transform duration-300 ease-in-out ${
        isVisible ? "translate-y-0" : "-translate-y-full"
      }`}
      style={{ fontFamily: "Arial, Helvetica, sans-serif" }}
    >
      <div className="flex items-center gap-3 max-w-[1200px] mx-auto">
        
        <button
          onClick={openFilters}
          className="flex items-center justify-center border border-zinc-300 rounded-lg p-2.5 bg-white shadow-sm active:bg-zinc-100 flex-shrink-0 transition-colors"
          aria-label="Abrir filtros"
        >
          <SlidersHorizontal className="w-5 h-5 text-zinc-900" />
        </button>

        <div className="flex-1 flex items-center gap-2">
          <label
            htmlFor="sort-select"
            className="text-[13px] text-zinc-600 whitespace-nowrap leading-none font-normal"
          >
            Classificar:
          </label>

          <div className="flex-1 relative">
            <select
              id="sort-select"
              value={order}
              onChange={(e) => changeOrder(e.target.value)}
              className="w-full appearance-none border border-zinc-300 rounded-lg px-3 py-2 bg-zinc-50 text-[13px] text-zinc-900 shadow-sm outline-none pr-9 border-b-zinc-400 active:border-[#e47911] transition-all"
            >
              <option value="gram">Custo-benefício</option>
              <option value="discount">Maior desconto</option>
            </select>

            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none border-l border-zinc-300 pl-2">
              <ChevronDown className="w-4 h-4 text-zinc-500" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
