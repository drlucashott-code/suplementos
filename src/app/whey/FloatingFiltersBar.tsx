"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { SlidersHorizontal, ChevronDown } from "lucide-react";
import { useScrollDirection } from "@/hooks/useScrollDirection";

export function FloatingFiltersBar() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const scrollDirection = useScrollDirection();

  // O padrão do Whey é custo por proteína ('cost')
  const order = searchParams.get("order") ?? "cost";

  function openFilters() {
    window.dispatchEvent(new CustomEvent("open-filters"));
  }

  function changeOrder(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("order", value);
    router.push(`/whey?${params.toString()}`);
  }

  // Lógica de visibilidade: aparece no topo ou ao subir. Some ao descer.
  const isVisible = scrollDirection !== "down";

  return (
    <div 
      className={`sticky top-14 z-30 bg-white border-b border-gray-200 py-2 px-2 shadow-sm transition-transform duration-300 ease-in-out ${
        isVisible ? "translate-y-0" : "-translate-y-full"
      }`}
    >
      <div className="flex items-center gap-3">
        
        {/* BOTÃO DE FILTRO */}
        <button
          onClick={openFilters}
          className="flex items-center justify-center border border-gray-300 rounded-lg p-2 bg-white shadow-sm active:bg-gray-50 flex-shrink-0"
          aria-label="Abrir filtros"
        >
          <SlidersHorizontal className="w-5 h-5 text-[#0F1111]" />
        </button>

        {/* ORDENAÇÃO */}
        <div className="flex-1 flex items-center gap-2">
          <span className="text-[13px] text-[#565959] whitespace-nowrap leading-none">
            Classificar por:
          </span>
          
          <div className="flex-1 relative">
            <select
              value={order}
              onChange={(e) => changeOrder(e.target.value)}
              className="w-full appearance-none border border-gray-300 rounded-lg px-3 py-1.5 bg-[#F0F2F2] text-[13px] text-[#0F1111] shadow-sm outline-none pr-8 border-b-[#D5D9D9]"
            >
              <option value="cost">Custo-benefício</option>
              <option value="discount">Maior desconto</option>
              <option value="protein">Maior % de proteína</option>
            </select>
            <ChevronDown className="absolute right-2.5 top-2.5 w-4 h-4 text-gray-500 pointer-events-none" />
          </div>
        </div>

      </div>
    </div>
  );
}