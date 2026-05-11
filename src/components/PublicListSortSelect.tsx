"use client";

import { ChevronDown } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export type PublicListSortOption = {
  value: string;
  label: string;
};

export default function PublicListSortSelect({
  options,
  defaultOrder = "creator",
  label = "Ordenar por:",
  paramName = "order",
  className = "",
}: {
  options: PublicListSortOption[];
  defaultOrder?: string;
  label?: string;
  paramName?: string;
  className?: string;
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const current = searchParams.get(paramName) ?? defaultOrder;

  function changeOrder(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set(paramName, value);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <div className={className}>
      <div className="flex items-center gap-2">
        <label
          htmlFor={`${paramName}-select`}
          className="whitespace-nowrap text-[13px] font-normal leading-none text-[#565959]"
        >
          {label}
        </label>

        <div className="relative min-w-0 flex-1">
          <select
            id={`${paramName}-select`}
            value={current}
            onChange={(e) => changeOrder(e.target.value)}
            className="h-10 w-full appearance-none rounded-lg border border-[#d5d9d9] bg-white px-3 pr-9 text-[13px] text-[#0F1111] outline-none shadow-sm transition focus:border-[#2162A1] focus:bg-white"
          >
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 border-l border-[#d5d9d9] pl-2">
            <ChevronDown className="h-4 w-4 text-[#565959]" />
          </div>
        </div>
      </div>
    </div>
  );
}
