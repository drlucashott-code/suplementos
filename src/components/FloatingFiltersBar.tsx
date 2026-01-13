"use client";

import { useScrollDirection } from "@/hooks/useScrollDirection";
import { useRouter, useSearchParams } from "next/navigation";

export function FloatingFiltersBar() {
  const visible = useScrollDirection();
  const router = useRouter();
  const searchParams = useSearchParams();

  const order =
    (searchParams.get("order") as "gram" | "discount") ??
    "gram";

  function openFilters() {
    const params = new URLSearchParams(
      searchParams.toString()
    );
    params.set("openFilters", "1");
    router.push(`/creatina?${params.toString()}`);
  }

  function changeOrder(
    value: "gram" | "discount"
  ) {
    const params = new URLSearchParams(
      searchParams.toString()
    );
    params.set("order", value);
    router.push(`/creatina?${params.toString()}`);
  }

  return (
    <div
      className={`fixed top-[56px] left-0 right-0 z-40 bg-white border-b transition-transform duration-200 ${
        visible
          ? "translate-y-0"
          : "-translate-y-full"
      }`}
    >
      <div className="flex items-center gap-3 px-3 py-2 overflow-x-auto">
        <button
          onClick={openFilters}
          className="px-3 py-1 text-sm border rounded-full"
        >
          Filtrar
        </button>

        <div className="flex items-center gap-1 text-sm">
          <span className="text-gray-500">
            Ordenar:
          </span>

          <select
            value={order}
            onChange={(e) =>
              changeOrder(
                e.target.value as
                  | "gram"
                  | "discount"
              )
            }
            className="border rounded px-2 py-1 bg-white"
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
