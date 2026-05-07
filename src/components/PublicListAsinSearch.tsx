"use client";

import { Search, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function PublicListAsinSearch({
  className = "",
  paramName = "asin",
  placeholder = "Buscar por ASIN",
}: {
  className?: string;
  paramName?: string;
  placeholder?: string;
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const current = searchParams.get(paramName) ?? "";
  const [value, setValue] = useState(current);

  useEffect(() => {
    setValue(current);
  }, [current]);

  function commit(nextValue: string) {
    const params = new URLSearchParams(searchParams.toString());
    const normalized = nextValue.trim();
    if (normalized) {
      params.set(paramName, normalized);
    } else {
      params.delete(paramName);
    }
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <form
      className={className}
      onSubmit={(e) => {
        e.preventDefault();
        commit(value);
      }}
    >
      <div className="relative w-full min-w-[240px]">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          className="h-10 w-full rounded-full border border-[#d5d9d9] bg-white pl-9 pr-20 text-sm text-[#0F1111] shadow-sm outline-none transition focus:border-[#aab7b8]"
        />
        {value ? (
          <button
            type="button"
            onClick={() => {
              setValue("");
              commit("");
            }}
            className="absolute right-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-[#d5d9d9] bg-white text-[#565959] transition hover:border-[#aab7b8] hover:text-[#0F1111]"
            aria-label="Limpar busca"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>
    </form>
  );
}
