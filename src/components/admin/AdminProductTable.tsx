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

// 🚀 DEFINIÇÃO DE TIPOS PARA MATAR O "ANY"
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

// 🚀 FUNÇÃO CALCULADORA: Resolve equações simples (ex: "20*10")
function solveMath(input: string): string {
  const cleanInput = input.replace(/\s+/g, '').replace(',', '.');
  const mathRegex = /^[0-9+\-*/.()]+$/;
  
  if (mathRegex.test(cleanInput)) {
    try {
      // Resolve a string matemática de forma segura
      const result = new Function(`return ${cleanInput}`)();
      return String(result);
    } catch {
      return input;
    }
  }
  return input;
}

export function AdminProductTable({ initialProducts, categories }: { initialProducts: Product[], categories: CategoryOption[] }) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [zoomImage, setZoomImage] = useState<string | null>(null);
  const [bulkData, setBulkData] = useState<Record<string, string>>({});

  const filteredProducts = useMemo(() => {
    return initialProducts.filter(p => {
      const attrs = (p.attributes as DynamicAttributes) || {};
      const matchesCat = filterCategory === 'all' || p.category.id === filterCategory;
      
      const searchStr = searchTerm.toLowerCase();
      const matchesSearch = 
        p.name.toLowerCase().includes(searchStr) || 
        String(attrs.asin || '').toLowerCase().includes(searchStr) || 
        String(attrs.marca || attrs.brand || '').toLowerCase().includes(searchStr);

      return matchesCat && matchesSearch;
    });
  }, [initialProducts, filterCategory, searchTerm]);

  const categoryFields = useMemo(() => {
    if (selectedIds.length === 0) return [];
    const firstSelected = initialProducts.find(p => p.id === selectedIds[0]);
    return (firstSelected?.category?.displayConfig as unknown as DisplayConfigItem[]) || [];
  }, [selectedIds, initialProducts]);

  // --- ACTIONS ---

  const handleBulkDelete = async () => {
    if (!confirm(`TEM CERTEZA? Isso excluirá permanentemente ${selectedIds.length} produtos.`)) return;
    const res = await deleteManyProducts(selectedIds);
    if (res.success) {
      setSelectedIds([]);
      router.refresh();
    }
  };

  const handleIndividualDelete = async (id: string) => {
    if (!confirm("Excluir este produto permanentemente?")) return;
    const res = await deleteDynamicProduct(id);
    if (res.success) router.refresh();
  };

  const handleBulkSave = async () => {
    if (Object.keys(bulkData).length === 0) return alert("Preencha ao menos um campo.");
    if (!confirm(`Deseja aplicar alterações em ${selectedIds.length} produtos?`)) return;

    for (const key in bulkData) {
      if (bulkData[key]) {
        await updateManyProducts(selectedIds, key, bulkData[key]);
      }
    }
    router.refresh();
  };

  const handleInlineSave = async (id: string, updatedData: { 
    name: string; 
    totalPrice: number; 
    attributes: DynamicAttributes;
  }) => {
    const res = await updateDynamicProduct(id, updatedData);
    if (res.success) {
      setEditingId(null);
      router.refresh();
    }
  };

  return (
    <div className="space-y-6 font-sans text-black">
      {/* BARRA DE FERRAMENTAS */}
      <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm space-y-4">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[300px]">
            <label className="text-[10px] font-black uppercase text-gray-400 mb-2 block ml-1">Pesquisar</label>
            <input 
              placeholder="Pesquisar por nome, marca ou ASIN..."
              className="w-full p-3 bg-gray-50 rounded-xl border-none font-bold text-sm outline-none focus:ring-2 focus:ring-yellow-400 transition-all"
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="w-full md:w-64">
            <label className="text-[10px] font-black uppercase text-gray-400 mb-2 block ml-1">Categoria</label>
            <select 
              className="w-full p-3 bg-gray-50 rounded-xl border-none font-bold text-sm outline-none cursor-pointer"
              onChange={e => setFilterCategory(e.target.value)}
            >
              <option value="all">Todas as categorias</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>

        {/* MENU BULK */}
        {selectedIds.length > 0 && (
          <div className="bg-yellow-400 p-6 rounded-3xl shadow-lg animate-in slide-in-from-top-4">
            <div className="flex justify-between items-center mb-4 text-black">
              <h3 className="font-black uppercase text-[10px] tracking-widest text-black">
                Edição em Massa ({selectedIds.length} itens)
              </h3>
              <div className="flex gap-2">
                <button onClick={handleBulkDelete} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase shadow-md transition-all active:scale-95">
                  Excluir Selecionados
                </button>
                <button onClick={handleBulkSave} className="bg-white text-black px-4 py-2 rounded-xl text-[10px] font-black uppercase shadow-md hover:bg-gray-50 transition-all">
                  Salvar Selecionados
                </button>
                <button onClick={() => setSelectedIds([])} className="text-black/60 text-[10px] font-black uppercase px-2">Cancelar</button>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {categoryFields.map(field => (
                <div key={field.key}>
                  <label className="text-[9px] font-black uppercase text-black/50 mb-1 block ml-1">
                    {field.public ? '' : '👁️‍🗨️ '}{field.label}
                  </label>
                  <input 
                    placeholder={`Definir ${field.label}...`}
                    className="w-full p-2.5 rounded-lg text-xs border-none shadow-inner outline-none focus:ring-2 focus:ring-black"
                    onChange={e => setBulkData({...bulkData, [field.key]: e.target.value})}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* TABELA */}
      <div className="bg-white border border-gray-200 rounded-[2rem] overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100 text-[10px] font-black uppercase text-gray-400 tracking-widest">
              <th className="p-4 w-10 text-center text-black">
                <input type="checkbox" className="rounded border-gray-300 text-yellow-500" onChange={(e) => {
                  if (e.target.checked) setSelectedIds(filteredProducts.map(p => p.id));
                  else setSelectedIds([]);
                }} />
              </th>
              <th className="p-4 w-20 text-center text-black">Foto</th>
              <th className="p-4 text-black">Nome</th>
              <th className="p-4 w-44 text-center text-black">Informação Técnica</th>
              <th className="p-4 w-28 text-center text-black">Marca</th>
              <th className="p-4 w-28 text-center text-black">Preço</th>
              <th className="p-4 text-right text-black">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filteredProducts.map(p => {
              const attrs = (p.attributes as DynamicAttributes) || {};
              const brand = String(attrs.marca || attrs.brand || '---');
              const asin = String(attrs.asin || '---');
              const displayConfig = (p.category.displayConfig as unknown as DisplayConfigItem[]) || [];

              const mainTechField = displayConfig.find(conf => 
                conf.type === 'number' || (conf.type === 'text' && !['marca', 'brand', 'vendedor', 'seller'].includes(conf.key.toLowerCase()))
              );

              return (
                <React.Fragment key={p.id}>
                  <tr className={`hover:bg-gray-50/50 transition-colors ${selectedIds.includes(p.id) ? 'bg-yellow-50/40' : ''}`}>
                    <td className="p-4 text-center">
                      <input type="checkbox" checked={selectedIds.includes(p.id)} onChange={() => setSelectedIds(prev => prev.includes(p.id) ? prev.filter(i => i !== p.id) : [...prev, p.id])} />
                    </td>
                    
                    <td className="p-4">
                        <div className="relative w-12 h-12 mx-auto bg-white border border-gray-100 rounded-xl overflow-hidden cursor-zoom-in flex-shrink-0 group shadow-sm" onClick={() => setZoomImage(p.imageUrl)}>
                          {p.imageUrl && <Image src={p.imageUrl} alt="" fill className="object-contain p-1 group-hover:scale-110 transition-transform" />}
                        </div>
                    </td>

                    <td className="p-4">
                        <div className="max-w-[400px]">
                          <p className="font-bold text-gray-900 text-[13px] leading-tight mb-1">{p.name}</p>
                          <div className="flex gap-2 items-center">
                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-tighter bg-gray-100 px-1.5 py-0.5 rounded-md">{p.category.name}</span>
                            <span className="text-[9px] font-bold text-blue-400 font-mono tracking-tighter">{asin}</span>
                          </div>
                        </div>
                    </td>

                    <td className="p-4 text-center">
                        {mainTechField ? (
                           <div className="flex flex-col items-center gap-1">
                             <span className="text-[8px] font-black text-gray-300 uppercase leading-none">{mainTechField.label}</span>
                             <input 
                               defaultValue={String(attrs[mainTechField.key] || '')}
                               onBlur={async (e) => {
                                 // 🚀 Lógica da Calculadora
                                 const solvedValue = solveMath(e.target.value);
                                 e.target.value = solvedValue; 

                                 if (solvedValue === String(attrs[mainTechField.key] || '')) return;
                                 
                                 const updatedAttributes: DynamicAttributes = { 
                                   ...attrs, 
                                   [mainTechField.key]: mainTechField.type === 'number' ? Number(solvedValue) : solvedValue 
                                 };
                                 
                                 await handleInlineSave(p.id, { 
                                   name: p.name, 
                                   totalPrice: p.totalPrice, 
                                   attributes: updatedAttributes 
                                 });
                               }}
                               placeholder="..."
                               className={`w-28 p-2 text-center text-xs font-bold rounded-xl border transition-all outline-none ${
                                 !attrs[mainTechField.key] 
                                   ? 'border-red-200 bg-red-50 text-red-700 focus:border-red-400' 
                                   : 'border-gray-100 focus:border-blue-400 focus:ring-2 focus:ring-blue-100'
                               }`}
                             />
                           </div>
                        ) : (
                          <span className="text-[10px] text-gray-300 italic">N/A</span>
                        )}
                    </td>

                    <td className="p-4 text-center">
                        <span className="text-gray-500 text-[10px] font-black uppercase italic tracking-widest truncate max-w-[100px] block">
                          {brand}
                        </span>
                    </td>

                    <td className="p-4 text-center">
                        <span className="text-gray-900 font-black text-xs">R$ {p.totalPrice.toFixed(2)}</span>
                    </td>

                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-4">
                        <button onClick={() => setEditingId(editingId === p.id ? null : p.id)} className="text-blue-600 font-black text-[10px] uppercase hover:underline tracking-widest">
                            {editingId === p.id ? 'Fechar' : 'Editar'}
                        </button>
                        <button onClick={() => handleIndividualDelete(p.id)} className="text-red-400 hover:text-red-600 font-black text-[10px] uppercase tracking-widest transition-colors">
                            Excluir
                        </button>
                      </div>
                    </td>
                  </tr>

                  {/* JANELA DE EDIÇÃO IN-LINE */}
                  {editingId === p.id && (
                    <tr className="bg-gray-50/80 animate-in fade-in slide-in-from-top-2 duration-300">
                      <td colSpan={7} className="p-6 border-b border-blue-50">
                        <div className="flex flex-wrap gap-4 items-end max-w-7xl mx-auto">
                          <div className="flex-1 min-w-[200px]">
                            <label className="text-[10px] font-black uppercase text-gray-400 mb-1 block ml-1">Nome do Produto</label>
                            <input id={`name-${p.id}`} defaultValue={p.name} className="w-full p-2.5 rounded-lg border border-gray-200 font-bold bg-white text-gray-900 text-xs outline-none focus:ring-2 focus:ring-blue-400" />
                          </div>

                          <div className="w-32">
                            <label className="text-[10px] font-black uppercase text-gray-400 mb-1 block ml-1">Preço (R$)</label>
                            <input id={`price-${p.id}`} type="number" step="0.01" defaultValue={p.totalPrice} className="w-full p-2.5 rounded-lg border border-gray-200 text-xs font-bold text-green-700 outline-none focus:ring-2 focus:ring-blue-400" />
                          </div>
                          
                          <div className="flex flex-wrap gap-4">
                            <div className="w-28">
                              <label className="text-[10px] font-black uppercase text-gray-400 mb-1 block ml-1">ASIN</label>
                              <input id={`asin-${p.id}`} defaultValue={String(attrs.asin || '')} className="w-full p-2.5 rounded-lg border border-gray-200 text-xs font-medium focus:border-blue-400 outline-none shadow-sm" />
                            </div>
                            <div className="w-28">
                              <label className="text-[10px] font-black uppercase text-gray-400 mb-1 block ml-1">Marca</label>
                              <input id={`marca-${p.id}`} defaultValue={String(attrs.marca || attrs.brand || '')} className="w-full p-2.5 rounded-lg border border-gray-200 text-xs font-medium focus:border-blue-400 outline-none shadow-sm" />
                            </div>
                            
                            {displayConfig.map(conf => (
                              <div key={conf.key} className="w-28">
                                <label className="text-[10px] font-black uppercase text-gray-400 mb-1 block ml-1 flex items-center gap-1">
                                  {conf.public ? '' : <span title="Oculto para o público" className="text-red-400 text-[12px]">👁️‍🗨️</span>}
                                  {conf.label}
                                </label>
                                <input 
                                  id={`attr-${conf.key}-${p.id}`} 
                                  defaultValue={String(attrs[conf.key] || '')} 
                                  className={`w-full p-2.5 rounded-lg border text-xs font-medium outline-none shadow-sm transition-all ${
                                    conf.public ? 'bg-white border-gray-100 focus:border-blue-400' : 'bg-gray-100 border-gray-200 text-gray-400 italic'
                                  }`} 
                                />
                              </div>
                            ))}
                          </div>
                          
                          <div className="w-32">
                             <button 
                               onClick={() => {
                                 const nameInput = document.getElementById(`name-${p.id}`) as HTMLInputElement;
                                 const priceInput = document.getElementById(`price-${p.id}`) as HTMLInputElement;
                                 const asinInput = document.getElementById(`asin-${p.id}`) as HTMLInputElement;
                                 const marcaInput = document.getElementById(`marca-${p.id}`) as HTMLInputElement;

                                 const oldAttrs = (p.attributes as DynamicAttributes) || {};

                                 const updatedAttributes: DynamicAttributes = { 
                                   ...oldAttrs, 
                                   asin: asinInput.value,
                                   marca: marcaInput.value
                                 };

                                 displayConfig.forEach(c => {
                                   const el = document.getElementById(`attr-${c.key}-${p.id}`) as HTMLInputElement;
                                   if (el) {
                                     // Resolve matemática também na edição completa se houver campo numérico
                                     const val = solveMath(el.value);
                                     updatedAttributes[c.key] = c.type === 'number' ? Number(val) : val;
                                   }
                                 });
                                 
                                 handleInlineSave(p.id, { 
                                   name: nameInput.value, 
                                   totalPrice: Number(priceInput.value), 
                                   attributes: updatedAttributes 
                                 });
                               }}
                               className="bg-black text-white w-full py-2.5 rounded-xl font-black uppercase text-[10px] tracking-widest shadow hover:bg-gray-800 transition-all active:scale-95"
                             >
                               Salvar
                             </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {zoomImage && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[999] flex items-center justify-center p-10 cursor-zoom-out" onClick={() => setZoomImage(null)}>
          <div className="relative w-full h-full max-w-4xl">
            <Image src={zoomImage} alt="Zoom" fill className="object-contain" priority />
          </div>
        </div>
      )}
    </div>
  );
}