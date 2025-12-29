"use client";

import { useRouter, useSearchParams } from "next/navigation";

type Props = {
  brands: string[];
  flavors: string[];
};

const PROTEIN_RANGES = [
  "50-60",
  "60-70",
  "70-80",
  "80-90",
  "90-100",
];

export function DesktopFiltersSidebar({ brands, flavors }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function getSelected(param: string): string[] {
    return searchParams.get(param)?.split(",") ?? [];
  }

  function toggleParam(param: string, value: string) {
    const current = getSelected(param);
    const isRemoving = current.includes(value);

    const next = isRemoving
      ? current.filter((v) => v !== value)
      : [...current, value];

    const params = new URLSearchParams(searchParams.toString());

    if (next.length === 0) {
      params.delete(param);
    } else {
      params.set(param, next.join(","));
    }

    // 🔑 sempre resetar página ao filtrar
    params.delete("page");

    router.push(`/whey?${params.toString()}`);
  }

  function setOrder(order: "cost" | "protein") {
    const params = new URLSearchParams(searchParams.toString());
    params.set("order", order);
    params.delete("page");
    router.push(`/whey?${params.toString()}`);
  }

  function clearFilters() {
    router.push("/whey");
  }

  const currentOrder =
    (searchParams.get("order") as "cost" | "protein") ?? "cost";

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

      {/* ORDENAÇÃO */}
      <div>
        <p className="font-medium text-sm mb-2">Ordenar por</p>

        <label className="flex gap-2 text-sm mb-1">
          <input
            type="radio"
            checked={currentOrder === "cost"}
            onChange={() => setOrder("cost")}
          />
          Melhor custo por proteína
        </label>

        <label className="flex gap-2 text-sm">
          <input
            type="radio"
            checked={currentOrder === "protein"}
            onChange={() => setOrder("protein")}
          />
          Maior % de proteína
        </label>
      </div>

      {/* CONCENTRAÇÃO DE PROTEÍNA */}
      <div>
        <p className="font-medium text-sm mb-2">
          Concentração de proteína
        </p>

        {PROTEIN_RANGES.map((range) => (
          <label key={range} className="flex gap-2 text-sm">
            <input
              type="checkbox"
              checked={getSelected("proteinRange").includes(range)}
              onChange={() => toggleParam("proteinRange", range)}
            />
            {range.replace("-", "–")}%
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
        {[...flavors].sort().map((flavor) => (
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
    </div>
  );
}
