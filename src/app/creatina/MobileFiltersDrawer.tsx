"use client";

import { CreatineForm, Store } from "@prisma/client";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

type Props = {
  brands: string[];
  flavors: string[];
};

export function MobileFiltersDrawer({ brands, flavors }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);

  const selectedBrands = searchParams.get("brand")?.split(",") ?? [];
  const selectedFlavors = searchParams.get("flavor")?.split(",") ?? [];
  const selectedForms =
    (searchParams.get("form")?.split(",") as CreatineForm[]) ?? [];
  const selectedStores =
    (searchParams.get("store")?.split(",") as Store[]) ?? [];
  const selectedDoses = searchParams.get("doses")?.split(",") ?? [];

  const priceMax = Number(searchParams.get("priceMax")) || 200;

  function toggleParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    const current = params.get(key)?.split(",") ?? [];

    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];

    if (next.length > 0) params.set(key, next.join(","));
    else params.delete(key);

    router.push(`/creatina?${params.toString()}`);
  }

  function updatePrice(value: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("priceMax", String(value));
    router.push(`/creatina?${params.toString()}`);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-40 sm:hidden bg-white text-black p-4 rounded-full shadow-lg border"
        aria-label="Abrir filtros"
      >
        ☰
      </button>

      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-40 sm:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <div
        className={`fixed bottom-0 left-0 right-0 z-50 sm:hidden bg-white rounded-t-2xl transition-transform duration-300 ${
          open ? "translate-y-0" : "translate-y-full"
        }`}
        style={{ height: "90vh" }}
      >
        <div className="p-5 border-b flex justify-between">
          <h2 className="font-semibold text-lg">Filtros</h2>
          <button onClick={() => setOpen(false)}>Fechar</button>
        </div>

        <div className="p-5 overflow-y-auto h-[calc(90vh-64px)] space-y-6">
          {/* LOJA */}
          <div>
            <p className="font-medium mb-2">Loja</p>
            {[Store.AMAZON, Store.MERCADO_LIVRE].map((s) => (
              <label key={s} className="flex gap-2 text-sm mb-2">
                <input
                  type="checkbox"
                  checked={selectedStores.includes(s)}
                  onChange={() => toggleParam("store", s)}
                />
                {s === Store.AMAZON ? "Amazon" : "Mercado Livre"}
              </label>
            ))}
          </div>

          {/* APRESENTAÇÃO */}
          <div>
            <p className="font-medium mb-2">Apresentação</p>
            {[CreatineForm.CAPSULE, CreatineForm.GUMMY, CreatineForm.POWDER].map(
              (f) => (
                <label key={f} className="flex gap-2 text-sm mb-2">
                  <input
                    type="checkbox"
                    checked={selectedForms.includes(f)}
                    onChange={() => toggleParam("form", f)}
                  />
                  {f === CreatineForm.CAPSULE
                    ? "Cápsula"
                    : f === CreatineForm.GUMMY
                    ? "Gummy"
                    : "Pó"}
                </label>
              )
            )}
          </div>

          {/* DOSES */}
          <div>
            <p className="font-medium mb-2">Doses</p>
            {["<50", "51-100", "101-150", ">150"].map((d) => (
              <label key={d} className="flex gap-2 text-sm mb-2">
                <input
                  type="checkbox"
                  checked={selectedDoses.includes(d)}
                  onChange={() => toggleParam("doses", d)}
                />
                {d}
              </label>
            ))}
          </div>

          {/* MARCA */}
          <div>
            <p className="font-medium mb-2">Marca</p>
            {brands.map((b) => (
              <label key={b} className="flex gap-2 text-sm mb-2">
                <input
                  type="checkbox"
                  checked={selectedBrands.includes(b)}
                  onChange={() => toggleParam("brand", b)}
                />
                {b}
              </label>
            ))}
          </div>

          {/* SABOR */}
          <div>
            <p className="font-medium mb-2">Sabor</p>
            {flavors.map((f) => (
              <label key={f} className="flex gap-2 text-sm mb-2">
                <input
                  type="checkbox"
                  checked={selectedFlavors.includes(f)}
                  onChange={() => toggleParam("flavor", f)}
                />
                {f}
              </label>
            ))}
          </div>

          {/* PREÇO */}
          <div>
            <p className="font-medium mb-2">Preço máximo</p>
            <p className="text-sm mb-1">Até R$ {priceMax}</p>
            <input
              type="range"
              min={20}
              max={200}
              step={5}
              value={priceMax}
              onChange={(e) => updatePrice(Number(e.target.value))}
              className="w-full accent-green-600"
            />
          </div>
        </div>
      </div>
    </>
  );
}
