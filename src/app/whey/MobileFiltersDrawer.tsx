"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useMemo } from "react";

type Props = {
  brands: string[];
  flavors: string[];
};

type FilterTab = "protein" | "brand" | "flavor";

const PROTEIN_RANGES = [
  { label: "Acima de 90%", value: "90-100" },
  { label: "80% a 90%", value: "80-90" },
  { label: "70% a 80%", value: "70-80" },
  { label: "60% a 70%", value: "60-70" },
  { label: "Abaixo de 60%", value: "0-60" },
];

export function MobileFiltersDrawer({ brands, flavors }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<FilterTab>("protein");

  // Estados dos Filtros (Internos ao Drawer)
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedFlavors, setSelectedFlavors] = useState<string[]>([]);
  const [selectedProteinRanges, setSelectedProteinRanges] = useState<string[]>([]);

  // Sincronização com a URL ao abrir o Drawer via evento global
  useEffect(() => {
    function handleOpen() {
      setSelectedBrands(searchParams.get("brand")?.split(",") ?? []);
      setSelectedFlavors(searchParams.get("flavor")?.split(",") ?? []);
      setSelectedProteinRanges(searchParams.get("proteinRange")?.split(",") ?? []);
      setOpen(true);
    }
    window.addEventListener("open-filters", handleOpen);
    return () => window.removeEventListener("open-filters", handleOpen);
  }, [searchParams]);

  // Lógica de Seleção de Tags
  const toggle = <T,>(value: T, list: T[], setList: (v: T[]) => void) => {
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  };

  // Cálculo de Contador e Visibilidade do Botão Limpar
  const hasAnyFilter = selectedBrands.length > 0 || selectedFlavors.length > 0 || selectedProteinRanges.length > 0;
  const totalFilters = selectedBrands.length + selectedFlavors.length + selectedProteinRanges.length;

  const clearInternalFilters = () => {
    setSelectedBrands([]);
    setSelectedFlavors([]);
    setSelectedProteinRanges([]);
  };

  const applyFilters = () => {
    const params = new URLSearchParams(searchParams.toString());
    
    if (selectedBrands.length) params.set("brand", selectedBrands.join(","));
    else params.delete("brand");

    if (selectedFlavors.length) params.set("flavor", selectedFlavors.join(","));
    else params.delete("flavor");

    if (selectedProteinRanges.length) params.set("proteinRange", selectedProteinRanges.join(","));
    else params.delete("proteinRange");

    router.push(`/whey?${params.toString()}`);
    setOpen(false);
  };

  // Listas Ordenadas (A-Z)
  const sortedBrands = useMemo(() => [...brands].sort((a, b) => a.localeCompare(b)), [brands]);
  const sortedFlavors = useMemo(() => [...flavors].sort((a, b) => a.localeCompare(b)), [flavors]);

  if (!open) return null;

  return (
    <>
      {/* Overlay Escuro */}
      <div className="fixed inset-0 bg-black/60 z-[60]" onClick={() => setOpen(false)} />

      {/* Container do Drawer (Estilo Creatina) */}
      <div className="fixed bottom-0 left-0 right-0 z-[70] bg-white rounded-t-2xl flex flex-col overflow-hidden shadow-2xl transition-all" style={{ height: "90vh" }}>
        
        {/* Header com Contador de Filtros */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 shrink-0">
          <h2 className="text-lg font-bold text-[#0F1111]">
            Filtros {hasAnyFilter && <span className="text-[#007185] ml-1">({totalFilters})</span>}
          </h2>
          <button onClick={() => setOpen(false)} className="text-gray-400 text-3xl font-light">&times;</button>
        </div>

        {/* Corpo com Navegação Lateral e Scroll Independente */}
        <div className="flex flex-1 overflow-hidden">
          
          {/* Menu Lateral Esquerdo: Abas */}
          <div className="w-[130px] bg-[#F7F8F8] border-r border-gray-200 overflow-y-auto">
            {[
              { id: "protein", label: "Proteína" },
              { id: "brand", label: "Marcas" },
              { id: "flavor", label: "Sabor" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as FilterTab)}
                className={`w-full text-left px-4 py-6 text-[13px] leading-tight font-medium transition-all border-l-4 ${
                  activeTab === tab.id 
                    ? "bg-white border-[#e47911] text-[#e47911]" 
                    : "border-transparent text-gray-500"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Área Direita: Opções (Pills/Tags) */}
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
            </div>
          </div>
        </div>

        {/* Footer Dinâmico: Aparece botão "Limpar filtros" se houver seleção */}
        <div className="p-4 bg-white border-t border-gray-200 flex items-center gap-3 shrink-0">
          {hasAnyFilter && (
            <button
              onClick={clearInternalFilters}
              className="flex-1 py-3 border border-gray-300 rounded-full text-[14px] font-medium text-[#0F1111] active:bg-gray-100 transition-all"
            >
              Limpar filtros
            </button>
          )}

          <button
            onClick={applyFilters}
            className={`${hasAnyFilter ? 'flex-[2]' : 'w-full'} bg-[#FFD814] border border-[#FCD200] text-[#0F1111] font-medium py-3.5 rounded-full shadow-sm active:scale-[0.98] transition-all text-[14px]`}
          >
            Mostrar resultados
          </button>
        </div>
      </div>
    </>
  );
}

// Componente Tag (Pills) no padrão Amazon
function Tag({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-full text-[13px] border transition-all ${
        active
          ? "bg-[#EDFDFF] border-[#007185] text-[#007185] font-bold shadow-sm"
          : "bg-white border-gray-300 text-gray-700 active:bg-gray-50"
      }`}
    >
      {label}
    </button>
  );
}