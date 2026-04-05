"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react"; // 🚀 useMemo removido

type Props = {
  brands: string[];
  sellers: string[];
  ratingOptions: Array<{ value: string; label: string }>;
  dynamicConfigs: { key: string; label: string }[];
  dynamicOptions: Record<string, Array<{ value: string; label: string }>>;
};

export function MobileFiltersDrawer({
  brands,
  sellers,
  ratingOptions,
  dynamicConfigs,
  dynamicOptions,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("brand");

  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedSellers, setSelectedSellers] = useState<string[]>([]);
  const [selectedRatings, setSelectedRatings] = useState<string[]>([]);
  const [selectedDynamics, setSelectedDynamics] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "unset";
    return () => { document.body.style.overflow = "unset"; };
  }, [open]);

  useEffect(() => {
    function handleOpen() {
      setSelectedBrands(searchParams.get("brand")?.split(",") ?? []);
      setSelectedSellers(searchParams.get("seller")?.split(",") ?? []);
      setSelectedRatings(searchParams.get("rating")?.split(",") ?? []);
      
      const dynParams: Record<string, string[]> = {};
      dynamicConfigs.forEach(c => {
        dynParams[c.key] = searchParams.get(c.key)?.split(",") ?? [];
      });
      setSelectedDynamics(dynParams);
      
      setOpen(true);
    }
    window.addEventListener("open-filters", handleOpen);
    return () => window.removeEventListener("open-filters", handleOpen);
  }, [searchParams, dynamicConfigs]);

  const toggle = (value: string, list: string[], setList: (v: string[]) => void) => {
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  };

  const toggleDynamic = (key: string, value: string) => {
    const list = selectedDynamics[key] || [];
    const nextList = list.includes(value) ? list.filter(v => v !== value) : [...list, value];
    setSelectedDynamics(prev => ({ ...prev, [key]: nextList }));
  };

  const applyFilters = () => {
    const params = new URLSearchParams(searchParams.toString());
    
    if (selectedBrands.length) params.set("brand", selectedBrands.join(","));
    else params.delete("brand");

    if (selectedSellers.length) params.set("seller", selectedSellers.join(",")); 
    else params.delete("seller");

    if (selectedRatings.length) params.set("rating", selectedRatings.join(","));
    else params.delete("rating");

    dynamicConfigs.forEach(c => {
      if (selectedDynamics[c.key]?.length) params.set(c.key, selectedDynamics[c.key].join(","));
      else params.delete(c.key);
    });

    router.push(`?${params.toString()}`);
    setOpen(false);
  };

  const clearInternalFilters = () => {
    setSelectedBrands([]);
    setSelectedSellers([]);
    setSelectedRatings([]);
    setSelectedDynamics({});
  };

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-[60] animate-in fade-in duration-200" onClick={() => setOpen(false)} />
      <div className="fixed bottom-0 left-0 right-0 z-[70] bg-white rounded-t-2xl flex flex-col overflow-hidden shadow-2xl h-[85vh] animate-in slide-in-from-bottom duration-300">
        
        <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-200 bg-[#f0f2f2]">
          <h2 className="text-[16px] font-bold text-zinc-900">Filtros</h2>
          <button onClick={() => setOpen(false)} className="text-zinc-500 text-3xl font-light p-1 leading-none">&times;</button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <nav className="w-[130px] bg-[#f0f2f2] border-r border-zinc-200 overflow-y-auto">
            <TabButton label="Marcas" isActive={activeTab === "brand"} onClick={() => setActiveTab("brand")} badgeCount={selectedBrands.length} />
            <TabButton label="Vendido por" isActive={activeTab === "seller"} onClick={() => setActiveTab("seller")} badgeCount={selectedSellers.length} />
            <TabButton
              label="Avaliações"
              isActive={activeTab === "rating"}
              onClick={() => setActiveTab("rating")}
              badgeCount={selectedRatings.length}
            />
            {dynamicConfigs.map(c => (
              <TabButton key={c.key} label={c.label} isActive={activeTab === c.key} onClick={() => setActiveTab(c.key)} badgeCount={selectedDynamics[c.key]?.length || 0} />
            ))}
          </nav>

          <div className="flex-1 p-4 overflow-y-auto bg-white">
            <div className="flex flex-wrap gap-2 content-start">
              {activeTab === "brand" && brands.map((b) => (
                <Tag key={b} label={b} active={selectedBrands.includes(b)} onClick={() => toggle(b, selectedBrands, setSelectedBrands)} />
              ))}
              {activeTab === "seller" && sellers.map((s) => (
                <Tag key={s} label={s} active={selectedSellers.includes(s)} onClick={() => toggle(s, selectedSellers, setSelectedSellers)} />
              ))}
              {activeTab === "rating" &&
                ratingOptions.map((option) => (
                  <Tag
                    key={`rating-${option.value}`}
                    label={option.label}
                    active={selectedRatings.includes(option.value)}
                    onClick={() =>
                      toggle(option.value, selectedRatings, setSelectedRatings)
                    }
                  />
                ))}
              {dynamicConfigs.map(c => activeTab === c.key && dynamicOptions[c.key]?.map(opt => (
                <Tag
                  key={`${c.key}-${opt.value}`}
                  label={opt.label}
                  active={(selectedDynamics[c.key] || []).includes(opt.value)}
                  onClick={() => toggleDynamic(c.key, opt.value)}
                />
              )))}
            </div>
          </div>
        </div>

        <div className="p-3 bg-white border-t border-zinc-200 flex items-center gap-3 shrink-0 pb-8">
           <button onClick={clearInternalFilters} className="flex-1 py-3 border border-zinc-300 rounded-full text-[13px] font-medium text-zinc-800 bg-white hover:bg-zinc-50">Limpar tudo</button>
          <button onClick={applyFilters} className="flex-[2] bg-[#FFD814] border border-[#FCD200] text-[#0F1111] font-medium py-3 rounded-full shadow-sm active:scale-95 transition-all text-[13px]">Mostrar resultados</button>
        </div>
      </div>
    </>
  );
}

function formatFilterLabel(value: string) {
  if (!value) return value;

  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, "");

  if (normalized === "cachorro" || normalized === "cao") return "Cão";
  if (normalized === "gato") return "Gato";
  if (
    normalized === "cachorro/gato" ||
    normalized === "cachorroegato" ||
    normalized === "cachorro,gato" ||
    normalized === "cao/gato" ||
    normalized === "caoegato"
  ) {
    return "Cão/gato";
  }

  return value.charAt(0).toUpperCase() + value.slice(1);
}

function TabButton({ label, isActive, onClick, badgeCount }: { label: string; isActive: boolean; onClick: () => void; badgeCount: number }) {
  return (
    <button onClick={onClick} className={`w-full text-left px-4 py-4 text-[13px] leading-tight font-bold transition-all border-l-[4px] relative ${isActive ? "bg-white border-[#007185] text-[#007185]" : "border-transparent text-zinc-600 hover:bg-[#e3e6e6]"}`}>
      {formatFilterLabel(label)}
      {badgeCount > 0 && <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#007185]" />}
    </button>
  );
}

function Tag({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`px-3 py-2 rounded-lg text-[13px] border transition-all text-left ${active ? "bg-[#EDFDFF] border-[#007185] text-[#007185] font-bold ring-1 ring-[#007185]" : "bg-white border-zinc-300 text-zinc-700 hover:bg-zinc-50"}`}>
      {formatFilterLabel(label)}
    </button>
  );
}
