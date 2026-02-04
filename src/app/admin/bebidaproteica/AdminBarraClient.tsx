"use client";

import React, { useMemo, useState } from "react";
import {
  createBarraAction,
  deleteBarraAction,
  updateBarraAction,
  bulkUpdateBarraAction,
  bulkDeleteBarraAction,
} from "./actions";
import type { BarraProduct } from "./AdminBarraWrapper";
import { ToastOnSubmit } from "../creatina/ToastOnSubmit";

/* =======================
    FIELD HELPER
======================= */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-12 gap-2 items-center w-full">
      <label className="col-span-2 text-sm font-medium text-gray-700">{label}</label>
      <div className="col-span-10">{children}</div>
    </div>
  );
}

const ITEMS_PER_PAGE = 100; // 🚀 Atualizado para 100 itens
const inputStyle = "w-full border rounded-md p-2 text-sm focus:ring-2 focus:ring-blue-100 outline-none transition-all";

type SortConfig = {
  key: "name" | "brand" | "flavor" | "createdAt";
  direction: "asc" | "desc";
};

export default function AdminBarraClient({ products }: { products: BarraProduct[] }) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sort, setSort] = useState<SortConfig>({ key: "createdAt", direction: "desc" });
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  /* ======================= LÓGICA DE ORDENAÇÃO ======================= */
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
    let result = products.filter(p => 
      p.name.toLowerCase().includes(term) || 
      p.brand.toLowerCase().includes(term) ||
      (p.flavor?.toLowerCase().includes(term))
    );

    result.sort((a, b) => {
      const aValue = (a[sort.key] || "").toString().toLowerCase();
      const bValue = (b[sort.key] || "").toString().toLowerCase();
      if (sort.key === "createdAt") {
        return sort.direction === "asc" 
          ? new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      return sort.direction === "asc" ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
    });
    return result;
  }, [products, search, sort]);

  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
  const paginatedProducts = useMemo(() => {
    const start = (page - 1) * ITEMS_PER_PAGE;
    return filteredProducts.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredProducts, page]);

  /* ======================= LÓGICA DE LOTE ======================= */
  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === paginatedProducts.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(paginatedProducts.map(p => p.id)));
  };

  const handleBulkUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get("bulkName") as string;
    const brand = formData.get("bulkBrand") as string;
    const units = formData.get("bulkUnits") ? Number(formData.get("bulkUnits")) : undefined;
    const dose = formData.get("bulkDose") ? Number(formData.get("bulkDose")) : undefined;
    const protein = formData.get("bulkProtein") ? Number(formData.get("bulkProtein")) : undefined;

    await bulkUpdateBarraAction(Array.from(selectedIds), {
      name: name || undefined,
      brand: brand || undefined,
      unitsPerBox: units,
      doseInGrams: dose,
      proteinPerDoseInGrams: protein,
    });
    
    setSelectedIds(new Set());
    alert("🚀 Lote atualizado!");
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Deseja excluir permanentemente ${selectedIds.size} produtos?`)) return;
    await bulkDeleteBarraAction(Array.from(selectedIds));
    setSelectedIds(new Set());
    alert("🗑️ Produtos excluídos!");
  };

  return (
    <main className="max-w-6xl mx-auto p-6">
      {zoomedImage && (
        <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 cursor-zoom-out" onClick={() => setZoomedImage(null)}>
          <div className="relative max-w-4xl w-full h-full flex items-center justify-center">
            <img src={zoomedImage} className="max-w-full max-h-full object-contain rounded-lg" alt="Zoom" />
            <button className="absolute top-0 right-0 text-white text-4xl p-4">&times;</button>
          </div>
        </div>
      )}

      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-black tracking-tighter text-gray-900 uppercase">Gestão de Barras</h1>
          <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">Controle de Catálogo</p>
        </div>
        <div className="bg-gray-100 px-4 py-1 rounded font-mono text-xs text-gray-500">{products.length} itens</div>
      </div>

      {/* PAINEL DE LOTE STICKY */}
      {selectedIds.size > 0 && (
        <div className="sticky top-4 z-50 mb-6 bg-black text-white p-4 rounded-xl shadow-2xl flex flex-col gap-4 animate-in slide-in-from-top-4">
          <div className="flex justify-between items-center border-b border-gray-800 pb-2">
            <span className="font-bold text-sm whitespace-nowrap">⚡ {selectedIds.size} selecionados</span>
            <div className="flex gap-4 items-center">
              <button onClick={handleBulkDelete} className="text-[10px] text-red-400 font-black uppercase hover:text-red-300 underline">Excluir Lote</button>
              <button onClick={() => setSelectedIds(new Set())} className="text-[10px] uppercase font-bold opacity-50 hover:opacity-100">Sair</button>
            </div>
          </div>
          
          <form onSubmit={handleBulkUpdate} className="grid grid-cols-6 gap-2">
            {/* Nome preenchendo toda a linha superior do form de lote */}
            <input name="bulkName" placeholder="Novo Nome em Massa" className="col-span-6 bg-gray-900 border border-gray-800 rounded p-2 text-xs outline-none focus:ring-1 ring-blue-500" />
            
            <input name="bulkBrand" placeholder="Marca" className="bg-gray-900 border border-gray-800 rounded p-2 text-xs outline-none focus:ring-1 ring-blue-500" />
            <input name="bulkUnits" type="number" placeholder="Un/Cx" className="bg-gray-900 border border-gray-800 rounded p-2 text-xs" />
            <input name="bulkDose" type="number" placeholder="Peso (g)" className="bg-gray-900 border border-gray-800 rounded p-2 text-xs" />
            <input name="bulkProtein" type="number" placeholder="Prot/un" className="bg-gray-900 border border-gray-800 rounded p-2 text-xs" />
            <button type="submit" className="col-span-2 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 rounded text-xs transition-colors uppercase">Aplicar em todos</button>
          </form>
        </div>
      )}

      <div className="flex gap-4 mb-6">
        <input placeholder="Buscar..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="flex-1 border rounded-xl p-3 shadow-sm outline-none" />
        <button onClick={() => setShowCreate(!showCreate)} className={`px-6 rounded-xl font-bold text-sm transition-all ${showCreate ? "bg-gray-100 text-gray-500" : "bg-black text-white"}`}>
          {showCreate ? "Fechar" : "＋ Novo"}
        </button>
      </div>

      {showCreate && (
        <form action={createBarraAction} className="space-y-4 mb-10 border border-gray-200 rounded-2xl p-6 bg-gray-50 shadow-inner">
          <ToastOnSubmit message="✅ Barra cadastrada!" />
          <div className="space-y-4">
            <Field label="Nome"><input name="name" className={inputStyle} required /></Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Marca"><input name="brand" className={inputStyle} required /></Field>
              <Field label="Sabor"><input name="flavor" className={inputStyle} /></Field>
            </div>
            <Field label="URL Imagem"><input name="imageUrl" className={inputStyle} /></Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Unid. Caixa"><input name="unitsPerBox" type="number" className={inputStyle} required /></Field>
              <Field label="Peso Unid (g)"><input name="doseInGrams" type="number" className={inputStyle} required /></Field>
              <Field label="Prot./un (g)"><input name="proteinPerDoseInGrams" type="number" className={inputStyle} required /></Field>
              <Field label="ASIN"><input name="amazonAsin" className={inputStyle} /></Field>
            </div>
          </div>
          <button className="w-full bg-black text-white py-3 rounded-xl font-bold mt-4">SALVAR NOVO PRODUTO</button>
        </form>
      )}

      <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-200 text-[10px] uppercase font-bold text-gray-400">
            <tr>
              <th className="p-4 w-10 text-center"><input type="checkbox" checked={selectedIds.size === paginatedProducts.length && paginatedProducts.length > 0} onChange={toggleSelectAll} /></th>
              <th className="p-4 w-20 text-center">Foto</th>
              <th className="p-4 cursor-pointer" onClick={() => requestSort("name")}>Produto {getSortIcon("name")}</th>
              <th className="p-4 cursor-pointer" onClick={() => requestSort("brand")}>Marca {getSortIcon("brand")}</th>
              <th className="p-4 cursor-pointer" onClick={() => requestSort("flavor")}>Sabor {getSortIcon("flavor")}</th>
              <th className="p-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-sm text-gray-600">
            {paginatedProducts.map((p) => {
              const isEditing = editingId === p.id;
              return (
                <React.Fragment key={p.id}>
                  <tr className={`hover:bg-gray-50 transition-colors ${selectedIds.has(p.id) ? "bg-blue-50/50" : ""}`}>
                    <td className="p-4 text-center"><input type="checkbox" checked={selectedIds.has(p.id)} onChange={() => toggleSelect(p.id)} /></td>
                    <td className="p-4 flex justify-center">
                      <div className="group relative w-12 h-12 bg-white border rounded flex items-center justify-center cursor-pointer" onClick={() => p.imageUrl && setZoomedImage(p.imageUrl)}>
                        {p.imageUrl ? <><img src={p.imageUrl} className="w-full h-full object-contain" /><div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[10px]">🔍</div></> : <span className="text-[8px] text-gray-300 font-bold uppercase">N/A</span>}
                      </div>
                    </td>
                    <td className="p-4 font-bold text-gray-900">{p.name}</td>
                    <td className="p-4 font-bold uppercase text-[10px]">{p.brand}</td>
                    <td className="p-4 italic text-blue-600 font-medium">{p.flavor || "—"}</td>
                    <td className="p-4 text-right space-x-3 text-nowrap">
                      <button onClick={() => setEditingId(isEditing ? null : p.id)} className="text-xs font-bold text-blue-600 underline">{isEditing ? "Fechar" : "Editar"}</button>
                      <form action={deleteBarraAction} className="inline" onSubmit={(e) => !confirm("Excluir?") && e.preventDefault()}>
                        <input type="hidden" name="id" value={p.id} /><button className="text-xs font-bold text-red-400">Excluir</button>
                      </form>
                    </td>
                  </tr>
                  {isEditing && (
                    <tr className="bg-blue-50/30">
                      <td colSpan={6} className="p-6">
                        <form action={updateBarraAction} className="bg-white border p-6 rounded-2xl shadow-xl space-y-4">
                          <input type="hidden" name="id" value={p.id} />
                          
                          {/* Edição individual agora preenche toda a linha */}
                          <Field label="Nome Completo"><input name="name" defaultValue={p.name} className={inputStyle} /></Field>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <Field label="Marca"><input name="brand" defaultValue={p.brand} className={inputStyle} /></Field>
                            <Field label="Sabor"><input name="flavor" defaultValue={p.flavor ?? ""} className={inputStyle} /></Field>
                          </div>

                          <Field label="URL Imagem"><input name="imageUrl" defaultValue={p.imageUrl} className={inputStyle} /></Field>

                          <div className="grid grid-cols-2 gap-4 border-t pt-4">
                            <Field label="Unid. Caixa"><input name="unitsPerBox" type="number" defaultValue={p.proteinBarInfo?.unitsPerBox} className={inputStyle} /></Field>
                            <Field label="Peso Unid."><input name="doseInGrams" type="number" defaultValue={p.proteinBarInfo?.doseInGrams} className={inputStyle} /></Field>
                            <Field label="Prot./un"><input name="proteinPerDoseInGrams" type="number" defaultValue={p.proteinBarInfo?.proteinPerDoseInGrams} className={inputStyle} /></Field>
                            <Field label="ASIN"><input name="amazonAsin" defaultValue={p.offers[0]?.externalId} className={inputStyle} /></Field>
                          </div>
                          
                          <div className="flex justify-end gap-3 pt-4 border-t">
                            <button type="submit" className="bg-blue-600 text-white px-12 py-2 rounded-xl font-bold uppercase text-xs">Salvar Alterações</button>
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

      <div className="flex justify-between items-center mt-6">
        <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="text-xs font-bold uppercase disabled:opacity-30">← Anterior</button>
        <span className="text-[10px] font-bold text-gray-400">Página {page} de {totalPages} ({filteredProducts.length} itens)</span>
        <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="text-xs font-bold uppercase disabled:opacity-30">Próxima →</button>
      </div>
    </main>
  );
}