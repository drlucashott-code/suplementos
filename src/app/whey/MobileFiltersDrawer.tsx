"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

type Props = {
  brands: string[];
  flavors: string[];
};

export function MobileFiltersDrawer({ brands, flavors }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);

  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedFlavors, setSelectedFlavors] = useState<string[]>([]);
  const [order, setOrder] = useState<"cost" | "protein">("cost");
  const [tempPrice, setTempPrice] = useState<number>(200);

  useEffect(() => {
    if (!open) return;

    setSelectedBrands(searchParams.get("brand")?.split(",") ?? []);
    setSelectedFlavors(searchParams.get("flavor")?.split(",") ?? []);
    setOrder((searchParams.get("order") as "cost" | "protein") ?? "cost");
    setTempPrice(Number(searchParams.get("priceMax")) || 200);
  }, [open, searchParams]);

  function toggle(
    value: string,
    list: string[],
    setList: (v: string[]) => void
  ) {
    setList(
      list.includes(value)
        ? list.filter((v) => v !== value)
        : [...list, value]
    );
  }

  function applyFilters() {
    const params = new URLSearchParams();

    if (selectedBrands.length)
      params.set("brand", selectedBrands.join(","));
    if (selectedFlavors.length)
      params.set("flavor", selectedFlavors.join(","));

    params.set("order", order);
    params.set("priceMax", String(tempPrice));

    router.push(`/whey?${params.toString()}`);
    setOpen(false);
  }

  function clearFilters() {
    setSelectedBrands([]);
    setSelectedFlavors([]);
    setOrder("cost");
    setTempPrice(200);
    router.push("/whey");
    setOpen(false);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="sm:hidden w-full bg-white text-black px-4 py-3 rounded-xl shadow border flex items-center justify-center gap-2"
      >
        <span className="font-medium text-sm">Filtrar produtos</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-40 sm:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <div
        className={`fixed bottom-0 left-0 right-0 z-50 sm:hidden bg-white rounded-t-2xl transition-transform duration-300 flex flex-col ${
          open ? "translate-y-0" : "translate-y-full"
        }`}
        style={{ height: "90vh" }}
      >
        <div className="p-5 border-b flex justify-between items-center">
          <h2 className="font-semibold text-lg">Filtros</h2>
          <button
            onClick={() => setOpen(false)}
            className="text-gray-500 text-sm"
          >
            Fechar
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex-1 space-y-6">
          <div>
            <p className="font-medium mb-2">Ordenar por</p>

            <label className="flex items-center gap-2 text-sm mb-2">
              <input
                type="radio"
                checked={order === "cost"}
                onChange={() => setOrder("cost")}
              />
              Melhor custo por proteína
            </label>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                checked={order === "protein"}
                onChange={() => setOrder("protein")}
              />
              Maior % de proteína
            </label>
          </div>

          <div>
            <p className="font-medium mb-2">Marca</p>
            {[...brands].sort().map((b) => (
              <label key={b} className="flex items-center gap-2 text-sm mb-2">
                <input
                  type="checkbox"
                  checked={selectedBrands.includes(b)}
                  onChange={() =>
                    toggle(b, selectedBrands, setSelectedBrands)
                  }
                />
                {b}
              </label>
            ))}
          </div>

          <div>
            <p className="font-medium mb-2">Sabor</p>
            {[...flavors].sort().map((f) => (
              <label key={f} className="flex items-center gap-2 text-sm mb-2">
                <input
                  type="checkbox"
                  checked={selectedFlavors.includes(f)}
                  onChange={() =>
                    toggle(f, selectedFlavors, setSelectedFlavors)
                  }
                />
                {f}
              </label>
            ))}
          </div>

          <div>
            <p className="font-medium mb-2">Preço máximo</p>
            <p className="text-sm mb-1">
              Até <strong>R$ {tempPrice}</strong>
            </p>
            <input
              type="range"
              min={20}
              max={200}
              step={1}
              value={tempPrice}
              onChange={(e) => setTempPrice(Number(e.target.value))}
              className="w-full accent-green-600"
            />
          </div>
        </div>

        <div className="p-4 border-t space-y-2">
          <button
            onClick={applyFilters}
            className="w-full bg-green-600 text-white font-semibold py-3 rounded-lg"
          >
            Aplicar filtros
          </button>

          <button
            onClick={clearFilters}
            className="w-full border border-gray-300 text-gray-700 font-medium py-2 rounded-lg"
          >
            Limpar filtros
          </button>
        </div>
      </div>
    </>
  );
}
