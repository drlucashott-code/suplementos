"use client";

import { CreatineForm } from "@prisma/client";
import { useRouter, useSearchParams } from "next/navigation";

type Props = {
  brands: string[];
  flavors: string[];
};

const DOSE_BUCKETS = ["<50", "51-100", "101-150", ">150"];

export function DesktopFiltersSidebar({ brands, flavors }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function getSelected(param: string): string[] {
    return searchParams.get(param)?.split(",") ?? [];
  }

  function track(event: string, data?: object) {
    if (typeof window !== "undefined" && "gtag" in window) {
      // @ts-ignore
      window.gtag("event", event, data);
    }
  }

  function toggleParam(param: string, value: string) {
    const current = getSelected(param);
    const isRemoving = current.includes(value);

    track("toggle_filter_desktop", {
      filter_type: param,
      filter_value: value,
      action: isRemoving ? "remove" : "add",
    });

    const next = isRemoving
      ? current.filter((v) => v !== value)
      : [...current, value];

    const params = new URLSearchParams(searchParams.toString());

    if (next.length === 0) {
      params.delete(param);
    } else {
      params.set(param, next.join(","));
    }

    router.push(`/creatina?${params.toString()}`);
  }

  function clearFilters() {
    track("clear_filters_desktop");
    router.push("/creatina");
  }

  return (
    <div className="border rounded-xl p-4 space-y-6 bg-white">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg">Filtros</h3>
        <button
          onClick={clearFilters}
          className="text-xs text-gray-500 hover:underline"
        >
          Limpar filtros
        </button>
      </div>

      {/* APRESENTAÇÃO */}
      <div>
        <p className="font-medium text-sm mb-2">Apresentação</p>
        {[
          { value: CreatineForm.CAPSULE, label: "Cápsula" },
          { value: CreatineForm.GUMMY, label: "Gummy" },
          { value: CreatineForm.POWDER, label: "Pó" },
        ].map((f) => (
          <label key={f.value} className="flex gap-2 text-sm">
            <input
              type="checkbox"
              checked={getSelected("form").includes(f.value)}
              onChange={() => toggleParam("form", f.value)}
            />
            {f.label}
          </label>
        ))}
      </div>

      {/* MARCA */}
      <div>
        <p className="font-medium text-sm mb-2">Marca</p>
        <div className="space-y-1 max-h-40 overflow-auto">
          {[...brands].sort().map((brand) => (
            <label key={brand} className="flex gap-2 text-sm">
              <input
                type="checkbox"
                checked={getSelected("brand").includes(brand)}
                onChange={() =>
                  toggleParam("brand", brand)
                }
              />
              {brand}
            </label>
          ))}
        </div>
      </div>

      {/* SABOR */}
      <div>
        <p className="font-medium text-sm mb-2">Sabor</p>
        {[...flavors].sort().map((flavor) => (
          <label key={flavor} className="flex gap-2 text-sm">
            <input
              type="checkbox"
              checked={getSelected("flavor").includes(flavor)}
              onChange={() =>
                toggleParam("flavor", flavor)
              }
            />
            {flavor}
          </label>
        ))}
      </div>

      {/* DOSES */}
      <div>
        <p className="font-medium text-sm mb-2">Doses</p>
        {DOSE_BUCKETS.map((bucket) => (
          <label key={bucket} className="flex gap-2 text-sm">
            <input
              type="checkbox"
              checked={getSelected("doses").includes(
                bucket
              )}
              onChange={() =>
                toggleParam("doses", bucket)
              }
            />
            {bucket}
          </label>
        ))}
      </div>
    </div>
  );
}
