"use client";

import { useRouter, useSearchParams } from "next/navigation";

/**
 * Extensão da interface global para o objeto window para GA
 */
declare global {
  interface Window {
    gtag?: (command: string, event: string, data?: object) => void;
  }
}

type Props = {
  brands: string[];
  flavors: string[];
  weights: number[]; // Representa o Volume Total em ML
};

export function DesktopFiltersSidebar({ brands, flavors, weights }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function getSelected(param: string): string[] {
    return searchParams.get(param)?.split(",") ?? [];
  }

  // Helper adaptado para Volume (ex: 250ml ou 1L)
  const formatSize = (val: number) => {
    return val >= 1000 ? `${val / 1000}L` : `${val}ml`;
  };

  function track(event: string, data?: object) {
    if (typeof window !== "undefined" && window.gtag) {
      window.gtag("event", event, data);
    }
  }

  const hasActiveFilters = 
    searchParams.get("brand") || 
    searchParams.get("flavor") || 
    searchParams.get("weight") || 
    searchParams.get("proteinRange") || 
    searchParams.get("q");

  function toggleParam(param: string, value: string) {
    const current = getSelected(param);
    const isRemoving = current.includes(value);

    track("toggle_filter_desktop", {
      filter_type: param,
      filter_value: value,
      action: isRemoving ? "remove" : "add",
      category: "bebidaproteica"
    });

    const next = isRemoving
      ? current.filter((v) => v !== value)
      : [...current, value];

    const params = new URLSearchParams(searchParams.toString());

    if (next.length === 0) {
      params.delete(param);
    } else {
      params.set(param, next.join(","));
    }

    // Rota atualizada para Bebida Proteica
    router.push(`/bebidaproteica?${params.toString()}`);
  }

  function clearFilters() {
    track("clear_filters_desktop", { category: "bebidaproteica" });
    router.push("/bebidaproteica");
  }

  return (
    <div className="border rounded-xl p-4 space-y-6 bg-white shadow-sm sticky top-24">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg text-[#0F1111]">Filtros</h3>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="text-xs text-[#007185] hover:underline"
          >
            Limpar tudo
          </button>
        )}
      </div>

      {/* VOLUME / TAMANHO */}
      <div>
        <p className="font-bold text-sm mb-2 text-[#0F1111]">Volume Total</p>
        <div className="space-y-1 max-h-40 overflow-auto pr-2 custom-scrollbar">
          {weights.sort((a,b) => a-b).map((w) => (
            <label key={w} className="flex items-center gap-2 text-sm cursor-pointer hover:text-[#e47911]">
              <input
                type="checkbox"
                className="w-4 h-4 accent-[#e47911]"
                checked={getSelected("weight").includes(w.toString())}
                onChange={() => toggleParam("weight", w.toString())}
              />
              {formatSize(w)}
            </label>
          ))}
        </div>
      </div>

      {/* MARCA */}
      <div>
        <p className="font-bold text-sm mb-2 text-[#0F1111]">Marca</p>
        <div className="space-y-1 max-h-48 overflow-auto pr-2 custom-scrollbar">
          {[...brands].sort().map((brand) => (
            <label key={brand} className="flex items-center gap-2 text-sm cursor-pointer hover:text-[#e47911]">
              <input
                type="checkbox"
                className="w-4 h-4 accent-[#e47911]"
                checked={getSelected("brand").includes(brand)}
                onChange={() => toggleParam("brand", brand)}
              />
              <span className="line-clamp-1">{brand}</span>
            </label>
          ))}
        </div>
      </div>

      {/* SABOR */}
      <div>
        <p className="font-bold text-sm mb-2 text-[#0F1111]">Sabor</p>
        <div className="space-y-1 max-h-40 overflow-auto pr-2 custom-scrollbar">
          {[...flavors].sort().map((flavor) => (
            <label key={flavor} className="flex items-center gap-2 text-sm cursor-pointer hover:text-[#e47911]">
              <input
                type="checkbox"
                className="w-4 h-4 accent-[#e47911]"
                checked={getSelected("flavor").includes(flavor)}
                onChange={() => toggleParam("flavor", flavor)}
              />
              <span className="line-clamp-1">{flavor}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}