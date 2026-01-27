"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { SlidersHorizontal, ChevronDown } from "lucide-react";
import { useScrollDirection } from "@/hooks/useScrollDirection";

export function FloatingFiltersBar() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const scrollDirection = useScrollDirection();

  const order = searchParams.get("order") ?? "gram";

  function openFilters() {
    // Dispara o evento que o MobileFiltersDrawer está ouvindo
    window.dispatchEvent(new CustomEvent("open-filters"));
  }

  function changeOrder(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("order", value);
    router.push(`/creatina?${params.toString()}`);
  }

  // 🚀 Lógica de visibilidade: 
  // O menu some ao rolar para baixo e reaparece instantaneamente ao subir.
  const isVisible = scrollDirection !== "down";

  return (
    <div 
      className={`sticky top-14 z-30 bg-white border-b border-gray-200 py-2 px-2 shadow-sm transition-transform duration-300 ease-in-out ${
        isVisible ? "translate-y-0" : "-translate-y-full"
      }`}
    >
      <div className="flex items-center gap-3">
        
        {/* BOTÃO DE FILTRO (Acessibilidade: Toque generoso de 44px) */}
        <button
          onClick={openFilters}
          className="flex items-center justify-center border border-zinc-300 rounded-lg p-2.5 bg-white shadow-sm active:bg-zinc-50 flex-shrink-0 transition-colors"
          aria-label="Abrir menu de filtros e categorias"
        >
          <SlidersHorizontal className="w-5 h-5 text-zinc-900" />
        </button>

        {/* ORDENAÇÃO */}
        <div className="flex-1 flex items-center gap-2">
          {/* Acessibilidade: id + htmlFor para leitores de tela */}
          <label 
            htmlFor="sort-select" 
            className="text-[13px] text-zinc-800 whitespace-nowrap leading-none font-medium"
          >
            Classificar:
          </label>
          
          <div className="flex-1 relative">
            <select
              id="sort-select"
              value={order}
              onChange={(e) => changeOrder(e.target.value)}
              /* 🚀 SOLUÇÃO DO ZOOM NO MOBILE: 
                 Mudamos de 13px para 16px. Isso impede o zoom forçado do iOS
                 ao interagir com a seleção de ordenação. */
              className="w-full appearance-none border border-zinc-300 rounded-lg px-3 py-2 bg-zinc-100 text-[16px] text-zinc-900 shadow-sm outline-none pr-8 border-b-zinc-400 focus:border-zinc-500 transition-all"
            >
              <option value="gram">Custo-benefício</option>
              <option value="discount">Maior desconto</option>
            </select>
            
            {/* Ícone de seta com contraste ajustado */}
            <ChevronDown 
              className="absolute right-2.5 top-3 w-4 h-4 text-zinc-600 pointer-events-none" 
              aria-hidden="true"
            />
          </div>
        </div>

      </div>
    </div>
  );
}