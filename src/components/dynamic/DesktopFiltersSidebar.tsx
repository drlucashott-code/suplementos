"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

type Option = { value: string; label: string };

type Props = {
  brands: string[];
  sellers: string[];
  ratingOptions: Option[];
  dynamicConfigs: { key: string; label: string }[];
  dynamicOptions: Record<string, Option[]>;
};

type Section = {
  key: string;
  title: string;
  paramKey: string;
  options: Option[];
  isRating?: boolean;
};

const DEFAULT_VISIBLE = 6;

function formatLabel(value: string) {
  if (!value) return value;
  const normalized = value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, "");
  if (normalized === "cachorro" || normalized === "cao") return "Cão";
  if (normalized === "gato") return "Gato";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function DesktopFiltersSidebar({
  brands,
  sellers,
  ratingOptions,
  dynamicConfigs,
  dynamicOptions,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const sections: Section[] = useMemo(() => {
    const base: Section[] = [
      {
        key: "brand",
        title: "Marcas",
        paramKey: "brand",
        options: brands.map((value) => ({ value, label: value })),
      },
      {
        key: "seller",
        title: "Vendido por",
        paramKey: "seller",
        options: sellers.map((value) => ({ value, label: value })),
      },
      {
        key: "rating",
        title: "Avaliações",
        paramKey: "rating",
        options: ratingOptions,
        isRating: true,
      },
      ...dynamicConfigs.map((config) => ({
        key: config.key,
        title: formatLabel(config.label),
        paramKey: config.key,
        options: dynamicOptions[config.key] ?? [],
      })),
    ];
    return base.filter((section) => section.options.length > 0);
  }, [brands, sellers, ratingOptions, dynamicConfigs, dynamicOptions]);

  const getSelected = (paramKey: string) =>
    searchParams.get(paramKey)?.split(",").filter(Boolean) ?? [];

  const selectedCount = sections.reduce(
    (total, section) => total + getSelected(section.paramKey).length,
    0
  );

  const toggle = (paramKey: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    const current = params.get(paramKey)?.split(",").filter(Boolean) ?? [];
    const next = current.includes(value)
      ? current.filter((item) => item !== value)
      : [...current, value];
    if (next.length) params.set(paramKey, next.join(","));
    else params.delete(paramKey);
    router.push(`?${params.toString()}`, { scroll: false });
  };

  const clearAll = () => {
    const params = new URLSearchParams(searchParams.toString());
    sections.forEach((section) => params.delete(section.paramKey));
    router.push(`?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="pr-1">
      <div className="mb-3 flex items-center justify-between border-b border-[#E7E7E7] pb-2">
        <h2 className="text-[16px] font-bold text-[#0F1111]">Filtros</h2>
        {selectedCount > 0 ? (
          <button
            type="button"
            onClick={clearAll}
            className="text-[12px] font-semibold text-[#2162A1] hover:text-[#174e87]"
          >
            Limpar ({selectedCount})
          </button>
        ) : null}
      </div>

      <div className="space-y-4">
        {sections.map((section) => {
          const selected = getSelected(section.paramKey);
          const isExpanded = expanded[section.key];
          const visible = isExpanded
            ? section.options
            : section.options.slice(0, DEFAULT_VISIBLE);

          return (
            <div key={section.key}>
              <h3 className="mb-1.5 text-[15px] font-bold text-[#0F1111]">{section.title}</h3>
              <ul className="space-y-1.5">
                {visible.map((option) => {
                  const active = selected.includes(option.value);
                  return (
                    <li key={`${section.key}-${option.value}`}>
                      <button
                        type="button"
                        onClick={() => toggle(section.paramKey, option.value)}
                        className="flex w-full items-center gap-2 text-left text-[13px] text-[#0F1111] transition hover:text-[#007185]"
                      >
                        <span
                          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                            active
                              ? "border-[#007185] bg-[#007185] text-white"
                              : "border-[#888C8C] bg-white"
                          }`}
                          aria-hidden="true"
                        >
                          {active ? (
                            <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <path d="M3 8.5l3 3 7-7" />
                            </svg>
                          ) : null}
                        </span>
                        {section.isRating ? (
                          <RatingLabel label={option.label} />
                        ) : (
                          <span className={`truncate ${active ? "font-semibold text-[#007185]" : ""}`}>
                            {formatLabel(option.label)}
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>

              {section.options.length > DEFAULT_VISIBLE ? (
                <button
                  type="button"
                  onClick={() =>
                    setExpanded((prev) => ({ ...prev, [section.key]: !prev[section.key] }))
                  }
                  className="mt-2 text-[12px] font-semibold text-[#2162A1] hover:text-[#174e87]"
                >
                  {isExpanded
                    ? "Ver menos"
                    : `Ver mais (${section.options.length - DEFAULT_VISIBLE})`}
                </button>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RatingLabel({ label }: { label: string }) {
  const hasFourStars = label.includes("★★★★");
  if (hasFourStars) {
    return (
      <span className="text-[13px] text-[#0F1111]">
        <span className="text-[#C37B16]">★★★★</span> e acima
      </span>
    );
  }
  return <span className="text-[13px] text-[#0F1111]">{label}</span>;
}
