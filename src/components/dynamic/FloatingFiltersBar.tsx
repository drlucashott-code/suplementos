"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { SlidersHorizontal, ChevronDown } from "lucide-react";
import { useScrollDirection } from "@/hooks/useScrollDirection";

export type DynamicSortOption = {
  value: string;
  label: string;
};

export function FloatingFiltersBar({
  sortOptions = [
    { value: "best_value", label: "Melhor custo-beneficio" },
    { value: "price_asc", label: "Menor preco final" },
    { value: "discount", label: "Maior desconto" },
  ],
  defaultOrder = "best_value",
}: {
  sortOptions?: DynamicSortOption[];
  defaultOrder?: string;
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const scrollDirection = useScrollDirection();

  const order = searchParams.get("order") ?? defaultOrder;

  function openFilters() {
    window.dispatchEvent(new CustomEvent("open-filters"));
  }

  function changeOrder(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("order", value);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }

  const isVisible = scrollDirection !== "down";

  return (
    <div
      className={`sticky top-14 z-30 border-b border-zinc-200 bg-white px-3 py-2 shadow-sm transition-transform duration-300 ease-in-out ${
        isVisible ? "translate-y-0" : "-translate-y-full"
      }`}
      style={{ fontFamily: "Arial, Helvetica, sans-serif" }}
    >
      <div className="mx-auto flex max-w-[1200px] items-center gap-3">
        <button
          onClick={openFilters}
          className="flex flex-shrink-0 items-center justify-center rounded-lg border border-zinc-300 bg-white p-2.5 shadow-sm transition-colors active:bg-zinc-100"
          aria-label="Abrir filtros"
        >
          <SlidersHorizontal className="h-5 w-5 text-zinc-900" />
        </button>

        <div className="flex flex-1 items-center gap-2">
          <label
            htmlFor="sort-select"
            className="whitespace-nowrap text-[13px] font-normal leading-none text-zinc-600"
          >
            Ordenar por:
          </label>

          <div className="relative flex-1">
            <select
              id="sort-select"
              value={order}
              onChange={(e) => changeOrder(e.target.value)}
              className="w-full appearance-none rounded-lg border border-b-zinc-400 border-zinc-300 bg-zinc-50 px-3 py-2 pr-9 text-[13px] text-zinc-900 shadow-sm outline-none transition-all active:border-[#e47911]"
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 border-l border-zinc-300 pl-2">
              <ChevronDown className="h-4 w-4 text-zinc-500" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
