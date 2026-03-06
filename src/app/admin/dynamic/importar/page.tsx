'use client';

import { useState, useEffect } from 'react';
// 🚀 CORREÇÃO: Importando das Actions genéricas
import { getHomeCategories } from '../nova-categoria/actions';
import { importDynamicViaAPI } from './actions';

// 1. Interface definida para eliminar o 'any'
interface Category {
  id: string;
  name: string;
}

export default function ImportadorDynamicAPI() {
  const [asins, setAsins] = useState('');
  const [categories, setCategories] = useState<Category[]>([]); 
  const [selectedCat, setSelectedCat] = useState('');
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    // 2. Cast seguro do retorno da Action genérica
    getHomeCategories().then((data) => setCategories(data as unknown as Category[]));
  }, []);

  const handleImport = async () => {
    if (!asins || !selectedCat) return alert("Selecione a categoria e cole os ASINs");
    
    setLoading(true);
    setLogs(["🚀 Conectando com Amazon PA-API..."]);
    
    // 🚀 CORREÇÃO: Usando a nova action 'importDynamicViaAPI'
    const res = await importDynamicViaAPI(asins, selectedCat);
    
    setLogs(res.logs);
    setLoading(false);
    setAsins('');
  };

  return (
    <div className="p-8 max-w-5xl mx-auto text-black bg-white min-h-screen font-sans">
      <div className="flex items-center justify-between mb-8 border-b pb-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Importador de Catálogo</h1>
          <p className="text-gray-500 text-sm">Puxe produtos de qualquer nicho com preço real e link de afiliado.</p>
        </div>
        <span className="bg-green-100 text-green-700 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest border border-green-200">
          Official PA-API v5
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Painel de Entrada */}
        <div className="md:col-span-2 space-y-6">
          <div>
            <label className="block text-xs font-black text-gray-400 uppercase tracking-tighter mb-2">1. Categoria Destino</label>
            <select 
              className="w-full border border-gray-200 p-3.5 rounded-xl bg-gray-50 focus:ring-2 focus:ring-yellow-400 outline-none transition-all font-semibold"
              onChange={e => setSelectedCat(e.target.value)}
              value={selectedCat}
            >
              <option value="">Selecione a categoria dinâmica...</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-black text-gray-400 uppercase tracking-tighter mb-2">2. Lista de ASINs (Amazon IDs)</label>
            <textarea 
              className="w-full border border-gray-200 p-4 h-72 rounded-xl font-mono text-sm shadow-inner focus:ring-2 focus:ring-yellow-400 outline-none transition-all resize-none text-black"
              placeholder="Ex: B0CFYRC6M7, B07XYZ..."
              value={asins}
              onChange={e => setAsins(e.target.value)}
            />
          </div>

          <button 
            onClick={handleImport}
            disabled={loading}
            className="w-full bg-[#FFD814] text-black py-4 rounded-xl font-black hover:bg-[#F7CA00] disabled:opacity-50 transition-all shadow-lg active:scale-[0.98] flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="h-4 w-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                Processando Lote...
              </>
            ) : `Importar ${asins.split(/[\s,]+/).filter(Boolean).length} Produtos`}
          </button>
        </div>

        {/* Console de Logs */}
        <div className="bg-[#131921] rounded-2xl p-6 h-[620px] overflow-auto shadow-2xl border border-gray-800">
          <div className="flex items-center justify-between mb-6 border-b border-gray-700 pb-3">
            <h2 className="text-white font-bold text-xs uppercase tracking-widest flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]"></span>
              Console de Saída
            </h2>
          </div>
          <div className="space-y-3 font-mono text-[10px]">
            {logs.map((log, i) => (
              <div key={i} className={`flex gap-3 leading-relaxed ${log.includes('✅') ? 'text-green-400' : (log.includes('❌') || log.includes('🚫')) ? 'text-red-400' : 'text-yellow-400'}`}>
                <span className="text-gray-600 shrink-0">[{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}]</span>
                <span className="break-all">{log}</span>
              </div>
            ))}
            {logs.length === 0 && <div className="text-gray-600 italic">Aguardando comando do sistema...</div>}
          </div>
        </div>
      </div>
    </div>
  );
}