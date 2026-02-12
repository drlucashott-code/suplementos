/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useMemo, useState } from "react";
import {
  createPreTreinoAction,
  deletePreTreinoAction,
  updatePreTreinoAction,
  bulkUpdatePreTreinoAction,
  bulkDeletePreTreinoAction,
} from "./actions";
import type { Product, PreWorkoutInfo, Offer } from "@prisma/client";
import { ToastOnSubmit } from "../creatina/ToastOnSubmit";

/* =======================
   TYPE DEFINITION
======================= */
export type PreTreinoProduct = Omit<Product, "createdAt" | "updatedAt"> & {
  preWorkoutInfo: PreWorkoutInfo | null;
  offers: Offer[];
  createdAt: string;
  updatedAt: string;
};

/* =======================
   FIELD HELPER
======================= */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-12 gap-2 items-center w-full">
      <label className="col-span-3 text-sm font-medium text-gray-700">{label}</label>
      <div className="col-span-9">{children}</div>
    </div>
  );
}

const ITEMS_PER_PAGE = 100;
const inputStyle = "w-full border rounded-md p-2 text-sm focus:ring-2 focus:ring-blue-100 outline-none transition-all";

type SortConfig = {
  key: "name" | "brand" | "flavor" | "createdAt";
  direction: "asc" | "desc";
};

export default function AdminPreTreinoClient({ products }: { products: PreTreinoProduct[] }) {
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
    
    const result = products.filter(p => 
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
    
    // Captura campos do form de lote
    const name = formData.get("bulkName") as string;
    const brand = formData.get("bulkBrand") as string;
    const flavor = formData.get("bulkFlavor") as string; // ✅ Captura o sabor
    const totalWeight = formData.get("bulkTotalWeight") ? Number(formData.get("bulkTotalWeight")) : undefined;
    const dose = formData.get("bulkDose") ? Number(formData.get("bulkDose")) : undefined;
    const caffeine = formData.get("bulkCaffeine") ? Number(formData.get("bulkCaffeine")) : undefined;

    await bulkUpdatePreTreinoAction(Array.from(selectedIds), {
      name: name || undefined,
      brand: brand || undefined,
      flavor: flavor || undefined, // ✅ Envia o sabor
      totalWeightInGrams: totalWeight,
      doseInGrams: dose,
      caffeinePerDoseInMg: caffeine,
    });
    
    setSelectedIds(new Set());
    alert("🚀 Lote de pré-treinos atualizado!");
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Deseja excluir permanentemente ${selectedIds.size} itens?`)) return;
    await bulkDeletePreTreinoAction(Array.from(selectedIds));
    setSelectedIds(new Set());
    alert("🗑️ Itens excluídos!");
  };

  return (
    <main className="max-w-7xl mx-auto p-6 font-sans">
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
          <h1 className="text-3xl font-black tracking-tighter text-gray-900 uppercase">Gestão de Pré-Treino</h1>
          <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">Controle de Catálogo</p>
        </div>
        <div className="bg-orange-100 px-4 py-1 rounded font-mono text-xs text-orange-600 font-bold border border-orange-200">
          {products.length} itens
        </div>
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
          
          <form onSubmit={handleBulkUpdate} className="grid grid-cols-12 gap-2">
            <input name="bulkName" placeholder="Novo Nome em Massa" className="col-span-4 bg-gray-900 border border-gray-800 rounded p-2 text-xs outline-none focus:ring-1 ring-blue-500" />
            <input name="bulkBrand" placeholder="Marca" className="col-span-2 bg-gray-900 border border-gray-800 rounded p-2 text-xs outline-none focus:ring-1 ring-blue-500" />
            {/* ✅ Campo Sabor na Edição em Massa */}
            <input name="bulkFlavor" placeholder="Sabor" className="col-span-2 bg-gray-900 border border-gray-800 rounded p-2 text-xs outline-none focus:ring-1 ring-blue-500" />
            
            <input name="bulkTotalWeight" type="number" step="1" placeholder="Peso (g)" className="col-span-1 bg-gray-900 border border-gray-800 rounded p-2 text-xs" />
            <input name="bulkDose" type="number" step="0.1" placeholder="Dose (g)" className="col-span-1 bg-gray-900 border border-gray-800 rounded p-2 text-xs" />
            <input name="bulkCaffeine" type="number" step="1" placeholder="Caf (mg)" className="col-span-1 bg-gray-900 border border-gray-800 rounded p-2 text-xs" />
            
            <button type="submit" className="col-span-1 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded text-[10px] transition-colors uppercase">Aplicar</button>
          </form>
        </div>
      )}

      <div className="flex gap-4 mb-6">
        <input placeholder="Buscar por nome, marca ou sabor..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="flex-1 border rounded-xl p-3 shadow-sm outline-none" />
        <button onClick={() => setShowCreate(!showCreate)} className={`px-6 rounded-xl font-bold text-sm transition-all ${showCreate ? "bg-gray-100 text-gray-500" : "bg-black text-white"}`}>
          {showCreate ? "Fechar" : "＋ Novo"}
        </button>
      </div>

      {showCreate && (
        <form action={createPreTreinoAction} className="space-y-4 mb-10 border border-gray-200 rounded-2xl p-6 bg-gray-50 shadow-inner">
          <ToastOnSubmit message="✅ Pré-treino cadastrado!" />
          <div className="space-y-4">
            <Field label="Nome"><input name="name" className={inputStyle} required /></Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Marca"><input name="brand" className={inputStyle} required /></Field>
              <Field label="Sabor"><input name="flavor" className={inputStyle} /></Field>
            </div>
            <Field label="URL Imagem"><input name="imageUrl" className={inputStyle} /></Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Peso Total (g)"><input name="totalWeightInGrams" type="number" step="1" className={inputStyle} required /></Field>
              <Field label="Tam. Dose (g)"><input name="doseInGrams" type="number" step="0.1" className={inputStyle} required /></Field>
              <Field label="Cafeína (mg)"><input name="caffeinePerDoseInMg" type="number" step="1" className={inputStyle} required /></Field>
              <Field label="ASIN (Amazon)"><input name="amazonAsin" className={inputStyle} /></Field>
            </div>
          </div>
          <button className="w-full bg-black text-white py-3 rounded-xl font-bold mt-4">SALVAR NOVO PRÉ-TREINO</button>
        </form>
      )}

      <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-200 text-[10px] uppercase font-bold text-gray-400">
            <tr>
              <th className="p-4 w-10 text-center"><input type="checkbox" checked={selectedIds.size === paginatedProducts.length && paginatedProducts.length > 0} onChange={toggleSelectAll} /></th>
              <th className="p-4 w-20 text-center">Foto</th>
              <th className="p-4 cursor-pointer" onClick={() => requestSort("name")}>Produto {getSortIcon("name")}</th>
              {/* ✅ Coluna Sabor Exclusiva */}
              <th className="p-4 cursor-pointer" onClick={() => requestSort("flavor")}>Sabor {getSortIcon("flavor")}</th>
              <th className="p-4 cursor-pointer" onClick={() => requestSort("brand")}>Marca {getSortIcon("brand")}</th>
              <th className="p-4 text-center">Peso</th>
              <th className="p-4 text-center">Dose</th>
              <th className="p-4 text-center">Cafeína</th>
              <th className="p-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-sm text-gray-600">
            {paginatedProducts.map((p) => {
              const isEditing = editingId === p.id;
              const info = p.preWorkoutInfo;
              
              return (
                <React.Fragment key={p.id}>
                  <tr className={`hover:bg-gray-50 transition-colors ${selectedIds.has(p.id) ? "bg-blue-50/50" : ""}`}>
                    <td className="p-4 text-center"><input type="checkbox" checked={selectedIds.has(p.id)} onChange={() => toggleSelect(p.id)} /></td>
                    <td className="p-4 flex justify-center">
                      <div className="group relative w-12 h-12 bg-white border rounded flex items-center justify-center cursor-pointer" onClick={() => p.imageUrl && setZoomedImage(p.imageUrl)}>
                        {p.imageUrl ? <img src={p.imageUrl} alt={p.name} className="w-full h-full object-contain" /> : <span className="text-[8px] text-gray-300 font-bold uppercase">N/A</span>}
                        {p.imageUrl && <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[10px]">🔍</div>}
                      </div>
                    </td>
                    <td className="p-4 font-bold text-gray-900">
                      {p.name}
                    </td>
                    {/* ✅ Coluna Sabor */}
                    <td className="p-4 text-xs font-medium text-gray-500">
                      {p.flavor || "—"}
                    </td>
                    <td className="p-4 font-bold uppercase text-[10px]">{p.brand}</td>
                    
                    <td className="p-4 text-center">{info?.totalWeightInGrams}g</td>
                    <td className="p-4 text-center">{info?.doseInGrams}g</td>
                    <td className="p-4 text-center font-bold text-orange-600">{info?.caffeinePerDoseInMg}mg</td>

                    <td className="p-4 text-right space-x-3 text-nowrap">
                      <button onClick={() => setEditingId(isEditing ? null : p.id)} className="text-xs font-bold text-blue-600 underline">{isEditing ? "Fechar" : "Editar"}</button>
                      <form action={deletePreTreinoAction} className="inline" onSubmit={(e) => !confirm("Excluir este item?") && e.preventDefault()}>
                        <input type="hidden" name="id" value={p.id} /><button className="text-xs font-bold text-red-400">Excluir</button>
                      </form>
                    </td>
                  </tr>
                  {isEditing && (
                    <tr className="bg-blue-50/30">
                      <td colSpan={9} className="p-6">
                        <form action={updatePreTreinoAction} className="bg-white border p-6 rounded-2xl shadow-xl space-y-4">
                          <input type="hidden" name="id" value={p.id} />
                          
                          <Field label="Nome Completo"><input name="name" defaultValue={p.name} className={inputStyle} /></Field>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <Field label="Marca"><input name="brand" defaultValue={p.brand} className={inputStyle} /></Field>
                            <Field label="Sabor"><input name="flavor" defaultValue={p.flavor ?? ""} className={inputStyle} /></Field>
                          </div>

                          <Field label="URL Imagem"><input name="imageUrl" defaultValue={p.imageUrl} className={inputStyle} /></Field>

                          <div className="grid grid-cols-2 gap-4 border-t pt-4">
                            <Field label="Peso Total (g)"><input name="totalWeightInGrams" type="number" step="1" defaultValue={info?.totalWeightInGrams} className={inputStyle} /></Field>
                            <Field label="Tam. Dose (g)"><input name="doseInGrams" type="number" step="0.1" defaultValue={info?.doseInGrams} className={inputStyle} /></Field>
                            <Field label="Cafeína (mg)"><input name="caffeinePerDoseInMg" type="number" step="1" defaultValue={info?.caffeinePerDoseInMg} className={inputStyle} /></Field>
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