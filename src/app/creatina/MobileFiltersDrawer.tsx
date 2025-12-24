"use client";

import { CreatineForm, Store } from "@prisma/client";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

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

  const selectedBrands =
    searchParams.get("brand")?.split(",") ?? [];
  const selectedFlavors =
    searchParams.get("flavor")?.split(",") ?? [];
  const selectedForms =
    (searchParams.get("form")?.split(",") as CreatineForm[]) ??
    [];
  const selectedStores =
    (searchParams.get("store")?.split(",") as Store[]) ??
    [];
  const selectedDoses =
    searchParams.get("doses")?.split(",") ?? [];

  const priceMax =
    Number(searchParams.get("priceMax")) || 200;

  function toggleParam(key: string, value: string) {
    const params = new URLSearchParams(
      searchParams.toString()
    );

    const current =
      params.get(key)?.split(",") ?? [];

    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];

    if (next.length > 0) {
      params.set(key, next.join(","));
    } else {
      params.delete(key);
    }

    router.push(`/creatina?${params.toString()}`);
  }

  function updatePrice(value: number) {
    const params = new URLSearchParams(
      searchParams.toString()
    );
    params.set("priceMax", String(value));
    router.push(`/creatina?${params.toString()}`);
  }

  return (
    <>
      {/* BOTÃO FLUTUANTE */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-40 sm:hidden bg-white text-black p-4 rounded-full shadow-lg border"
        aria-label="Abrir filtros"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="4" y1="6" x2="20" y2="6" />
          <line x1="4" y1="12" x2="20" y2="12" />
          <line x1="4" y1="18" x2="20" y2="18" />
          <circle cx="10" cy="6" r="2" />
          <circle cx="14" cy="12" r="2" />
          <circle cx="8" cy="18" r="2" />
        </svg>
      </button>

      {/* OVERLAY */}
      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-40 sm:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* DRAWER */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 sm:hidden bg-white rounded-t-2xl transition-transform duration-300 ${
          open ? "translate-y-0" : "translate-y-full"
        }`}
        style={{ height: "90vh" }}
      >
        {/* HEADER FIXO */}
        <div className="p-5 border-b flex justify-between items-center">
          <h2 className="font-semibold text-lg">
            Filtros
          </h2>
          <button
            onClick={() => setOpen(false)}
            className="text-gray-500 text-sm"
          >
            Fechar
          </button>
        </div>

        {/* CONTEÚDO SCROLLÁVEL */}
        <div className="p-5 overflow-y-auto h-[calc(90vh-64px)] space-y-6">
          {/* LOJA */}
          <div>
            <p className="font-medium mb-2">Loja</p>
            {[
              { value: Store.AMAZON, label: "Amazon" },
              {
                value: Store.MERCADO_LIVRE,
                label: "Mercado Livre",
              },
            ].map((s) => (
              <label
                key={s.value}
                className="flex items-center gap-2 text-sm mb-2"
              >
                <input
                  type="checkbox"
                  checked={selectedStores.includes(
                    s.value
                  )}
                  onChange={() =>
                    toggleParam("store", s.value)
                  }
                />
                {s.label}
              </label>
            ))}
          </div>

          {/* APRESENTAÇÃO */}
          <div>
            <p className="font-medium mb-2">
              Apresentação
            </p>
            {[
              {
                value: CreatineForm.CAPSULE,
                label: "Cápsula",
              },
              {
                value: CreatineForm.GUMMY,
                label: "Gummy",
              },
              {
                value: CreatineForm.POWDER,
                label: "Pó",
              },
            ].map((f) => (
              <label
                key={f.value}
                className="flex items-center gap-2 text-sm mb-2"
              >
                <input
                  type="checkbox"
                  checked={selectedForms.includes(
                    f.value
                  )}
                  onChange={() =>
                    toggleParam("form", f.value)
                  }
                />
                {f.label}
              </label>
            ))}
          </div>

          {/* DOSES */}
          <div>
            <p className="font-medium mb-2">Doses</p>
            {[
              { value: "lt50", label: "< 50" },
              {
                value: "50-100",
                label: "51 – 100",
              },
              {
                value: "101-150",
                label: "101 – 150",
              },
              {
                value: "gt150",
                label: "> 150",
              },
            ].map((d) => (
              <label
                key={d.value}
                className="flex items-center gap-2 text-sm mb-2"
              >
                <input
                  type="checkbox"
                  checked={selectedDoses.includes(
                    d.value
                  )}
                  onChange={() =>
                    toggleParam("doses", d.value)
                  }
                />
                {d.label}
              </label>
            ))}
          </div>

          {/* MARCA */}
          <div>
            <p className="font-medium mb-2">Marca</p>
            {[...brands].sort().map((b) => (
              <label
                key={b}
                className="flex items-center gap-2 text-sm mb-2"
              >
                <input
                  type="checkbox"
                  checked={selectedBrands.includes(
                    b
                  )}
                  onChange={() =>
                    toggleParam("brand", b)
                  }
                />
                {b}
              </label>
            ))}
          </div>

          {/* SABOR */}
          <div>
            <p className="font-medium mb-2">Sabor</p>
            {[...flavors].sort().map((f) => (
              <label
                key={f}
                className="flex items-center gap-2 text-sm mb-2"
              >
                <input
                  type="checkbox"
                  checked={selectedFlavors.includes(
                    f
                  )}
                  onChange={() =>
                    toggleParam("flavor", f)
                  }
                />
                {f}
              </label>
            ))}
          </div>

          {/* SLIDER DE PREÇO */}
          <div>
            <p className="font-medium mb-2">
              Preço máximo
            </p>
            <p className="text-sm mb-1">
              Até <strong>R$ {priceMax}</strong>
            </p>
            <input
              type="range"
              min={20}
              max={200}
              step={5}
              value={priceMax}
              onChange={(e) =>
                updatePrice(
                  Number(e.target.value)
                )
              }
              className="w-full accent-green-600"
            />
          </div>
        </div>
      </div>
    </>
  );
}
