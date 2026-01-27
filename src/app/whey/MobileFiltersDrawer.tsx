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

  // Estados dos Filtros (Internos ao Drawer para permitir cancelamento)
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedFlavors, setSelectedFlavors] = useState<string[]>([]);
  const [selectedProteinRanges, setSelectedProteinRanges] = useState<string[]>([]);

  // 🔒 Scroll Lock: Impede que o fundo role quando o menu está aberto
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => { document.body.style.overflow = "unset"; };
  }, [open]);

  // Sincronização com a URL ao abrir o Drawer via evento customizado
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

    // Mantém a navegação na rota de whey
    router.push(`/whey?${params.toString()}`);
    setOpen(false);
  };

  // Listas Ordenadas (A-Z) para melhor UX
  const sortedBrands = useMemo(() => [...brands].sort((a, b) => a.localeCompare(b)), [brands]);
  const sortedFlavors = useMemo(() => [...flavors].sort((a, b) => a.localeCompare(b)), [flavors]);

  if (!open) return null;

  return (
    <>
      {/* Overlay Escuro (Acessibilidade: aria-hidden) */}
      <div 
        className="fixed inset-0 bg-black/60 z-[60] animate-in fade-in duration-200" 
        onClick={() => setOpen(false)} 
        aria-hidden="true"
      />

      {/* Container do Drawer: 90% da altura da tela */}
      <div 
        className="fixed bottom-0 left-0 right-0 z-[70] bg-white rounded-t-2xl flex flex-col overflow-hidden shadow-2xl animate-in slide-in-from-bottom duration-300" 
        style={{ height: "90vh", fontFamily: "Arial, sans-serif" }}
        role="dialog"
        aria-modal="true"
      >
        
        {/* Header com Contador de Filtros Ativos */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200 shrink-0">
          <h2 className="text-[18px] font-bold text-[#0F1111]">
            Filtros {hasAnyFilter && <span className="text-[#007185] ml-1">({totalFilters})</span>}
          </h2>
          <button 
            onClick={() => setOpen(false)} 
            className="text-zinc-500 hover:text-zinc-900 text-3xl font-light p-2 leading-none"
            aria-label="Fechar menu de filtros"
          >
            &times;
          </button>
        </div>

        {/* Corpo: Navegação Lateral + Conteúdo Selecionável */}
        <div className="flex flex-1 overflow-hidden">
          
          {/* Menu Lateral: Categorias de Filtro */}
          <nav className="w-[125px] bg-[#F7F8F8] border-r border-zinc-200 overflow-y-auto">
            {[
              { id: "protein", label: "Proteína (%)" },
              { id: "brand", label: "Marcas" },
              { id: "flavor", label: "Sabor" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as FilterTab)}
                className={`w-full text-left px-4 py-6 text-[13px] leading-tight font-bold transition-all border-l-4 ${
                  activeTab === tab.id 
                    ? "bg-white border-[#e47911] text-[#e47911]" 
                    : "border-transparent text-zinc-600"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          {/* Área de Seleção: Pills/Tags */}
          <div className="flex-1 p-4 overflow-y-auto bg-white">
            <div className="flex flex-wrap gap-2 content-start">
              {activeTab === "protein" && PROTEIN_RANGES.map((r) => (
                <Tag 
                  key={r.value} 
                  label={r.label} 
                  active={selectedProteinRanges.includes(r.value)} 
                  onClick={() => toggle(r.value, selectedProteinRanges, setSelectedProteinRanges)} 
                />
              ))}
              {activeTab === "brand" && sortedBrands.map((b) => (
                <Tag 
                  key={b} 
                  label={b} 
                  active={selectedBrands.includes(b)} 
                  onClick={() => toggle(b, selectedBrands, setSelectedBrands)} 
                />
              ))}
              {activeTab === "flavor" && sortedFlavors.map((f) => (
                <Tag 
                  key={f} 
                  label={f} 
                  active={selectedFlavors.includes(f)} 
                  onClick={() => toggle(f, selectedFlavors, setSelectedFlavors)} 
                />
              ))}
            </div>
          </div>
        </div>

        {/* Rodapé: Ações de Limpar e Aplicar */}
        <div className="p-4 bg-white border-t border-zinc-200 flex items-center gap-3 shrink-0 pb-10">
          {hasAnyFilter && (
            <button
              onClick={clearInternalFilters}
              className="flex-1 py-3.5 border border-zinc-300 rounded-full text-[14px] font-bold text-zinc-900 bg-white active:bg-zinc-50 transition-all shadow-sm"
            >
              Limpar tudo
            </button>
          )}

          <button
            onClick={applyFilters}
            className={`${hasAnyFilter ? 'flex-[2]' : 'w-full'} bg-[#FFD814] border border-[#FCD200] text-[#0F1111] font-bold py-3.5 rounded-full shadow-sm active:scale-95 transition-all text-[14px]`}
          >
            Mostrar resultados
          </button>
        </div>
      </div>
    </>
  );
}

// Sub-componente Tag (Padrão Amazon Mobile)
function Tag({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-full text-[13px] border transition-all ${
        active
          ? "bg-[#EDFDFF] border-[#007185] text-[#007185] font-bold shadow-sm"
          : "bg-white border-zinc-300 text-zinc-700 active:bg-zinc-50"
      }`}
    >
      {label}
    </button>
  );
}