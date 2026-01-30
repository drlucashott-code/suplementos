"use client";

import { CreatineForm } from "@prisma/client";
import { useRouter, useSearchParams } from "next/navigation";

type Props = {
  brands: string[];
  flavors: string[];
  weights: number[]; // Novo: Pesos disponíveis vindos do banco
};

export function DesktopFiltersSidebar({ brands, flavors, weights }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function getSelected(param: string): string[] {
    return searchParams.get(param)?.split(",") ?? [];
  }

  // Helper para formatar o peso na UI (ex: 300g ou 1kg)
  const formatWeight = (g: number) => (g >= 1000 ? `${g / 1000}kg` : `${g}g`);

  function track(event: string, data?: object) {
    if (typeof window !== "undefined" && "gtag" in window) {
      // @ts-ignore
      window.gtag("event", event, data);
    }
  }

  const hasActiveFilters = 
    searchParams.get("brand") || 
    searchParams.get("flavor") || 
    searchParams.get("form") || 
    searchParams.get("weight") || 
    searchParams.get("q");

  function toggleParam(param: string, value: string) {
    const current = getSelected(param);
    const isRemoving = current.includes(value);

    track("toggle_filter_desktop", {
      filter_type: param,
      filter_value: value,
      action: isRemoving ? "remove" : "add",
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

    router.push(`/creatina?${params.toString()}`);
  }

  function clearFilters() {
    track("clear_filters_desktop");
    router.push("/creatina");
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

      {/* APRESENTAÇÃO */}
      <div>
        <p className="font-bold text-sm mb-2 text-[#0F1111]">Apresentação</p>
        <div className="space-y-1">
          {[
            { value: CreatineForm.CAPSULE, label: "Cápsula" },
            { value: CreatineForm.GUMMY, label: "Gummy" },
            { value: CreatineForm.POWDER, label: "Pó" },
          ].map((f) => (
            <label key={f.value} className="flex items-center gap-2 text-sm cursor-pointer hover:text-[#e47911]">
              <input
                type="checkbox"
                className="w-4 h-4 accent-[#e47911]"
                checked={getSelected("form").includes(f.value)}
                onChange={() => toggleParam("form", f.value)}
              />
              {f.label}
            </label>
          ))}
        </div>
      </div>

      {/* TAMANHO (NOVO) */}
      <div>
        <p className="font-bold text-sm mb-2 text-[#0F1111]">Tamanho</p>
        <div className="space-y-1 max-h-40 overflow-auto pr-2 custom-scrollbar">
          {weights.map((w) => (
            <label key={w} className="flex items-center gap-2 text-sm cursor-pointer hover:text-[#e47911]">
              <input
                type="checkbox"
                className="w-4 h-4 accent-[#e47911]"
                checked={getSelected("weight").includes(w.toString())}
                onChange={() => toggleParam("weight", w.toString())}
              />
              {formatWeight(w)}
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