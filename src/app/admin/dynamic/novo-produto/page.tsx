'use client';

import { useState, useEffect } from 'react';
import { normalizeDynamicDisplayConfig } from '@/lib/dynamicCategoryMetrics';
import { getHomeCategories, createDynamicProduct, fetchAmazonProductData, type AmazonImportResult } from './actions';

interface Category {
  id: string;
  name: string;
  displayConfig: unknown;
}

export default function NovoProdutoDynamic() {
  const [asin, setAsin] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCat, setSelectedCat] = useState<Category | null>(null);
  const [loadingImport, setLoadingImport] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    totalPrice: '',
    url: '',
    imageUrl: '',
  });
  const [dynamicAttrs, setDynamicAttrs] = useState<Record<string, string>>({});

  useEffect(() => {
    // Busca as categorias usando a action
    getHomeCategories().then((data) => setCategories(data as unknown as Category[]));
  }, []);

  const handleImport = async () => {
    if (!asin) return;
    setLoadingImport(true);
    const data = await fetchAmazonProductData(asin);
    setLoadingImport(false);

    if ('error' in data) {
      alert(data.error);
    } else {
      const result = data as AmazonImportResult;
      setFormData({
        name: result.name,
        totalPrice: result.totalPrice.toString(),
        url: result.url,
        imageUrl: result.imageUrl
      });
      // Importante: garantir que o ASIN usado na busca seja o que vamos salvar
      setAsin(asin); 
    }
  };

  const handleSave = async () => {
    if (!selectedCat) return alert("Selecione a categoria");
    if (!asin) return alert("O ASIN é obrigatório");
    
    // 🚀 CORREÇÃO: Passando o 'asin' no primeiro nível para satisfazer o Prisma/TypeScript
    const res = await createDynamicProduct({
      ...formData,
      asin: asin, // ✅ Adicionado aqui (Raiz)
      totalPrice: parseFloat(formData.totalPrice) || 0,
      categoryId: selectedCat.id,
      attributes: {
        ...dynamicAttrs,
        asin: asin // ✅ Mantido aqui também para os filtros
      }
    });

    if (res.success) {
      alert("Produto Salvo com Sucesso!");
      window.location.reload();
    } else {
      alert(res.error || "Erro ao salvar produto.");
    }
  };

  return (
    <div className="p-8 max-w-2xl mx-auto text-black bg-white min-h-screen font-sans">
      <h1 className="text-3xl font-black mb-8 tracking-tight text-gray-900">Novo Produto via ASIN</h1>
      
      {/* Seção de Busca Amazon */}
      <div className="flex gap-3 mb-8 bg-blue-50 p-6 rounded-2xl border border-blue-100 shadow-sm">
        <div className="flex-1">
          <label className="block text-[10px] font-black text-blue-400 uppercase mb-1 ml-1">Amazon ASIN</label>
          <input 
            placeholder="Ex: B0CFYRC6M7" 
            className="w-full border-0 p-3 rounded-xl bg-white shadow-inner focus:ring-2 focus:ring-blue-400 outline-none transition-all"
            value={asin}
            onChange={e => setAsin(e.target.value.toUpperCase())}
          />
        </div>
        <button 
          onClick={handleImport}
          className="bg-blue-600 text-white px-6 py-3 rounded-xl font-black self-end hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50"
          disabled={loadingImport}
        >
          {loadingImport ? 'Buscando...' : 'Importar'}
        </button>
      </div>

      <div className="space-y-6">
        {/* Seleção de Categoria */}
        <div>
          <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1">1. Categoria do Produto</label>
          <select 
            onChange={(e) => {
              const cat = categories.find(c => c.id === e.target.value) || null;
              setSelectedCat(cat);
              setDynamicAttrs({}); 
            }} 
            className="w-full border border-gray-200 p-3 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-yellow-400 outline-none transition-all font-semibold"
          >
            <option value="">Selecione a Categoria...</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        {/* Dados Básicos */}
        <div className="space-y-4">
          <label className="block text-[10px] font-black text-gray-400 uppercase mb-[-10px] ml-1">2. Informações Gerais</label>
          <input 
            value={formData.name} 
            placeholder="Nome Completo do Produto" 
            className="w-full border border-gray-200 p-3 rounded-xl outline-none focus:ring-2 focus:ring-yellow-400 transition-all" 
            onChange={e => setFormData({...formData, name: e.target.value})} 
          />
          <input 
            value={formData.totalPrice} 
            placeholder="Preço (Ex: 49.90)" 
            type="number" 
            className="w-full border border-gray-200 p-3 rounded-xl outline-none focus:ring-2 focus:ring-yellow-400 transition-all" 
            onChange={e => setFormData({...formData, totalPrice: e.target.value})} 
          />
        </div>

        {/* Campos Dinâmicos (Atributos) */}
        {selectedCat &&
          normalizeDynamicDisplayConfig(selectedCat.displayConfig).fields.length > 0 && (
          <div className="bg-yellow-50 p-6 rounded-2xl border border-yellow-100 shadow-sm">
            <h3 className="font-black mb-4 text-xs uppercase text-yellow-700 tracking-widest">3. Atributos de {selectedCat.name}</h3>
            <div className="grid grid-cols-1 gap-4">
              {normalizeDynamicDisplayConfig(selectedCat.displayConfig).fields.map((field) => (
                <div key={field.key}>
                  <label className="text-[10px] font-black text-yellow-600 uppercase mb-1 ml-1 block">{field.label}</label>
                  <input 
                    type={field.type === 'number' ? 'number' : 'text'}
                    placeholder={`Valor para ${field.label}`}
                    className="w-full border-0 p-3 rounded-xl bg-white shadow-inner focus:ring-2 focus:ring-yellow-400 outline-none transition-all"
                    onChange={e => setDynamicAttrs({...dynamicAttrs, [field.key]: e.target.value})}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Botão de Ação */}
        <button 
          onClick={handleSave} 
          className="w-full bg-black text-white p-4 font-black rounded-2xl hover:bg-gray-800 transition-all shadow-xl active:scale-[0.98] disabled:opacity-50 mt-4"
        >
          Salvar Produto no Catálogo
        </button>
      </div>
    </div>
  );
}
