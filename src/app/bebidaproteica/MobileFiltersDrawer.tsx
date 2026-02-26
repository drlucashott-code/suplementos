"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useMemo } from "react";

type Props = {
  brands: string[];
  flavors: string[];
  sellers: string[];
};

type FilterTab = "protein" | "brand" | "flavor" | "seller";

const PROTEIN_RANGES = [
  { label: "Acima de 25g por unidade", value: "25-100" },
  { label: "20g a 25g por unidade", value: "20-25" },
  { label: "15g a 20g por unidade", value: "15-20" },
  { label: "Abaixo de 15g por unidade", value: "0-15" },
];

export function MobileFiltersDrawer({ brands, flavors, sellers }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<FilterTab>("protein");

  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedFlavors, setSelectedFlavors] = useState<string[]>([]);
  const [selectedProteinRanges, setSelectedProteinRanges] = useState<string[]>([]);
  const [selectedSellers, setSelectedSellers] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => { document.body.style.overflow = "unset"; };
  }, [open]);

  useEffect(() => {
    function handleOpen() {
      setSelectedBrands(searchParams.get("brand")?.split(",") ?? []);
      setSelectedFlavors(searchParams.get("flavor")?.split(",") ?? []);
      setSelectedProteinRanges(searchParams.get("proteinRange")?.split(",") ?? []);
      setSelectedSellers(searchParams.get("seller")?.split(",") ?? []);
      setOpen(true);
    }
    window.addEventListener("open-filters", handleOpen);
    return () => window.removeEventListener("open-filters", handleOpen);
  }, [searchParams]);

  // CORREÇÃO ESLint: Tipagem correta sem usar 'any'
  const toggle = (value: string, list: string[], setList: (v: string[]) => void) => {
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  };

  const hasAnyFilter = selectedBrands.length > 0 || selectedFlavors.length > 0 || selectedProteinRanges.length > 0 || selectedSellers.length > 0;
  const countFilters = selectedBrands.length + selectedFlavors.length + selectedProteinRanges.length + selectedSellers.length;

  const clearInternalFilters = () => {
    setSelectedBrands([]);
    setSelectedFlavors([]);
    setSelectedProteinRanges([]);
    setSelectedSellers([]);
  };

  const applyFilters = () => {
    const params = new URLSearchParams(searchParams.toString());
    
    if (selectedBrands.length) params.set("brand", selectedBrands.join(","));
    else params.delete("brand");

    if (selectedFlavors.length) params.set("flavor", selectedFlavors.join(","));
    else params.delete("flavor");

    if (selectedProteinRanges.length) params.set("proteinRange", selectedProteinRanges.join(","));
    else params.delete("proteinRange");

    if (selectedSellers.length) params.set("seller", selectedSellers.join(","));
    else params.delete("seller");

    if (!params.has("order")) params.set("order", "discount");

    router.push(`/bebidaproteica?${params.toString()}`);
    setOpen(false);
  };

  const sortedBrands = useMemo(() => [...brands].sort((a, b) => a.localeCompare(b)), [brands]);
  const sortedFlavors = useMemo(() => [...flavors].sort((a, b) => a.localeCompare(b)), [flavors]);

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-[60] animate-in fade-in duration-200" onClick={() => setOpen(false)} aria-hidden="true" />

      <div className="fixed bottom-0 left-0 right-0 z-[70] bg-white rounded-t-2xl flex flex-col overflow-hidden shadow-2xl animate-in slide-in-from-bottom duration-300 h-[85vh] font-sans" role="dialog" aria-modal="true">
        <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-200 bg-[#f0f2f2]">
          <h2 className="text-[16px] font-bold text-zinc-900">
            Filtros {countFilters > 0 && <span className="text-[#007185] ml-1">({countFilters})</span>}
          </h2>
          <button onClick={() => setOpen(false)} className="text-zinc-500 text-3xl font-light p-1 leading-none">&times;</button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <nav className="w-[130px] bg-[#f0f2f2] border-r border-zinc-200 overflow-y-auto">
            {[
              { id: "protein", label: "Proteína/unidade" },
              { id: "brand", label: "Marcas" },
              { id: "flavor", label: "Sabor" },
              { id: "seller", label: "Vendido por" },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              let badgeCount = 0;
              if (tab.id === 'brand') badgeCount = selectedBrands.length;
              if (tab.id === 'flavor') badgeCount = selectedFlavors.length;
              if (tab.id === 'protein') badgeCount = selectedProteinRanges.length;
              if (tab.id === 'seller') badgeCount = selectedSellers.length;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as FilterTab)}
                  className={`w-full text-left px-4 py-4 text-[13px] leading-tight font-bold transition-all border-l-[4px] relative ${
                    isActive ? "bg-white border-[#007185] text-[#007185]" : "border-transparent text-zinc-600 hover:bg-[#e3e6e6]"
                  }`}
                >
                  {tab.label}
                  {badgeCount > 0 && <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#007185]" />}
                </button>
              );
            })}
          </nav>

          <div className="flex-1 p-4 overflow-y-auto bg-white">
            <div className="flex flex-wrap gap-2 content-start">
              {activeTab === "protein" && PROTEIN_RANGES.map((r) => (
                <Tag key={r.value} label={r.label} active={selectedProteinRanges.includes(r.value)} onClick={() => toggle(r.value, selectedProteinRanges, setSelectedProteinRanges)} />
              ))}
              {activeTab === "brand" && sortedBrands.map((b) => (
                <Tag key={b} label={b} active={selectedBrands.includes(b)} onClick={() => toggle(b, selectedBrands, setSelectedBrands)} />
              ))}
              {activeTab === "flavor" && sortedFlavors.map((f) => (
                <Tag key={f} label={f} active={selectedFlavors.includes(f)} onClick={() => toggle(f, selectedFlavors, setSelectedFlavors)} />
              ))}
              {activeTab === "seller" && sellers.map((s) => (
                <Tag key={s} label={s} active={selectedSellers.includes(s)} onClick={() => toggle(s, selectedSellers, setSelectedSellers)} />
              ))}
            </div>
          </div>
        </div>

        <div className="p-3 bg-white border-t border-zinc-200 flex items-center gap-3 shrink-0 pb-8">
          {hasAnyFilter && (
            <button onClick={clearInternalFilters} className="flex-1 py-3 border border-zinc-300 rounded-full text-[13px] font-medium text-zinc-800 bg-white shadow-sm">
              Limpar tudo
            </button>
          )}
          <button onClick={applyFilters} className={`${hasAnyFilter ? 'flex-[2]' : 'w-full'} bg-[#FFD814] border border-[#FCD200] text-[#0F1111] font-medium py-3 rounded-full text-[13px]`}>
            Mostrar resultados
          </button>
        </div>
      </div>
    </>
  );
}

function Tag({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-2 rounded-lg text-[13px] border transition-all text-left ${
        active ? "bg-[#EDFDFF] border-[#007185] text-[#007185] font-bold ring-1 ring-[#007185]" : "bg-white border-zinc-300 text-zinc-700 hover:bg-zinc-50"
      }`}
    >
      {label}
    </button>
  );
}