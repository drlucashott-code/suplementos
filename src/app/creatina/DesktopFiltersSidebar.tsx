"use client";

import { Store, CreatineForm } from "@prisma/client";
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

  function toggleParam(param: string, value: string) {
    const current = getSelected(param);
    const next = current.includes(value)
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

      {/* LOJA */}
      <div>
        <p className="font-medium text-sm mb-2">Loja</p>
        {Object.values(Store).map((store) => (
          <label key={store} className="flex gap-2 text-sm">
            <input
              type="checkbox"
              checked={getSelected("store").includes(store)}
              onChange={() => toggleParam("store", store)}
            />
            {store === Store.AMAZON ? "Amazon" : "Mercado Livre"}
          </label>
        ))}
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
          {brands.map((brand) => (
            <label key={brand} className="flex gap-2 text-sm">
              <input
                type="checkbox"
                checked={getSelected("brand").includes(brand)}
                onChange={() => toggleParam("brand", brand)}
              />
              {brand}
            </label>
          ))}
        </div>
      </div>

      {/* SABOR */}
      <div>
        <p className="font-medium text-sm mb-2">Sabor</p>
        {flavors.map((flavor) => (
          <label key={flavor} className="flex gap-2 text-sm">
            <input
              type="checkbox"
              checked={getSelected("flavor").includes(flavor)}
              onChange={() => toggleParam("flavor", flavor)}
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
              checked={getSelected("doses").includes(bucket)}
              onChange={() => toggleParam("doses", bucket)}
            />
            {bucket}
          </label>
        ))}
      </div>
    </div>
  );
}
