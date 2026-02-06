"use client";

import { useRouter, useSearchParams } from "next/navigation";

type Props = {
  brands: string[];
  flavors: string[];
};

const PROTEIN_RANGES = [
  { label: "Acima de 20g por unidade", value: "20-100" },
  { label: "15g a 20g por unidade", value: "15-20" },
  { label: "10g a 15g por unidade", value: "10-15" },
  { label: "Abaixo de 10g por unidade", value: "0-10" },
];

export function DesktopFiltersSidebar({ brands, flavors }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const hasActiveFilters = 
    searchParams.get("brand") || 
    searchParams.get("flavor") || 
    searchParams.get("proteinRange") || 
    searchParams.get("priceMax") ||
    searchParams.get("q");

  function getSelected(param: string): string[] {
    return searchParams.get(param)?.split(",") ?? [];
  }

  function toggleParam(param: string, value: string) {
    const current = getSelected(param);
    const isRemoving = current.includes(value);
    const next = isRemoving ? current.filter((v) => v !== value) : [...current, value];

    const params = new URLSearchParams(searchParams.toString());
    if (next.length === 0) params.delete(param);
    else params.set(param, next.join(","));

    params.delete("page");
    // ✅ Rota atualizada para Bebida Proteica
    router.push(`/bebidaproteica?${params.toString()}`);
  }

  return (
    <div className="space-y-6 pr-4 select-none sticky top-24">
      <div className="border-b border-gray-300 pb-2">
        <h3 className="font-bold text-[14px] text-[#0F1111]">Filtros</h3>
        {hasActiveFilters && (
          <button
            onClick={() => router.push("/bebidaproteica")}
            className="text-[12px] text-[#007185] hover:text-[#C7511F] hover:underline block mt-1"
          >
            Limpar tudo
          </button>
        )}
      </div>

      {/* PROTEÍNA POR UNIDADE */}
      <div className="space-y-2">
        <p className="font-bold text-[14px] text-[#0F1111]">Proteína por Unidade</p>
        <ul className="space-y-1">
          {PROTEIN_RANGES.map((range) => {
            const isSelected = getSelected("proteinRange").includes(range.value);
            return (
              <li 
                key={range.value}
                onClick={() => toggleParam("proteinRange", range.value)}
                className={`text-[13px] cursor-pointer flex items-center gap-2 hover:text-[#C7511F] ${
                  isSelected ? "font-bold text-[#0F1111]" : "text-[#0F1111]"
                }`}
              >
                <div className={`w-3.5 h-3.5 border rounded-sm flex items-center justify-center ${
                  isSelected ? "bg-[#e47911] border-[#e47911]" : "border-gray-400 bg-white"
                }`}>
                  {isSelected && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                </div>
                {range.label}
              </li>
            );
          })}
        </ul>
      </div>

      {/* MARCAS */}
      <div className="space-y-2">
        <p className="font-bold text-[14px] text-[#0F1111]">Marca</p>
        <ul className="space-y-1 max-h-64 overflow-y-auto pr-1">
          {[...brands].sort().map((brand) => {
            const isSelected = getSelected("brand").includes(brand);
            return (
              <li 
                key={brand}
                onClick={() => toggleParam("brand", brand)}
                className={`text-[13px] cursor-pointer flex items-center gap-2 hover:text-[#C7511F] ${
                  isSelected ? "font-bold text-[#0F1111]" : "text-[#0F1111]"
                }`}
              >
                <div className={`w-3.5 h-3.5 border rounded-sm flex items-center justify-center ${
                  isSelected ? "bg-[#e47911] border-[#e47911]" : "border-gray-400 bg-white"
                }`}>
                  {isSelected && <div className="w-1.5 h-2.5 border-white border-b-2 border-r-2 rotate-45 mb-0.5" />}
                </div>
                {brand}
              </li>
            );
          })}
        </ul>
      </div>

      {/* SABORES - ✅ Resolvendo erro de variável flavors não utilizada */}
      <div className="space-y-2">
        <p className="font-bold text-[14px] text-[#0F1111]">Sabor</p>
        <ul className="space-y-1 max-h-64 overflow-y-auto pr-1">
          {[...flavors].sort().map((flavor) => {
            const isSelected = getSelected("flavor").includes(flavor);
            return (
              <li 
                key={flavor}
                onClick={() => toggleParam("flavor", flavor)}
                className={`text-[13px] cursor-pointer flex items-center gap-2 hover:text-[#C7511F] ${
                  isSelected ? "font-bold text-[#0F1111]" : "text-[#0F1111]"
                }`}
              >
                <div className={`w-3.5 h-3.5 border rounded-sm flex items-center justify-center ${
                  isSelected ? "bg-[#e47911] border-[#e47911]" : "border-gray-400 bg-white"
                }`}>
                  {isSelected && <div className="w-1.5 h-2.5 border-white border-b-2 border-r-2 rotate-45 mb-0.5" />}
                </div>
                {flavor}
              </li>
            );
          })}
        </ul>
      </div>

      {/* PREÇO RÁPIDO */}
      <div className="space-y-2">
        <p className="font-bold text-[14px] text-[#0F1111]">Preço</p>
        <ul className="space-y-1 text-[13px] text-[#0F1111]">
          <li className="hover:text-[#C7511F] cursor-pointer" onClick={() => router.push("/bebidaproteica?priceMax=100")}>Até R$100</li>
          <li className="hover:text-[#C7511F] cursor-pointer" onClick={() => router.push("/bebidaproteica?priceMax=200")}>R$100 a R$200</li>
          <li className="hover:text-[#C7511F] cursor-pointer" onClick={() => router.push("/bebidaproteica?priceMax=400")}>Acima de R$200</li>
        </ul>
      </div>
    </div>
  );
}