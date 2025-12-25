"use client";

import { useRouter, useSearchParams } from "next/navigation";

export function MobileStickySearch() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const value = searchParams.get("q") ?? "";

  function onChange(v: string) {
    const params = new URLSearchParams(searchParams.toString());

    if (!v.trim()) {
      params.delete("q");
    } else {
      params.set("q", v);
    }

    router.push(`/creatina?${params.toString()}`);
  }

  return (
    <div className="sticky top-0 z-40 bg-white border-b sm:hidden">
      <div className="px-4 py-3">
        <input
          type="text"
          placeholder="Buscar por marca ou nome"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full border rounded-lg p-3 text-sm"
        />
      </div>
    </div>
  );
}
