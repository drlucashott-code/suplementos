"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { SlidersHorizontal } from "lucide-react";
import { useScrollDirection } from "@/hooks/useScrollDirection";

const sortOptions = [
  { value: "cheapest_unit", label: "Custo-benefício" },
  { value: "price_asc", label: "Menor preço" },
  { value: "discount", label: "Ofertas" },
];

export function FloatingFiltersBar() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const scrollDirection = useScrollDirection();

  const order = searchParams.get("order") ?? "cheapest_unit";
  const isVisible = scrollDirection !== "down";

  function openFilters() {
    window.dispatchEvent(new CustomEvent("open-filters"));
  }

  function updateParam(key: string, value?: string) {
    const params = new URLSearchParams(searchParams.toString());

    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }

    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <div
      className={`sticky top-[68px] z-30 border-b border-[#E7E7E7] bg-white transition-transform duration-300 ease-in-out ${
        isVisible ? "translate-y-0" : "-translate-y-full"
      }`}
    >
      <div className="mx-auto flex max-w-[1200px] gap-2 overflow-x-auto px-2 py-3 scrollbar-none">
        <button
          onClick={openFilters}
          className="flex h-12 shrink-0 items-center justify-center gap-2 rounded-[14px] border border-[#C7C7C7] bg-white px-4 text-[15px] text-[#0F1111] shadow-[0_1px_2px_rgba(0,0,0,0.08)]"
          aria-label="Abrir filtros"
        >
          <SlidersHorizontal className="h-4 w-4" />
          <span>Filtros</span>
        </button>

        {sortOptions.map((option) => {
          const active = order === option.value;

          return (
            <button
              key={option.value}
              onClick={() => updateParam("order", option.value)}
              className={`flex h-12 shrink-0 items-center rounded-[14px] border px-4 text-[15px] shadow-[0_1px_2px_rgba(0,0,0,0.08)] transition-colors ${
                active
                  ? "border-[#111] bg-[#111] text-white"
                  : "border-[#C7C7C7] bg-white text-[#0F1111]"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
