"use client";

import { CreatineForm } from "@prisma/client";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useMemo } from "react";

type Props = {
  brands: string[];
  flavors: string[];
};

type FilterTab = "form" | "brand" | "flavor";

// ✅ Exportação Nomeada para evitar erros de importação no page.tsx
export function MobileFiltersDrawer({ brands, flavors }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<FilterTab>("form");

  // Estados dos Filtros
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedFlavors, setSelectedFlavors] = useState<string[]>([]);
  const [selectedForms, setSelectedForms] = useState<CreatineForm[]>([]);

  // Sincronização com a URL ao abrir o Drawer
  useEffect(() => {
    function handleOpen() {
      setSelectedBrands(searchParams.get("brand")?.split(",") ?? []);
      setSelectedFlavors(searchParams.get("flavor")?.split(",") ?? []);
      setSelectedForms((searchParams.get("form")?.split(",") as CreatineForm[]) ?? []);
      setOpen(true);
    }
    window.addEventListener("open-filters", handleOpen);
    return () => window.removeEventListener("open-filters", handleOpen);
  }, [searchParams]);

  // Lógica de Seleção de Tags
  const toggle = <T,>(value: T, list: T[], setList: (v: T[]) => void) => {
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  };

  const hasAnyFilter = selectedBrands.length > 0 || selectedFlavors.length > 0 || selectedForms.length > 0;
  const totalFilters = selectedBrands.length + selectedFlavors.length + selectedForms.length;

  const clearInternalFilters = () => {
    setSelectedBrands([]);
    setSelectedFlavors([]);
    setSelectedForms([]);
  };

  const applyFilters = () => {
    const params = new URLSearchParams(searchParams.toString());
    
    if (selectedBrands.length) params.set("brand", selectedBrands.join(","));
    else params.delete("brand");

    if (selectedFlavors.length) params.set("flavor", selectedFlavors.join(","));
    else params.delete("flavor");

    if (selectedForms.length) params.set("form", selectedForms.join(","));
    else params.delete("form");

    // Mantém a query de busca se existir
    router.push(`/creatina?${params.toString()}`);
    setOpen(false);
  };

  // 🔤 Listas Ordenadas (A-Z) para melhor UX
  const sortedBrands = useMemo(() => [...brands].sort((a, b) => a.localeCompare(b)), [brands]);
  const sortedFlavors = useMemo(() => [...flavors].sort((a, b) => a.localeCompare(b)), [flavors]);
  const sortedForms = useMemo(() => [
    { value: CreatineForm.CAPSULE, label: "Cápsula" },
    { value: CreatineForm.GUMMY, label: "Gummy" },
    { value: CreatineForm.POWDER, label: "Pó" },
  ].sort((a, b) => a.label.localeCompare(b.label)), []);

  if (!open) return null;

  return (
    <>
      {/* Overlay - Background escurecido */}
      <div 
        className="fixed inset-0 bg-black/60 z-[60] animate-in fade-in duration-200" 
        onClick={() => setOpen(false)} 
        aria-hidden="true"
      />

      {/* Drawer Container */}
      <div 
        className="fixed bottom-0 left-0 right-0 z-[70] bg-white rounded-t-2xl flex flex-col overflow-hidden shadow-2xl transition-all animate-in slide-in-from-bottom duration-300" 
        style={{ height: "90vh" }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
      >
        
        {/* Header com Contador */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h2 id="drawer-title" className="text-lg font-bold text-[#0F1111]">
            Filtros {hasAnyFilter && <span className="text-[#007185] ml-1">({totalFilters})</span>}
          </h2>
          <button 
            onClick={() => setOpen(false)} 
            className="text-zinc-500 hover:text-zinc-800 text-3xl font-light p-2"
            aria-label="Fechar filtros"
          >
            &times;
          </button>
        </div>

        {/* Conteúdo Principal (Abas + Opções) */}
        <div className="flex flex-1 overflow-hidden">
          {/* Coluna Esquerda: Menu de Categorias */}
          <nav className="w-[130px] bg-[#F7F8F8] border-r border-gray-200 overflow-y-auto">
            {[
              { id: "form", label: "Apresentação" },
              { id: "brand", label: "Marcas" },
              { id: "flavor", label: "Sabor" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as FilterTab)}
                className={`w-full text-left px-4 py-6 text-[13px] leading-tight font-medium transition-all border-l-4 ${
                  activeTab === tab.id 
                    ? "bg-white border-[#e47911] text-[#e47911]" 
                    : "border-transparent text-zinc-600 hover:text-zinc-900"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          {/* Coluna Direita: Opções Selecionáveis */}
          <div className="flex-1 p-4 overflow-y-auto bg-white">
            <div className="flex flex-wrap gap-2 content-start">
              {activeTab === "form" && sortedForms.map((f) => (
                <Tag 
                  key={f.value} 
                  label={f.label} 
                  active={selectedForms.includes(f.value)} 
                  onClick={() => toggle(f.value, selectedForms, setSelectedForms)} 
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

        {/* Footer com Botões de Ação */}
        <div className="p-4 bg-white border-t border-gray-200 flex items-center gap-3 pb-8">
          {hasAnyFilter && (
            <button
              onClick={clearInternalFilters}
              className="flex-1 py-3 border border-gray-300 rounded-full text-[14px] font-medium text-zinc-900 hover:bg-zinc-50 active:bg-zinc-100 transition-all"
            >
              Limpar tudo
            </button>
          )}

          <button
            onClick={applyFilters}
            className={`${hasAnyFilter ? 'flex-[2]' : 'w-full'} bg-[#FFD814] hover:bg-[#F7CA00] border border-[#FCD200] text-[#0F1111] font-medium py-3.5 rounded-full shadow-sm active:scale-[0.98] transition-all text-[14px]`}
          >
            Mostrar resultados
          </button>
        </div>
      </div>
    </>
  );
}

// Sub-componente de Tag Otimizado
function Tag({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`px-4 py-2 rounded-full text-[13px] border transition-all ${
        active
          ? "bg-[#EDFDFF] border-[#007185] text-[#007185] font-bold shadow-sm"
          : "bg-white border-zinc-300 text-zinc-700 hover:border-zinc-400 active:bg-zinc-50"
      }`}
    >
      {label}
    </button>
  );
}