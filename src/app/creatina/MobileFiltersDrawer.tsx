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
    (searchParams
      .get("form")
      ?.split(",") as CreatineForm[]) ?? [];
  const selectedStores =
    (searchParams
      .get("store")
      ?.split(",") as Store[]) ?? [];

  function toggleParam(
    key: string,
    value: string
  ) {
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

  return (
    <>
      {/* BOTÃO FLUTUANTE */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-40 sm:hidden bg-green-600 text-white p-4 rounded-full shadow-lg"
        aria-label="Abrir filtros"
      >
        ⚙️
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
        className={`fixed bottom-0 left-0 right-0 z-50 sm:hidden bg-white rounded-t-2xl p-5 transition-transform duration-300
        ${
          open
            ? "translate-y-0"
            : "translate-y-full"
        }`}
        style={{ maxHeight: "85vh" }}
      >
        <div className="flex justify-between items-center mb-4">
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

        <div className="overflow-y-auto space-y-6 pr-1">
          {/* LOJA */}
          <div>
            <p className="font-medium mb-2">
              Loja
            </p>
            {[
              {
                value: Store.AMAZON,
                label: "Amazon",
              },
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
                    toggleParam(
                      "store",
                      s.value
                    )
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
                value: CreatineForm.POWDER,
                label: "Pó",
              },
              {
                value: CreatineForm.CAPSULE,
                label: "Cápsula",
              },
              {
                value: CreatineForm.GUMMY,
                label: "Gummy",
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
                    toggleParam(
                      "form",
                      f.value
                    )
                  }
                />
                {f.label}
              </label>
            ))}
          </div>

          {/* MARCA */}
          <div>
            <p className="font-medium mb-2">
              Marca
            </p>
            {brands.map((b) => (
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
            <p className="font-medium mb-2">
              Sabor
            </p>
            {flavors.map((f) => (
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
        </div>
      </div>
    </>
  );
}
