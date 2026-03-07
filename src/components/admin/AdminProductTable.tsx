'use client';

import React, { useState, useMemo } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { 
  updateManyProducts, 
  updateDynamicProduct, 
  deleteDynamicProduct, 
  deleteManyProducts 
} from '@/app/admin/dynamic/produtos/actions';
import { Prisma } from '@prisma/client';

type DynamicAttributes = Record<string, string | number | boolean | null | undefined>;

interface DisplayConfigItem {
  key: string;
  label: string;
  type: 'text' | 'number' | 'currency';
  public: boolean;
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
  const cleanInput = input.replace(/\s+/g, '').replace(',', '.');
  const mathRegex = /^[0-9+\-*/.()]+$/;
  if (mathRegex.test(cleanInput)) {
    try {
      const result = new Function(`return ${cleanInput}`)();
      return String(result);
    } catch { return input; }
  }
  return input;
}

export function AdminProductTable({ initialProducts, categories }: { initialProducts: Product[], categories: CategoryOption[] }) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [zoomImage, setZoomImage] = useState<string | null>(null);
  const [bulkData, setBulkData] = useState<Record<string, string>>({});
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>({ key: 'name', direction: 'asc' });

  const dynamicColumns = useMemo(() => {
    if (filterCategory === 'all') return [];
    const cat = initialProducts.find(p => p.category.id === filterCategory);
    const config = (cat?.category?.displayConfig as unknown as DisplayConfigItem[]) || [];
    return config.filter(c => c.type !== 'currency' && !['marca', 'brand', 'asin'].includes(c.key.toLowerCase()));
  }, [filterCategory, initialProducts]);

  const processedProducts = useMemo(() => {
    const filtered = initialProducts.filter(p => {
      const attrs = (p.attributes as DynamicAttributes) || {};
      const matchesCat = filterCategory === 'all' || p.category.id === filterCategory;
      const searchStr = searchTerm.toLowerCase();
      return matchesCat && (
        p.name.toLowerCase().includes(searchStr) || 
        String(attrs.asin || '').toLowerCase().includes(searchStr) || 
        String(attrs.marca || attrs.brand || '').toLowerCase().includes(searchStr)
      );
    });

    if (sortConfig) {
      filtered.sort((a, b) => {
        const attrsA = (a.attributes as DynamicAttributes) || {};
        const attrsB = (b.attributes as DynamicAttributes) || {};
        
        let aVal: string | number = '';
        let bVal: string | number = '';

        if (sortConfig.key === 'brand') {
          aVal = String(attrsA.marca || attrsA.brand || '');
          bVal = String(attrsB.marca || attrsB.brand || '');
        } else if (sortConfig.key === 'totalPrice') {
          aVal = a.totalPrice;
          bVal = b.totalPrice;
        } else if (sortConfig.key === 'name') {
          aVal = a.name;
          bVal = b.name;
        } else {
          aVal = String(attrsA[sortConfig.key] || '');
          bVal = String(attrsB[sortConfig.key] || '');
        }

        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return filtered;
  }, [initialProducts, filterCategory, searchTerm, sortConfig]);

  const handleBulkDelete = async () => {
    if (!confirm(`Excluir permanentemente ${selectedIds.length} produtos?`)) return;
    const res = await deleteManyProducts(selectedIds);
    if (res.success) { setSelectedIds([]); router.refresh(); }
  };

  const handleBulkSave = async () => {
    if (Object.keys(bulkData).length === 0) return alert("Preencha ao menos um campo.");
    if (!confirm(`Aplicar alterações em ${selectedIds.length} produtos?`)) return;

    for (const key in bulkData) {
      if (bulkData[key]) await updateManyProducts(selectedIds, key, bulkData[key]);
    }
    setSelectedIds([]);
    setBulkData({});
    router.refresh();
  };

  const handleQuickUpdate = async (id: string, field: string, value: string | number, isAttribute = false) => {
    const product = initialProducts.find(p => p.id === id);
    if (!product) return;
    const currentAttrs = (product.attributes as DynamicAttributes) || {};
    const updatedData = {
      name: field === 'name' ? String(value) : product.name,
      totalPrice: field === 'totalPrice' ? Number(value) : product.totalPrice,
      attributes: isAttribute ? { ...currentAttrs, [field]: value } : currentAttrs
    };
    await updateDynamicProduct(id, updatedData);
    router.refresh();
  };

  return (
    <div className="space-y-6 font-sans text-black">
      {/* 🚀 CABEÇALHO COM BOTÃO VOLTAR */}
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.push('/admin/dynamic')}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-50 transition-all shadow-sm active:scale-95"
          >
            ← Painel Inicial
          </button>
          <h1 className="text-xl font-black uppercase tracking-tighter text-gray-800">Produtos Dinâmicos</h1>
        </div>
        <div className="text-[10px] font-bold text-gray-400 uppercase bg-gray-100 px-3 py-1 rounded-full">
          Total: {processedProducts.length} itens
        </div>
      </div>

      <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm space-y-4">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[300px]">
            <label className="text-[10px] font-black uppercase text-gray-400 mb-2 block ml-1">Pesquisar</label>
            <input placeholder="Nome, marca ou ASIN..." className="w-full p-3 bg-gray-50 rounded-xl border-none font-bold text-sm outline-none focus:ring-2 focus:ring-yellow-400" onChange={e => setSearchTerm(e.target.value)} />
          </div>
          <div className="w-full md:w-64">
            <label className="text-[10px] font-black uppercase text-gray-400 mb-2 block ml-1">Categoria</label>
            <select className="w-full p-3 bg-gray-50 rounded-xl border-none font-bold text-sm outline-none cursor-pointer" onChange={e => setFilterCategory(e.target.value)}>
              <option value="all">Todas</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>

        {selectedIds.length > 0 && (
          <div className="bg-yellow-400 p-6 rounded-3xl shadow-lg animate-in slide-in-from-top-4">
            <div className="flex justify-between items-center mb-4 text-black">
              <h3 className="font-black uppercase text-[10px] tracking-widest">Edição em Massa ({selectedIds.length} itens)</h3>
              <div className="flex gap-2">
                <button onClick={handleBulkDelete} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase shadow-md active:scale-95">Excluir Selecionados</button>
                <button onClick={handleBulkSave} className="bg-white text-black px-4 py-2 rounded-xl text-[10px] font-black uppercase shadow-md hover:bg-gray-50">Salvar Alterações</button>
                <button onClick={() => setSelectedIds([])} className="text-black/60 text-[10px] font-black uppercase px-2">Cancelar</button>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {dynamicColumns.map(field => (
                <div key={field.key}>
                  <label className="text-[9px] font-black uppercase text-black/50 mb-1 block ml-1">{field.public ? '' : '👁️‍🗨️ '}{field.label}</label>
                  <input placeholder={`Definir ${field.label}...`} className="w-full p-2.5 rounded-lg text-xs border-none shadow-inner outline-none focus:ring-2 focus:ring-black" onChange={e => setBulkData({...bulkData, [field.key]: e.target.value})} />
                </div>
              ))}
              <div>
                <label className="text-[9px] font-black uppercase text-black/50 mb-1 block ml-1">Marca</label>
                <input placeholder="Definir Marca..." className="w-full p-2.5 rounded-lg text-xs border-none shadow-inner outline-none focus:ring-2 focus:ring-black" onChange={e => setBulkData({...bulkData, marca: e.target.value})} />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-[2rem] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-[10px] font-black uppercase text-gray-400 tracking-widest">
                <th className="p-4 w-12 text-center">
                  <input type="checkbox" onChange={(e) => {
                    if (e.target.checked) setSelectedIds(processedProducts.map(p => p.id));
                    else setSelectedIds([]);
                  }} />
                </th>
                <th className="p-4 w-28 text-center text-black">Foto / ASIN</th>
                <th className="p-4 cursor-pointer hover:text-black text-black" onClick={() => setSortConfig({ key: 'name', direction: sortConfig?.direction === 'asc' ? 'desc' : 'asc' })}>Nome do Produto</th>
                {dynamicColumns.map(col => (
                  <th key={col.key} className="p-4 text-center cursor-pointer hover:text-black text-black min-w-[110px]" onClick={() => setSortConfig({ key: col.key, direction: sortConfig?.direction === 'asc' ? 'desc' : 'asc' })}>
                    {col.public ? '' : '👁️‍🗨️ '}{col.label}
                  </th>
                ))}
                <th className="p-4 w-32 text-center cursor-pointer hover:text-black text-black" onClick={() => setSortConfig({ key: 'brand', direction: sortConfig?.direction === 'asc' ? 'desc' : 'asc' })}>Marca</th>
                <th className="p-4 w-32 text-center cursor-pointer hover:text-black text-black" onClick={() => setSortConfig({ key: 'totalPrice', direction: sortConfig?.direction === 'asc' ? 'desc' : 'asc' })}>Preço</th>
                <th className="p-4 w-20 text-right text-black">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {processedProducts.map(p => {
                const attrs = (p.attributes as DynamicAttributes) || {};
                return (
                  <tr key={p.id} className={`hover:bg-gray-50/50 transition-colors ${selectedIds.includes(p.id) ? 'bg-yellow-50/40' : ''}`}>
                    <td className="p-4 text-center">
                      <input type="checkbox" checked={selectedIds.includes(p.id)} onChange={() => setSelectedIds(prev => prev.includes(p.id) ? prev.filter(i => i !== p.id) : [...prev, p.id])} />
                    </td>
                    <td className="p-4 text-center">
                      <div className="relative w-12 h-12 mx-auto bg-white border border-gray-100 rounded-lg overflow-hidden shadow-sm cursor-zoom-in mb-2 group" onClick={() => setZoomImage(p.imageUrl)}>
                        {p.imageUrl && <Image src={p.imageUrl} alt="" fill className="object-contain p-1 group-hover:scale-110 transition-transform" />}
                      </div>
                      <a 
                        href={`https://www.amazon.com.br/dp/${String(attrs.asin)}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-[9px] font-bold text-blue-500 font-mono block uppercase bg-blue-50 py-0.5 rounded hover:bg-blue-600 hover:text-white transition-all cursor-pointer"
                        title="Abrir na Amazon"
                      >
                        {String(attrs.asin || '---')} ↗
                      </a>
                    </td>
                    <td className="p-4">
                      <textarea 
                        className="w-full bg-transparent border-none font-bold text-[13px] p-0 focus:ring-0 text-gray-900 leading-tight resize-none min-h-[50px] overflow-hidden" 
                        defaultValue={p.name} 
                        rows={2}
                        onBlur={e => handleQuickUpdate(p.id, 'name', e.target.value)} 
                      />
                    </td>
                    {dynamicColumns.map(col => (
                      <td key={col.key} className="p-4 text-center">
                        <input className="w-full max-w-[90px] p-1.5 text-center text-[11px] font-black rounded-lg border border-transparent hover:border-gray-200 bg-gray-50 focus:bg-white focus:border-yellow-400 outline-none" defaultValue={String(attrs[col.key] || '')} onBlur={e => {
                          const val = col.type === 'number' ? solveMath(e.target.value) : e.target.value;
                          e.target.value = val;
                          handleQuickUpdate(p.id, col.key, col.type === 'number' ? Number(val) : val, true);
                        }} />
                      </td>
                    ))}
                    <td className="p-4 text-center">
                      <input className="w-full bg-transparent border-none text-center text-[10px] font-black uppercase italic text-gray-500 focus:ring-0" defaultValue={String(attrs.marca || attrs.brand || '')} onBlur={e => handleQuickUpdate(p.id, 'marca', e.target.value, true)} />
                    </td>
                    <td className="p-4 text-center font-black text-xs text-green-700">
                      R$ <input type="number" step="0.01" className="w-16 bg-transparent border-none p-0 focus:ring-0 text-center font-black" defaultValue={p.totalPrice} onBlur={e => handleQuickUpdate(p.id, 'totalPrice', Number(e.target.value))} />
                    </td>
                    <td className="p-4 text-right">
                      <button onClick={() => confirm("Excluir?") && deleteDynamicProduct(p.id).then(() => router.refresh())} className="text-red-200 hover:text-red-600 font-black text-[10px] uppercase transition-colors">Excluir</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {zoomImage && (
        <div className="fixed inset-0 bg-black/90 z-[999] flex items-center justify-center p-10 cursor-zoom-out" onClick={() => setZoomImage(null)}>
          <div className="relative w-full h-full max-w-4xl"><Image src={zoomImage} alt="Zoom" fill className="object-contain" priority /></div>
        </div>
      )}
    </div>
  );
}