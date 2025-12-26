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

  /* =========================
     ESTADO LOCAL (MOBILE)
     ========================= */
  const [selectedBrands, setSelectedBrands] =
    useState<string[]>([]);
  const [selectedFlavors, setSelectedFlavors] =
    useState<string[]>([]);
  const [selectedForms, setSelectedForms] =
    useState<CreatineForm[]>([]);
  const [selectedDoses, setSelectedDoses] =
    useState<string[]>([]);
  const [tempPrice, setTempPrice] =
    useState<number>(200);

  /* =========================
     SINCRONIZA COM URL AO ABRIR
     ========================= */
  useEffect(() => {
    if (!open) return;

    setSelectedBrands(
      searchParams.get("brand")?.split(",") ?? []
    );
    setSelectedFlavors(
      searchParams.get("flavor")?.split(",") ?? []
    );
    setSelectedForms(
      (searchParams.get("form")?.split(",") as CreatineForm[]) ??
        []
    );
    setSelectedDoses(
      searchParams.get("doses")?.split(",") ?? []
    );
    setTempPrice(
      Number(searchParams.get("priceMax")) || 200
    );
  }, [open, searchParams]);

  /* =========================
     HELPERS
     ========================= */
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

  function track(event: string, data?: object) {
    if (typeof window !== "undefined" && "gtag" in window) {
      // @ts-ignore
      window.gtag("event", event, data);
    }
  }

  /* =========================
     APLICAR FILTROS
     ========================= */
  function applyFilters() {
    track("apply_filters_mobile", {
      brands: selectedBrands.join(",") || "all",
      flavors: selectedFlavors.join(",") || "all",
      forms: selectedForms.join(",") || "all",
      doses: selectedDoses.join(",") || "all",
      price_max: tempPrice,
    });

    const params = new URLSearchParams();

    if (selectedBrands.length)
      params.set("brand", selectedBrands.join(","));
    if (selectedFlavors.length)
      params.set("flavor", selectedFlavors.join(","));
    if (selectedForms.length)
      params.set("form", selectedForms.join(","));
    if (selectedDoses.length)
      params.set("doses", selectedDoses.join(","));

    params.set("priceMax", String(tempPrice));

    router.push(`/creatina?${params.toString()}`);
    setOpen(false);
  }

  /* =========================
     LIMPAR FILTROS
     ========================= */
  function clearFilters() {
    track("clear_filters_mobile");

    setSelectedBrands([]);
    setSelectedFlavors([]);
    setSelectedForms([]);
    setSelectedDoses([]);
    setTempPrice(200);

    router.push("/creatina");
    setOpen(false);
  }

  return (
    <>
      {/* BOTÃO NO FLUXO DA PÁGINA */}
      <button
        onClick={() => {
          track("open_filters_mobile");
          setOpen(true);
        }}
        className="sm:hidden w-full bg-white text-black px-4 py-3 rounded-xl shadow border flex items-center justify-center gap-2"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
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

        <span className="font-medium text-sm">
          Filtrar produtos
        </span>
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
        className={`fixed bottom-0 left-0 right-0 z-50 sm:hidden bg-white rounded-t-2xl transition-transform duration-300 flex flex-col ${
          open ? "translate-y-0" : "translate-y-full"
        }`}
        style={{ height: "90vh" }}
      >
        {/* HEADER */}
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

        {/* CONTEÚDO */}
        <div className="p-5 overflow-y-auto flex-1 space-y-6">
          {/* APRESENTAÇÃO */}
          <div>
            <p className="font-medium mb-2">
              Apresentação
            </p>
            {[
              { value: CreatineForm.CAPSULE, label: "Cápsula" },
              { value: CreatineForm.GUMMY, label: "Gummy" },
              { value: CreatineForm.POWDER, label: "Pó" },
            ].map((f) => (
              <label
                key={f.value}
                className="flex items-center gap-2 text-sm mb-2"
              >
                <input
                  type="checkbox"
                  checked={selectedForms.includes(f.value)}
                  onChange={() =>
                    toggle(
                      f.value,
                      selectedForms,
                      setSelectedForms
                    )
                  }
                />
                {f.label}
              </label>
            ))}
          </div>

          {/* DOSES */}
          <div>
            <p className="font-medium mb-2">Doses</p>
            {["<50", "51-100", "101-150", ">150"].map(
              (d) => (
                <label
                  key={d}
                  className="flex items-center gap-2 text-sm mb-2"
                >
                  <input
                    type="checkbox"
                    checked={selectedDoses.includes(d)}
                    onChange={() =>
                      toggle(
                        d,
                        selectedDoses,
                        setSelectedDoses
                      )
                    }
                  />
                  {d}
                </label>
              )
            )}
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
                  checked={selectedBrands.includes(b)}
                  onChange={() =>
                    toggle(
                      b,
                      selectedBrands,
                      setSelectedBrands
                    )
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
                  checked={selectedFlavors.includes(f)}
                  onChange={() =>
                    toggle(
                      f,
                      selectedFlavors,
                      setSelectedFlavors
                    )
                  }
                />
                {f}
              </label>
            ))}
          </div>

          {/* PREÇO */}
          <div>
            <p className="font-medium mb-2">
              Preço máximo
            </p>
            <p className="text-sm mb-1">
              Até <strong>R$ {tempPrice}</strong>
            </p>
            <input
              type="range"
              min={20}
              max={200}
              step={1}
              value={tempPrice}
              onChange={(e) =>
                setTempPrice(Number(e.target.value))
              }
              className="w-full accent-green-600"
            />
          </div>
        </div>

        {/* FOOTER */}
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
