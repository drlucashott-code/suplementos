"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type Props = {
  brands: string[];
  sellers: string[];
  ratingOptions: Array<{ value: string; label: string }>;
  dynamicConfigs: { key: string; label: string }[];
  dynamicOptions: Record<string, Array<{ value: string; label: string }>>;
};

type FilterTab = {
  key: string;
  label: string;
  badgeCount: number;
};

type FilterOption = {
  value: string;
  label: string;
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
  const [filterQuery, setFilterQuery] = useState("");

  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedSellers, setSelectedSellers] = useState<string[]>([]);
  const [selectedRatings, setSelectedRatings] = useState<string[]>([]);
  const [selectedDynamics, setSelectedDynamics] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "unset";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [open]);

  useEffect(() => {
    function handleOpen() {
      setSelectedBrands(searchParams.get("brand")?.split(",") ?? []);
      setSelectedSellers(searchParams.get("seller")?.split(",") ?? []);
      setSelectedRatings(searchParams.get("rating")?.split(",") ?? []);

      const dynParams: Record<string, string[]> = {};
      dynamicConfigs.forEach((config) => {
        dynParams[config.key] = searchParams.get(config.key)?.split(",") ?? [];
      });
      setSelectedDynamics(dynParams);
      setFilterQuery("");
      setOpen(true);
    }

    window.addEventListener("open-filters", handleOpen);
    return () => window.removeEventListener("open-filters", handleOpen);
  }, [dynamicConfigs, searchParams]);

  const tabs: FilterTab[] = useMemo(
    () => [
      {
        key: "brand",
        label: "Marcas",
        badgeCount: selectedBrands.length,
      },
      {
        key: "seller",
        label: "Vendido por",
        badgeCount: selectedSellers.length,
      },
      {
        key: "rating",
        label: "Avalia\u00e7\u00f5es de clientes",
        badgeCount: selectedRatings.length,
      },
      ...dynamicConfigs.map((config) => ({
        key: config.key,
        label: formatFilterLabel(config.label),
        badgeCount: selectedDynamics[config.key]?.length || 0,
      })),
    ],
    [dynamicConfigs, selectedBrands.length, selectedDynamics, selectedRatings.length, selectedSellers.length]
  );

  const selectedCount =
    selectedBrands.length +
    selectedSellers.length +
    selectedRatings.length +
    Object.values(selectedDynamics).reduce((total, values) => total + values.length, 0);

  const normalizedQuery = filterQuery.trim().toLowerCase();

  const visibleTabs = useMemo(() => {
    if (!normalizedQuery) return tabs;
    return tabs.filter((tab) => tab.label.toLowerCase().includes(normalizedQuery));
  }, [normalizedQuery, tabs]);

  const activeOptions: FilterOption[] = useMemo(() => {
    if (activeTab === "brand") {
      return brands.map((value) => ({ value, label: value }));
    }
    if (activeTab === "seller") {
      return sellers.map((value) => ({ value, label: value }));
    }
    if (activeTab === "rating") {
      return ratingOptions;
    }
    return dynamicOptions[activeTab] || [];
  }, [activeTab, brands, dynamicOptions, ratingOptions, sellers]);

  const visibleOptions = useMemo(() => {
    if (!normalizedQuery) return activeOptions;
    return activeOptions.filter((option) =>
      formatFilterLabel(option.label).toLowerCase().includes(normalizedQuery)
    );
  }, [activeOptions, normalizedQuery]);

  const toggle = (value: string, list: string[], setList: (next: string[]) => void) => {
    setList(list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);
  };

  const toggleDynamic = (key: string, value: string) => {
    const currentValues = selectedDynamics[key] || [];
    const nextValues = currentValues.includes(value)
      ? currentValues.filter((item) => item !== value)
      : [...currentValues, value];
    setSelectedDynamics((prev) => ({ ...prev, [key]: nextValues }));
  };

  const applyFilters = () => {
    const params = new URLSearchParams(searchParams.toString());

    if (selectedBrands.length) params.set("brand", selectedBrands.join(","));
    else params.delete("brand");

    if (selectedSellers.length) params.set("seller", selectedSellers.join(","));
    else params.delete("seller");

    if (selectedRatings.length) params.set("rating", selectedRatings.join(","));
    else params.delete("rating");

    dynamicConfigs.forEach((config) => {
      if (selectedDynamics[config.key]?.length) {
        params.set(config.key, selectedDynamics[config.key].join(","));
      } else {
        params.delete(config.key);
      }
    });

    router.push(`?${params.toString()}`);
    setOpen(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] bg-white">
      <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4">
        <h2 className="text-[15px] font-semibold text-zinc-900">
          {selectedCount > 0 ? `Filtros (${selectedCount})` : "Filtros"}
        </h2>
        <button
          onClick={() => setOpen(false)}
          className="p-1 text-3xl font-light leading-none text-zinc-700"
          aria-label="Fechar filtros"
        >
          &times;
        </button>
      </div>

      <div className="border-b border-zinc-200 px-4 py-3">
        <div className="relative">
          <svg
            viewBox="0 0 24 24"
            className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-500"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21L16.65 16.65" />
          </svg>
          <input
            value={filterQuery}
            onChange={(event) => setFilterQuery(event.target.value)}
            placeholder="Pesquise filtros e marcas"
            className="h-12 w-full rounded-2xl border border-zinc-400 bg-white pl-11 pr-3 text-[15px] text-zinc-900 outline-none focus:border-zinc-600"
          />
        </div>
      </div>

      <div className="flex h-[calc(100vh-188px)]">
        <nav className="w-[34%] min-w-[130px] overflow-y-auto border-r border-zinc-200 bg-[#f2f3f3]">
          {visibleTabs.map((tab) => (
            <TabButton
              key={tab.key}
              label={tab.label}
              isActive={activeTab === tab.key}
              onClick={() => setActiveTab(tab.key)}
              badgeCount={tab.badgeCount}
            />
          ))}
        </nav>

        <div className="flex-1 overflow-y-auto bg-white px-4 py-4">
          <h3 className="mb-3 text-[18px] font-semibold text-zinc-900">
            {tabs.find((tab) => tab.key === activeTab)?.label || "Filtros"}
          </h3>

          <div className="flex flex-wrap gap-2">
            {activeTab === "brand" &&
              visibleOptions.map((option) => (
                <Tag
                  key={`brand-${option.value}`}
                  label={option.label}
                  active={selectedBrands.includes(option.value)}
                  onClick={() => toggle(option.value, selectedBrands, setSelectedBrands)}
                />
              ))}

            {activeTab === "seller" &&
              visibleOptions.map((option) => (
                <Tag
                  key={`seller-${option.value}`}
                  label={option.label}
                  active={selectedSellers.includes(option.value)}
                  onClick={() => toggle(option.value, selectedSellers, setSelectedSellers)}
                />
              ))}

            {activeTab === "rating" &&
              visibleOptions.map((option) => (
                <RatingTag
                  key={`rating-${option.value}`}
                  label={option.label}
                  active={selectedRatings.includes(option.value)}
                  onClick={() => toggle(option.value, selectedRatings, setSelectedRatings)}
                />
              ))}

            {dynamicConfigs.map(
              (config) =>
                activeTab === config.key &&
                visibleOptions.map((option) => (
                  <Tag
                    key={`${config.key}-${option.value}`}
                    label={option.label}
                    active={(selectedDynamics[config.key] || []).includes(option.value)}
                    onClick={() => toggleDynamic(config.key, option.value)}
                  />
                ))
            )}
          </div>

          {visibleOptions.length === 0 ? (
            <p className="mt-6 text-[13px] text-zinc-500">Nenhum resultado para sua busca.</p>
          ) : null}
        </div>
      </div>

      <div className="border-t border-zinc-200 bg-white px-4 pb-7 pt-3">
        <div className="flex items-center justify-between gap-3">
          {selectedCount > 0 ? (
            <button
              onClick={() => {
                setSelectedBrands([]);
                setSelectedSellers([]);
                setSelectedRatings([]);
                setSelectedDynamics({});
              }}
              className="h-11 rounded-full border border-zinc-400 bg-white px-5 text-[16px] font-medium text-zinc-800"
            >
              Limpar filtros
            </button>
          ) : (
            <div />
          )}

          <button
            onClick={applyFilters}
            className="h-11 rounded-full border border-[#FCD200] bg-[#FFD814] px-6 text-[16px] font-medium text-[#0F1111]"
          >
            Mostrar resultados
          </button>
        </div>
      </div>
    </div>
  );
}

function formatFilterLabel(value: string) {
  if (!value) return value;

  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, "");

  if (normalized === "cachorro" || normalized === "cao") return "C\u00e3o";
  if (normalized === "gato") return "Gato";
  if (
    normalized === "cachorro/gato" ||
    normalized === "cachorroegato" ||
    normalized === "cachorro,gato" ||
    normalized === "cao/gato" ||
    normalized === "caoegato"
  ) {
    return "C\u00e3o/gato";
  }

  return value.charAt(0).toUpperCase() + value.slice(1);
}

function TabButton({
  label,
  isActive,
  onClick,
  badgeCount,
}: {
  label: string;
  isActive: boolean;
  onClick: () => void;
  badgeCount: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative w-full border-l-[3px] px-4 py-4 text-left text-[13px] leading-[1.2] transition-all ${
        isActive
          ? "border-[#007185] bg-white font-semibold text-[#007185]"
          : "border-transparent text-zinc-700"
      }`}
    >
      {label}
      {badgeCount > 0 ? (
        <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[#007185]" />
      ) : null}
      <span className="pointer-events-none absolute inset-x-0 bottom-0 border-b border-zinc-200" />
    </button>
  );
}

function Tag({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-2xl border px-3 py-2 text-[14px] transition-all ${
        active
          ? "border-[#007185] bg-[#EDFDFF] font-semibold text-[#007185]"
          : "border-zinc-400 bg-white text-zinc-800"
      }`}
    >
      {formatFilterLabel(label)}
    </button>
  );
}

function RatingTag({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  const hasFourStars = label.includes("★★★★");

  return (
    <button
      onClick={onClick}
      className={`rounded-2xl border px-4 py-2 text-[16px] transition-all ${
        active ? "border-[#007185] bg-[#EDFDFF]" : "border-zinc-400 bg-white"
      }`}
    >
      {hasFourStars ? (
        <span className="font-medium text-zinc-900">
          <span className="text-[#C37B16]">★★★★</span> e acima
        </span>
      ) : (
        <span className="font-medium text-zinc-900">{label}</span>
      )}
    </button>
  );
}
