"use client";

import React, { useMemo, useState } from "react";
import {
  createWheyAction,
  deleteWheyAction,
  updateWheyAction,
  bulkUpdateWheyAction,
  bulkDeleteWheyAction,
} from "./actions";
import type { WheyProduct } from "./AdminWheyWrapper";
import { ToastOnSubmit } from "../creatina/ToastOnSubmit";

/* =======================
    FIELD HELPER
======================= */
function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-12 gap-2 items-center w-full">
      <label className="col-span-2 text-sm font-medium text-gray-700">
        {label}
      </label>
      <div className="col-span-10">{children}</div>
    </div>
  );
}

const ITEMS_PER_PAGE = 100;
const inputStyle =
  "w-full border rounded-md p-2 text-sm focus:ring-2 focus:ring-blue-100 outline-none transition-all";

type SortConfig = {
  key: "name" | "brand" | "flavor" | "createdAt";
  direction: "asc" | "desc";
};

export default function AdminWheyClient({
  products,
}: {
  products: WheyProduct[];
}) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [sort, setSort] = useState<SortConfig>({
    key: "createdAt",
    direction: "desc",
  });

  /* ======================= ORDENAÇÃO ======================= */
  const requestSort = (key: SortConfig["key"]) => {
    let direction: "asc" | "desc" = "asc";
    if (sort.key === key && sort.direction === "asc") direction = "desc";
    setSort({ key, direction });
  };

  const getSortIcon = (key: SortConfig["key"]) => {
    if (sort.key !== key) return "↕️";
    return sort.direction === "asc" ? "🔼" : "🔽";
  };

  /* ======================= FILTRO + ORDENAÇÃO ======================= */
  const filteredProducts = useMemo(() => {
    const term = search.toLowerCase();
    const result = products.filter(
      (p) =>
        p.name.toLowerCase().includes(term) ||
        p.brand.toLowerCase().includes(term) ||
        p.flavor?.toLowerCase().includes(term)
    );

    result.sort((a, b) => {
      if (sort.key === "createdAt") {
        return sort.direction === "asc"
          ? new Date(a.createdAt).getTime() -
              new Date(b.createdAt).getTime()
          : new Date(b.createdAt).getTime() -
              new Date(a.createdAt).getTime();
      }

      const av = (a[sort.key] || "").toString().toLowerCase();
      const bv = (b[sort.key] || "").toString().toLowerCase();

      return sort.direction === "asc"
        ? av.localeCompare(bv)
        : bv.localeCompare(av);
    });

    return result;
  }, [products, search, sort]);

  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
  const paginatedProducts = useMemo(() => {
    const start = (page - 1) * ITEMS_PER_PAGE;
    return filteredProducts.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredProducts, page]);

  /* ======================= SELEÇÃO EM LOTE ======================= */
  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
        next.delete(id);
    } else {
        next.add(id);
    }
    setSelectedIds(next);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === paginatedProducts.length)
      setSelectedIds(new Set());
    else setSelectedIds(new Set(paginatedProducts.map((p) => p.id)));
  };

  const handleBulkUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);

    await bulkUpdateWheyAction(Array.from(selectedIds), {
      name: (fd.get("bulkName") as string) || undefined,
      brand: (fd.get("bulkBrand") as string) || undefined,
      totalWeightInGrams: fd.get("bulkWeight")
        ? Number(fd.get("bulkWeight"))
        : undefined,
      doseInGrams: fd.get("bulkDose")
        ? Number(fd.get("bulkDose"))
        : undefined,
      proteinPerDoseInGrams: fd.get("bulkProtein")
        ? Number(fd.get("bulkProtein"))
        : undefined,
    });

    setSelectedIds(new Set());
    alert("🚀 Lote atualizado!");
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Excluir ${selectedIds.size} produtos?`)) return;
    await bulkDeleteWheyAction(Array.from(selectedIds));
    setSelectedIds(new Set());
    alert("🗑️ Produtos excluídos!");
  };

  return (
    <main className="max-w-6xl mx-auto p-6">
      {/* ZOOM DA IMAGEM */}
      {zoomedImage && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setZoomedImage(null)}
        >
          <div className="relative max-w-4xl w-full h-full flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={zoomedImage}
              className="max-w-full max-h-full object-contain rounded-lg"
              alt="Zoom do produto"
            />
            <button className="absolute top-0 right-0 text-white text-4xl p-4">
              &times;
            </button>
          </div>
        </div>
      )}

      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-black uppercase">Gestão de Whey</h1>
          <p className="text-gray-400 text-xs font-bold uppercase">
            Controle de Catálogo
          </p>
        </div>
        <div className="bg-gray-100 px-4 py-1 rounded font-mono text-xs">
          {products.length} itens
        </div>
      </div>

      {/* PAINEL DE LOTE */}
      {selectedIds.size > 0 && (
        <div className="sticky top-4 z-50 mb-6 bg-black text-white p-4 rounded-xl shadow-2xl flex flex-col gap-4">
          <div className="flex justify-between border-b border-gray-800 pb-2">
            <span className="font-bold text-sm">
              ⚡ {selectedIds.size} selecionados
            </span>
            <div className="flex gap-4">
              <button
                onClick={handleBulkDelete}
                className="text-xs text-red-400 underline"
              >
                Excluir lote
              </button>
              <button
                onClick={() => setSelectedIds(new Set())}
                className="text-xs opacity-60"
              >
                Sair
              </button>
            </div>
          </div>

          <form onSubmit={handleBulkUpdate} className="grid grid-cols-6 gap-2">
            <input
              name="bulkName"
              placeholder="Novo nome"
              className="col-span-6 bg-gray-900 border p-2 text-xs"
            />
            <input
              name="bulkBrand"
              placeholder="Marca"
              className="bg-gray-900 border p-2 text-xs"
            />
            <input
              name="bulkWeight"
              type="number"
              placeholder="Peso total (g)"
              className="bg-gray-900 border p-2 text-xs"
            />
            <input
              name="bulkDose"
              type="number"
              placeholder="Dose (g)"
              className="bg-gray-900 border p-2 text-xs"
            />
            <input
              name="bulkProtein"
              type="number"
              placeholder="Prot/dose"
              className="bg-gray-900 border p-2 text-xs"
            />
            <button type="submit" className="col-span-2 bg-blue-600 text-white text-xs font-bold rounded">
              Aplicar
            </button>
          </form>
        </div>
      )}

      {/* BUSCA + NOVO */}
      <div className="flex gap-4 mb-6">
        <input
          placeholder="Buscar..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="flex-1 border rounded-xl p-3"
        />
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="px-6 rounded-xl font-bold bg-black text-white"
        >
          {showCreate ? "Fechar" : "＋ Novo"}
        </button>
      </div>

      {/* FORMULÁRIO DE CRIAÇÃO */}
      {showCreate && (
        <form action={createWheyAction} className="space-y-4 mb-10 border border-gray-200 rounded-2xl p-6 bg-gray-50 shadow-inner">
          <ToastOnSubmit message="✅ Whey cadastrado!" />
          <div className="space-y-4">
            <Field label="Nome"><input name="name" className={inputStyle} required /></Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Marca"><input name="brand" className={inputStyle} required /></Field>
              <Field label="Sabor"><input name="flavor" className={inputStyle} /></Field>
            </div>
            <Field label="URL Imagem"><input name="imageUrl" className={inputStyle} /></Field>
            <div className="grid grid-cols-3 gap-4">
              <Field label="Peso Total (g)"><input name="totalWeightInGrams" type="number" className={inputStyle} required /></Field>
              <Field label="Dose (g)"><input name="doseInGrams" type="number" className={inputStyle} required /></Field>
              <Field label="Prot./Dose (g)"><input name="proteinPerDoseInGrams" type="number" className={inputStyle} required /></Field>
            </div>
            <Field label="ASIN"><input name="amazonAsin" className={inputStyle} /></Field>
          </div>
          <button type="submit" className="w-full bg-black text-white py-3 rounded-xl font-bold mt-4">SALVAR NOVO PRODUTO</button>
        </form>
      )}

      {/* TABELA */}
      <div className="border rounded-2xl overflow-hidden bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-[10px] uppercase font-bold">
            <tr>
              <th className="p-4 text-center">
                <input
                  type="checkbox"
                  checked={
                    selectedIds.size === paginatedProducts.length &&
                    paginatedProducts.length > 0
                  }
                  onChange={toggleSelectAll}
                />
              </th>
              <th className="p-4 w-20 text-center">Foto</th>
              <th className="p-4 cursor-pointer" onClick={() => requestSort("name")}>
                Produto {getSortIcon("name")}
              </th>
              <th className="p-4 cursor-pointer" onClick={() => requestSort("brand")}>
                Marca {getSortIcon("brand")}
              </th>
              <th className="p-4 cursor-pointer" onClick={() => requestSort("flavor")}>
                Sabor {getSortIcon("flavor")}
              </th>
              <th className="p-4 text-right">Ações</th>
            </tr>
          </thead>

          <tbody>
            {paginatedProducts.map((p) => {
              const isEditing = editingId === p.id;
              return (
                <React.Fragment key={p.id}>
                  <tr className={selectedIds.has(p.id) ? "bg-blue-50/50" : ""}>
                    <td className="p-4 text-center">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(p.id)}
                        onChange={() => toggleSelect(p.id)}
                      />
                    </td>

                    {/* FOTO */}
                    <td className="p-4 flex justify-center">
                      <div
                        className="group relative w-12 h-12 bg-white border rounded flex items-center justify-center cursor-pointer"
                        onClick={() => p.imageUrl && setZoomedImage(p.imageUrl)}
                      >
                        {p.imageUrl ? (
                          <>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={p.imageUrl}
                              className="w-full h-full object-contain"
                              alt={p.name}
                            />
                            <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[10px]">
                              🔍
                            </div>
                          </>
                        ) : (
                          <span className="text-[8px] text-gray-300 font-bold uppercase">
                            N/A
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="p-4 font-bold">{p.name}</td>
                    <td className="p-4 uppercase text-xs">{p.brand}</td>
                    <td className="p-4 italic text-blue-600">
                      {p.flavor || "—"}
                    </td>

                    <td className="p-4 text-right space-x-3">
                      <button
                        onClick={() =>
                          setEditingId(isEditing ? null : p.id)
                        }
                        className="text-blue-600 text-xs underline"
                      >
                        {isEditing ? "Fechar" : "Editar"}
                      </button>
                      <form
                        action={deleteWheyAction}
                        className="inline"
                        onSubmit={(e) =>
                          !confirm("Excluir?") && e.preventDefault()
                        }
                      >
                        <input type="hidden" name="id" value={p.id} />
                        <button type="submit" className="text-red-400 text-xs">
                          Excluir
                        </button>
                      </form>
                    </td>
                  </tr>

                  {isEditing && (
                    <tr className="bg-blue-50/30">
                      <td colSpan={6} className="p-6">
                        <form
                          action={updateWheyAction}
                          className="bg-white border p-6 rounded-2xl space-y-4"
                        >
                          <ToastOnSubmit message="✅ Whey atualizado!" />
                          <input type="hidden" name="id" value={p.id} />
                          <Field label="Nome">
                            <input
                              name="name"
                              defaultValue={p.name}
                              className={inputStyle}
                            />
                          </Field>
                          <Field label="Marca">
                            <input
                              name="brand"
                              defaultValue={p.brand}
                              className={inputStyle}
                            />
                          </Field>
                          <Field label="Sabor">
                            <input
                              name="flavor"
                              defaultValue={p.flavor ?? ""}
                              className={inputStyle}
                            />
                          </Field>
                          <Field label="Peso total (g)">
                            <input
                              name="totalWeightInGrams"
                              type="number"
                              defaultValue={p.wheyInfo?.totalWeightInGrams}
                              className={inputStyle}
                            />
                          </Field>
                          <Field label="Dose (g)">
                            <input
                              name="doseInGrams"
                              type="number"
                              defaultValue={p.wheyInfo?.doseInGrams}
                              className={inputStyle}
                            />
                          </Field>
                          <Field label="Prot/dose (g)">
                            <input
                              name="proteinPerDoseInGrams"
                              type="number"
                              defaultValue={
                                p.wheyInfo?.proteinPerDoseInGrams
                              }
                              className={inputStyle}
                            />
                          </Field>
                          <Field label="Imagem">
                            <input
                              name="imageUrl"
                              defaultValue={p.imageUrl}
                              className={inputStyle}
                            />
                          </Field>
                          <Field label="ASIN">
                            <input
                              name="amazonAsin"
                              defaultValue={p.offers[0]?.externalId ?? ""}
                              className={inputStyle}
                            />
                          </Field>

                          <div className="flex justify-end pt-4">
                            <button type="submit" className="bg-blue-600 text-white px-10 py-2 rounded-xl text-xs font-bold">
                              Salvar
                            </button>
                          </div>
                        </form>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex justify-between mt-6 text-xs font-bold">
        <button
          disabled={page === 1}
          onClick={() => setPage((p) => p - 1)}
          className="disabled:opacity-30"
        >
          ← Anterior
        </button>
        <span>
          Página {page} de {totalPages}
        </span>
        <button
          disabled={page === totalPages}
          onClick={() => setPage((p) => p + 1)}
          className="disabled:opacity-30"
        >
          Próxima →
        </button>
      </div>
    </main>
  );
}