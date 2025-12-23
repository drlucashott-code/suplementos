"use client";

type Props = {
  search: string;
  setSearch: (value: string) => void;
  order: "recent" | "az";
  setOrder: (value: "recent" | "az") => void;
};

export function ProductSearch({
  search,
  setSearch,
  order,
  setOrder,
}: Props) {
  return (
    <div className="flex gap-4 mb-6">
      <input
        type="text"
        placeholder="Buscar por nome ou marca..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="flex-1 border border-gray-300 rounded-md p-2"
      />

      <select
        value={order}
        onChange={(e) =>
          setOrder(e.target.value as "recent" | "az")
        }
        className="border border-gray-300 rounded-md p-2"
      >
        <option value="recent">Mais recentes</option>
        <option value="az">A → Z</option>
      </select>
    </div>
  );
}
