"use client";

import { useSearchParams, useRouter } from "next/navigation";

export function FloatingFiltersBar() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const order = searchParams.get("order") ?? "gram";

  function openFilters() {
    // 🔑 NÃO navega, NÃO muda URL, NÃO sobe a página
    window.dispatchEvent(
      new CustomEvent("open-filters")
    );
  }

  function changeOrder(value: string) {
    const params = new URLSearchParams(
      searchParams.toString()
    );
    params.set("order", value);

    // aqui pode navegar (usuário pediu ordenação)
    router.push(`/creatina?${params.toString()}`);
  }

  return (
    <div className="sticky top-0 z-30 bg-white border-b border-gray-200 py-2 mb-3">
      <div className="flex items-center gap-3 px-1">
        {/* FILTRAR */}
        <button
          onClick={openFilters}
          className="border border-gray-400 rounded-full px-4 py-2 text-sm bg-white hover:bg-gray-50"
        >
          Filtrar
        </button>

        {/* ORDENAR */}
        <div className="flex items-center gap-1 text-sm">
          <span className="text-gray-600">
            Ordenar:
          </span>

          <select
            value={order}
            onChange={(e) =>
              changeOrder(e.target.value)
            }
            className="border border-gray-400 rounded px-2 py-1 bg-white"
          >
            <option value="gram">
              Preço por grama
            </option>
            <option value="discount">
              Maior desconto
            </option>
          </select>
        </div>
      </div>
    </div>
  );
}
