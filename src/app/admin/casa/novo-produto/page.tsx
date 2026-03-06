'use client';

import { useState, useEffect } from 'react';
import { getHomeCategories, createHomeProduct, fetchAmazonProductData, type AmazonImportResult } from './actions';

interface Category {
  id: string;
  name: string;
  displayConfig: { key: string; label: string; type: string }[];
}

export default function NovoProdutoCasa() {
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
    }
  };

  const handleSave = async () => {
    if (!selectedCat) return alert("Selecione a categoria");
    const res = await createHomeProduct({
      ...formData,
      totalPrice: parseFloat(formData.totalPrice) || 0,
      categoryId: selectedCat.id,
      attributes: dynamicAttrs
    });
    if (res.success) {
      alert("Produto Salvo!");
      window.location.reload();
    }
  };

  return (
    <div className="p-8 max-w-2xl mx-auto text-black bg-white min-h-screen">
      <h1 className="text-2xl font-bold mb-6">Novo Produto via ASIN</h1>
      
      <div className="flex gap-2 mb-8 bg-blue-50 p-4 rounded border border-blue-200">
        <input 
          placeholder="ASIN Amazon" 
          className="flex-1 border p-2 rounded"
          value={asin}
          onChange={e => setAsin(e.target.value)}
        />
        <button 
          onClick={handleImport}
          className="bg-blue-600 text-white px-4 py-2 rounded font-bold"
          disabled={loadingImport}
        >
          {loadingImport ? 'Buscando...' : 'Importar'}
        </button>
      </div>

      <div className="space-y-4">
        <select 
          onChange={(e) => setSelectedCat(categories.find(c => c.id === e.target.value) || null)} 
          className="w-full border p-2 rounded bg-white"
        >
          <option value="">Selecione a Categoria...</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>

        <input value={formData.name} placeholder="Nome" className="w-full border p-2 rounded" onChange={e => setFormData({...formData, name: e.target.value})} />
        <input value={formData.totalPrice} placeholder="Preço" type="number" className="w-full border p-2 rounded" onChange={e => setFormData({...formData, totalPrice: e.target.value})} />

        {selectedCat && (
          <div className="bg-yellow-50 p-4 rounded border border-yellow-200">
            <h3 className="font-bold mb-2 text-sm">Dados específicos de {selectedCat.name}</h3>
            {selectedCat.displayConfig.map((field) => (
              <div key={field.key} className="mb-2">
                <label className="text-xs font-bold text-gray-600">{field.label}</label>
                <input 
                  type={field.type === 'number' ? 'number' : 'text'}
                  className="w-full border p-2 rounded bg-white"
                  onChange={e => setDynamicAttrs({...dynamicAttrs, [field.key]: e.target.value})}
                />
              </div>
            ))}
          </div>
        )}

        <button onClick={handleSave} className="w-full bg-green-600 text-white p-3 font-bold rounded hover:bg-green-700 transition">
          Salvar Produto
        </button>
      </div>
    </div>
  );
}