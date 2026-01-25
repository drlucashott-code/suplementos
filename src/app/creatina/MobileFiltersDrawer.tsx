"use client";

import { CreatineForm } from "@prisma/client";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

type Props = {
  brands: string[];
  flavors: string[];
};

export function MobileFiltersDrawer({
  brands,
  flavors,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [open, setOpen] = useState(false);

  const [selectedBrands, setSelectedBrands] =
    useState<string[]>([]);
  const [selectedFlavors, setSelectedFlavors] =
    useState<string[]>([]);
  const [selectedForms, setSelectedForms] =
    useState<CreatineForm[]>([]);

  useEffect(() => {
    function handleOpen() {
      setSelectedBrands(
        searchParams.get("brand")?.split(",") ?? []
      );
      setSelectedFlavors(
        searchParams.get("flavor")?.split(",") ?? []
      );
      setSelectedForms(
        (searchParams
          .get("form")
          ?.split(",") as CreatineForm[]) ?? []
      );

      setOpen(true);
    }

    window.addEventListener("open-filters", handleOpen);
    return () =>
      window.removeEventListener("open-filters", handleOpen);
  }, [searchParams]);

  function closeDrawer() {
    setOpen(false);
  }

  function toggle<T>(
    value: T,
    list: T[],
    setList: (v: T[]) => void
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
    if (selectedForms.length)
      params.set("form", selectedForms.join(","));

    // Mantém a query de busca se existir
    const q = searchParams.get("q");
    if (q) params.set("q", q);

    router.push(`/creatina?${params.toString()}`);
    setOpen(false);
  }

  function clearFilters() {
    router.push("/creatina");
    setOpen(false);
  }

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/40 z-40"
        onClick={closeDrawer}
      />

      <div
        className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl flex flex-col"
        style={{ height: "90vh" }}
      >
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="font-semibold text-lg">Filtros</h2>
          <button
            onClick={closeDrawer}
            className="text-sm text-gray-500"
          >
            Fechar
          </button>
        </div>

        <div className="p-4 overflow-y-auto flex-1 space-y-6">
          {/* APRESENTAÇÃO */}
          <div>
            <p className="font-medium mb-2">Apresentação</p>
            {[
              { value: CreatineForm.CAPSULE, label: "Cápsula" },
              { value: CreatineForm.GUMMY, label: "Gummy" },
              { value: CreatineForm.POWDER, label: "Pó" },
            ].map((f) => (
              <label key={f.value} className="flex gap-2 text-sm mb-2">
                <input
                  type="checkbox"
                  checked={selectedForms.includes(f.value)}
                  onChange={() => toggle(f.value, selectedForms, setSelectedForms)}
                />
                {f.label}
              </label>
            ))}
          </div>

          {/* MARCA */}
          <div>
            <p className="font-medium mb-2">Marca</p>
            {[...brands].sort().map((b) => (
              <label key={b} className="flex gap-2 text-sm mb-2">
                <input
                  type="checkbox"
                  checked={selectedBrands.includes(b)}
                  onChange={() => toggle(b, selectedBrands, setSelectedBrands)}
                />
                {b}
              </label>
            ))}
          </div>

          {/* SABOR */}
          <div>
            <p className="font-medium mb-2">Sabor</p>
            {[...flavors].sort().map((f) => (
              <label key={f} className="flex gap-2 text-sm mb-2">
                <input
                  type="checkbox"
                  checked={selectedFlavors.includes(f)}
                  onChange={() => toggle(f, selectedFlavors, setSelectedFlavors)}
                />
                {f}
              </label>
            ))}
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