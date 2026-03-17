"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  updateManyProducts,
  updateDynamicProduct,
  deleteDynamicProduct,
  deleteManyProducts,
} from "@/app/admin/dynamic/produtos/actions";
import { Prisma } from "@prisma/client";

type DynamicAttributes = Record<
  string,
  string | number | boolean | null | undefined
>;

interface DisplayConfigItem {
  key: string;
  label: string;
  type: "text" | "number" | "currency";
  public?: boolean;
  visibility?: "internal" | "public_table" | "public_highlight";
}

interface Product {
  id: string;
  name: string;
  imageUrl: string | null;
  totalPrice: number;
  url: string;
  attributes: Prisma.JsonValue;
  category: {
    id: string;
    name: string;
    displayConfig: Prisma.JsonValue;
  };
}

interface CategoryOption {
  id: string;
  name: string;
}

function solveMath(input: string): string {
  const cleanInput = input.replace(/\s+/g, "").replace(",", ".");
  const mathRegex = /^[0-9+\-*/.()]+$/;

  if (mathRegex.test(cleanInput)) {
    try {
      const result = new Function(`return ${cleanInput}`)();
      return String(result);
    } catch {
      return input;
    }
  }

  return input;
}

export function AdminProductTable({
  initialProducts,
  categories,
}: {
  initialProducts: Product[];
  categories: CategoryOption[];
}) {
  const router = useRouter();
  const brandFilterRef = useRef<HTMLDivElement>(null);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [zoomImage, setZoomImage] = useState<string | null>(null);
  const [bulkData, setBulkData] = useState<Record<string, string>>({});
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [showBrandFilter, setShowBrandFilter] = useState(false);
  const [brandFilterSearch, setBrandFilterSearch] = useState("");
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: "asc" | "desc";
  } | null>({ key: "name", direction: "asc" });

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        brandFilterRef.current &&
        !brandFilterRef.current.contains(event.target as Node)
      ) {
        setShowBrandFilter(false);
      }
    }

    if (showBrandFilter) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showBrandFilter]);

  const dynamicColumns = useMemo(() => {
    if (filterCategory === "all") return [];

    const cat = initialProducts.find((p) => p.category.id === filterCategory);
    const config =
      (cat?.category?.displayConfig as unknown as DisplayConfigItem[]) || [];

    return config.filter(
      (c) =>
        c.type !== "currency" &&
        !["marca", "brand", "asin"].includes(c.key.toLowerCase())
    );
  }, [filterCategory, initialProducts]);

  const availableBrands = useMemo(() => {
    const brands = initialProducts
      .filter((p) => filterCategory === "all" || p.category.id === filterCategory)
      .map((p) => {
        const attrs = (p.attributes as DynamicAttributes) || {};
        return String(attrs.marca || attrs.brand || "").trim();
      })
      .filter((brand) => brand !== "");

    return Array.from(new Set(brands)).sort((a, b) => a.localeCompare(b));
  }, [initialProducts, filterCategory]);

  const filteredBrandOptions = useMemo(() => {
    const term = brandFilterSearch.trim().toLowerCase();
    if (!term) return availableBrands;

    return availableBrands.filter((brand) =>
      brand.toLowerCase().includes(term)
    );
  }, [availableBrands, brandFilterSearch]);

  const processedProducts = useMemo(() => {
    const filtered = initialProducts.filter((p) => {
      const attrs = (p.attributes as DynamicAttributes) || {};
      const brandValue = String(attrs.marca || attrs.brand || "").trim();
      const matchesCat = filterCategory === "all" || p.category.id === filterCategory;
      const searchStr = searchTerm.toLowerCase();

      const matchesSearch =
        p.name.toLowerCase().includes(searchStr) ||
        String(attrs.asin || "").toLowerCase().includes(searchStr) ||
        brandValue.toLowerCase().includes(searchStr);

      const matchesBrand =
        selectedBrands.length === 0 || selectedBrands.includes(brandValue);

      return matchesCat && matchesSearch && matchesBrand;
    });

    if (sortConfig) {
      filtered.sort((a, b) => {
        const attrsA = (a.attributes as DynamicAttributes) || {};
        const attrsB = (b.attributes as DynamicAttributes) || {};

        let aVal: string | number = "";
        let bVal: string | number = "";

        if (sortConfig.key === "brand") {
          aVal = String(attrsA.marca || attrsA.brand || "");
          bVal = String(attrsB.marca || attrsB.brand || "");
        } else if (sortConfig.key === "totalPrice") {
          aVal = a.totalPrice;
          bVal = b.totalPrice;
        } else if (sortConfig.key === "name") {
          aVal = a.name;
          bVal = b.name;
        } else {
          aVal = String(attrsA[sortConfig.key] || "");
          bVal = String(attrsB[sortConfig.key] || "");
        }

        if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [initialProducts, filterCategory, searchTerm, sortConfig, selectedBrands]);

  const handleBulkDelete = async () => {
    if (!confirm(`Excluir permanentemente ${selectedIds.length} produtos?`)) return;
    const res = await deleteManyProducts(selectedIds);
    if (res.success) {
      setSelectedIds([]);
      router.refresh();
    }
  };

  const handleBulkSave = async () => {
    if (Object.keys(bulkData).length === 0) {
      alert("Preencha ao menos um campo.");
      return;
    }

    if (!confirm(`Aplicar alterações em ${selectedIds.length} produtos?`)) return;

    for (const key in bulkData) {
      if (bulkData[key]) {
        await updateManyProducts(selectedIds, key, bulkData[key]);
      }
    }

    setSelectedIds([]);
    setBulkData({});
    router.refresh();
  };

  const handleQuickUpdate = async (
    id: string,
    field: string,
    value: string | number,
    isAttribute = false
  ) => {
    const product = initialProducts.find((p) => p.id === id);
    if (!product) return;

    const currentAttrs = (product.attributes as DynamicAttributes) || {};

    const updatedData = {
      name: field === "name" ? String(value) : product.name,
      totalPrice: field === "totalPrice" ? Number(value) : product.totalPrice,
      attributes: isAttribute ? { ...currentAttrs, [field]: value } : currentAttrs,
    };

    await updateDynamicProduct(id, updatedData);
    router.refresh();
  };

  const toggleSort = (key: string) => {
    setSortConfig((prev) => {
      if (prev?.key === key) {
        return { key, direction: prev.direction === "asc" ? "desc" : "asc" };
      }
      return { key, direction: "asc" };
    });
  };

  const toggleBrandSelection = (brand: string) => {
    setSelectedBrands((prev) =>
      prev.includes(brand) ? prev.filter((item) => item !== brand) : [...prev, brand]
    );
  };

  return (
    <div className="space-y-6 font-sans text-black">
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/admin/dynamic")}
            className="flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-2 text-[10px] font-black uppercase tracking-widest shadow-sm transition-all active:scale-95 hover:bg-gray-50"
          >
            ← Painel Inicial
          </button>
          <h1 className="text-xl font-black uppercase tracking-tighter text-gray-800">
            Produtos Dinâmicos
          </h1>
        </div>

        <div className="rounded-full bg-gray-100 px-3 py-1 text-[10px] font-bold uppercase text-gray-400">
          Total: {processedProducts.length} itens
        </div>
      </div>

      <div className="space-y-4 rounded-[2rem] border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-end gap-4">
          <div className="min-w-[300px] flex-1">
            <label className="ml-1 mb-2 block text-[10px] font-black uppercase text-gray-400">
              Pesquisar
            </label>
            <input
              placeholder="Nome, marca ou ASIN..."
              className="w-full rounded-xl border-none bg-gray-50 p-3 text-sm font-bold outline-none focus:ring-2 focus:ring-yellow-400"
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="w-full md:w-64">
            <label className="ml-1 mb-2 block text-[10px] font-black uppercase text-gray-400">
              Categoria
            </label>
            <select
              className="w-full cursor-pointer rounded-xl border-none bg-gray-50 p-3 text-sm font-bold outline-none"
              onChange={(e) => {
                setFilterCategory(e.target.value);
                setSelectedBrands([]);
                setBrandFilterSearch("");
                setShowBrandFilter(false);
              }}
            >
              <option value="all">Todas</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {selectedBrands.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {selectedBrands.map((brand) => (
              <button
                key={brand}
                onClick={() => toggleBrandSelection(brand)}
                className="rounded-full bg-blue-100 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-blue-700"
              >
                {brand} ×
              </button>
            ))}

            <button
              onClick={() => setSelectedBrands([])}
              className="rounded-full bg-gray-100 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-gray-600"
            >
              Limpar marcas
            </button>
          </div>
        )}

        {selectedIds.length > 0 && (
          <div className="animate-in slide-in-from-top-4 rounded-3xl bg-yellow-400 p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between text-black">
              <h3 className="text-[10px] font-black uppercase tracking-widest">
                Edição em Massa ({selectedIds.length} itens)
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={handleBulkDelete}
                  className="rounded-xl bg-red-600 px-4 py-2 text-[10px] font-black uppercase text-white shadow-md active:scale-95 hover:bg-red-700"
                >
                  Excluir Selecionados
                </button>
                <button
                  onClick={handleBulkSave}
                  className="rounded-xl bg-white px-4 py-2 text-[10px] font-black uppercase text-black shadow-md hover:bg-gray-50"
                >
                  Salvar Alterações
                </button>
                <button
                  onClick={() => setSelectedIds([])}
                  className="px-2 text-[10px] font-black uppercase text-black/60"
                >
                  Cancelar
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-5">
              {dynamicColumns.map((field) => (
                <div key={field.key}>
                  <label className="ml-1 mb-1 block text-[9px] font-black uppercase text-black/50">
                    {field.public ? "" : "👁️‍🗨️ "}
                    {field.label}
                  </label>
                  <input
                    placeholder={`Definir ${field.label}...`}
                    className="w-full rounded-lg border-none p-2.5 text-xs shadow-inner outline-none focus:ring-2 focus:ring-black"
                    onChange={(e) =>
                      setBulkData({ ...bulkData, [field.key]: e.target.value })
                    }
                  />
                </div>
              ))}

              <div>
                <label className="ml-1 mb-1 block text-[9px] font-black uppercase text-black/50">
                  Marca
                </label>
                <input
                  placeholder="Definir Marca..."
                  className="w-full rounded-lg border-none p-2.5 text-xs shadow-inner outline-none focus:ring-2 focus:ring-black"
                  onChange={(e) =>
                    setBulkData({ ...bulkData, marca: e.target.value })
                  }
                />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-[2rem] border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-[1000px] w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-[10px] font-black uppercase tracking-widest text-gray-400">
                <th className="w-12 p-4 text-center">
                  <input
                    type="checkbox"
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedIds(processedProducts.map((p) => p.id));
                      } else {
                        setSelectedIds([]);
                      }
                    }}
                  />
                </th>

                <th className="w-28 p-4 text-center text-black">Foto / ASIN</th>

                <th
                  className="cursor-pointer p-4 text-black hover:text-black"
                  onClick={() => toggleSort("name")}
                >
                  Nome do Produto
                </th>

                {dynamicColumns.map((col) => (
                  <th
                    key={col.key}
                    className="min-w-[110px] cursor-pointer p-4 text-center text-black hover:text-black"
                    onClick={() => toggleSort(col.key)}
                  >
                    {col.public ? "" : "👁️‍🗨️ "}
                    {col.label}
                  </th>
                ))}

                <th className="w-32 p-4 text-center text-black">
                  <div
                    ref={brandFilterRef}
                    className="relative inline-flex items-center justify-center gap-2"
                  >
                    <button
                      type="button"
                      onClick={() => toggleSort("brand")}
                      className="font-black uppercase hover:text-blue-600"
                    >
                      Marca
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowBrandFilter((prev) => !prev)}
                      className={`rounded-md border px-1.5 py-0.5 text-[11px] transition ${
                        selectedBrands.length > 0
                          ? "border-blue-500 bg-blue-50 text-blue-600"
                          : "border-gray-300 text-gray-500 hover:border-gray-400"
                      }`}
                      aria-label="Filtrar marcas"
                      title="Filtrar marcas"
                    >
                      {selectedBrands.length > 0 ? `${selectedBrands.length}` : "▾"}
                    </button>

                    {showBrandFilter && (
                      <div className="absolute right-0 top-8 z-30 w-72 rounded-2xl border border-gray-200 bg-white p-4 text-left normal-case shadow-xl">
                        <div className="mb-3">
                          <input
                            value={brandFilterSearch}
                            onChange={(e) => setBrandFilterSearch(e.target.value)}
                            placeholder="Buscar marca..."
                            className="w-full rounded-xl border border-gray-200 bg-gray-50 p-2.5 text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-400"
                          />
                        </div>

                        <div className="mb-3 flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() => setSelectedBrands(availableBrands)}
                            className="text-[10px] font-black uppercase text-blue-600"
                          >
                            Marcar todas
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedBrands([])}
                            className="text-[10px] font-black uppercase text-gray-500"
                          >
                            Limpar
                          </button>
                        </div>

                        <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                          {filteredBrandOptions.length > 0 ? (
                            filteredBrandOptions.map((brand) => (
                              <label
                                key={brand}
                                className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-gray-50"
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedBrands.includes(brand)}
                                  onChange={() => toggleBrandSelection(brand)}
                                />
                                <span className="text-xs font-semibold text-gray-700">
                                  {brand}
                                </span>
                              </label>
                            ))
                          ) : (
                            <p className="py-3 text-center text-xs text-gray-400">
                              Nenhuma marca encontrada
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </th>

                <th
                  className="w-32 cursor-pointer p-4 text-center text-black hover:text-black"
                  onClick={() => toggleSort("totalPrice")}
                >
                  Preço
                </th>

                <th className="w-20 p-4 text-right text-black">Ação</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-50">
              {processedProducts.map((p) => {
                const attrs = (p.attributes as DynamicAttributes) || {};

                return (
                  <tr
                    key={p.id}
                    className={`transition-colors hover:bg-gray-50/50 ${
                      selectedIds.includes(p.id) ? "bg-yellow-50/40" : ""
                    }`}
                  >
                    <td className="p-4 text-center">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(p.id)}
                        onChange={() =>
                          setSelectedIds((prev) =>
                            prev.includes(p.id)
                              ? prev.filter((i) => i !== p.id)
                              : [...prev, p.id]
                          )
                        }
                      />
                    </td>

                    <td className="p-4 text-center">
                      <div
                        className="group relative mx-auto mb-2 h-12 w-12 cursor-zoom-in overflow-hidden rounded-lg border border-gray-100 bg-white shadow-sm"
                        onClick={() => setZoomImage(p.imageUrl)}
                      >
                        {p.imageUrl && (
                          <Image
                            src={p.imageUrl}
                            alt=""
                            fill
                            className="object-contain p-1 transition-transform group-hover:scale-110"
                          />
                        )}
                      </div>

                      <a
                        href={`https://www.amazon.com.br/dp/${String(attrs.asin)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block rounded bg-blue-50 py-0.5 font-mono text-[9px] font-bold uppercase text-blue-500 transition-all hover:bg-blue-600 hover:text-white"
                        title="Abrir na Amazon"
                      >
                        {String(attrs.asin || "---")} ↗
                      </a>
                    </td>

                    <td className="p-4">
                      <textarea
                        className="min-h-[50px] w-full resize-none border-none bg-transparent p-0 text-[13px] font-bold leading-tight text-gray-900 focus:ring-0"
                        defaultValue={p.name}
                        rows={2}
                        onBlur={(e) => handleQuickUpdate(p.id, "name", e.target.value)}
                      />
                    </td>

                    {dynamicColumns.map((col) => (
                      <td key={col.key} className="p-4 text-center">
                        <input
                          className="w-full max-w-[90px] rounded-lg border border-transparent bg-gray-50 p-1.5 text-center text-[11px] font-black outline-none hover:border-gray-200 focus:border-yellow-400 focus:bg-white"
                          defaultValue={String(attrs[col.key] || "")}
                          onBlur={(e) => {
                            const val =
                              col.type === "number"
                                ? solveMath(e.target.value)
                                : e.target.value;

                            e.target.value = val;

                            handleQuickUpdate(
                              p.id,
                              col.key,
                              col.type === "number" ? Number(val) : val,
                              true
                            );
                          }}
                        />
                      </td>
                    ))}

                    <td className="p-4 text-center">
                      <input
                        className="w-full border-none bg-transparent text-center text-[10px] font-black uppercase italic text-gray-500 focus:ring-0"
                        defaultValue={String(attrs.marca || attrs.brand || "")}
                        onBlur={(e) =>
                          handleQuickUpdate(p.id, "marca", e.target.value, true)
                        }
                      />
                    </td>

                    <td className="p-4 text-center text-xs font-black text-green-700">
                      R${" "}
                      <input
                        type="number"
                        step="0.01"
                        className="w-16 border-none bg-transparent p-0 text-center font-black focus:ring-0"
                        defaultValue={p.totalPrice}
                        onBlur={(e) =>
                          handleQuickUpdate(
                            p.id,
                            "totalPrice",
                            Number(e.target.value)
                          )
                        }
                      />
                    </td>

                    <td className="p-4 text-right">
                      <button
                        onClick={() =>
                          confirm("Excluir?") &&
                          deleteDynamicProduct(p.id).then(() => router.refresh())
                        }
                        className="text-[10px] font-black uppercase text-red-200 transition-colors hover:text-red-600"
                      >
                        Excluir
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {zoomImage && (
        <div
          className="fixed inset-0 z-[999] flex cursor-zoom-out items-center justify-center bg-black/90 p-10"
          onClick={() => setZoomImage(null)}
        >
          <div className="relative h-full w-full max-w-4xl">
            <Image src={zoomImage} alt="Zoom" fill className="object-contain" priority />
          </div>
        </div>
      )}
    </div>
  );
}
