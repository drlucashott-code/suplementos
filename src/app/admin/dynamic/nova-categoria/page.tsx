'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createDynamicCategory, updateDynamicCategory, getDynamicCategoryById } from './actions';

type FieldType = 'text' | 'number' | 'currency';

type ConfigField = {
  key: string;
  label: string;
  type: FieldType;
  public: boolean;
};

function CategoriaForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('id');

  // 🚀 OS 4 CAMPOS ESSENCIAIS
  const [groupName, setGroupName] = useState(''); // 1. Nome do Nicho (Ex: Higiene Pessoal)
  const [group, setGroup] = useState('');         // 2. Diretório do Nicho (Ex: higiene)
  const [name, setName] = useState('');           // 3. Nome da Categoria (Ex: Pasta de dente)
  const [slug, setSlug] = useState('');           // 4. Diretório da Categoria (Ex: pasta-de-dente)
  
  const [displayConfig, setDisplayConfig] = useState<ConfigField[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(!!editId);

  useEffect(() => {
    if (editId) {
      async function loadData() {
        const cat = await getDynamicCategoryById(editId!);
        if (cat) {
          setName(cat.name);
          setSlug(cat.slug);
          setGroup(cat.group || '');
          
          // 🚀 CORREÇÃO ESLINT: Trocado @ts-ignore por @ts-expect-error conforme solicitado
          // @ts-expect-error - Mapeia groupName caso ainda não exista formalmente no schema do Prisma
          setGroupName(cat.groupName || cat.group || '');
          
          const config = ((cat.displayConfig as unknown as ConfigField[]) || []).map(f => ({
            ...f,
            public: f.public !== undefined ? f.public : true
          }));
          setDisplayConfig(config);
        } else {
          alert("Categoria não encontrada.");
          router.push('/admin/dynamic/categorias');
        }
        setInitialLoading(false);
      }
      loadData();
    }
  }, [editId, router]);

  const addField = () => {
    setDisplayConfig([...displayConfig, { key: '', label: '', type: 'text', public: true }]);
  };

  const updateField = (index: number, field: Partial<ConfigField>) => {
    const newConfig = [...displayConfig];
    newConfig[index] = { ...newConfig[index], ...field } as ConfigField;
    setDisplayConfig(newConfig);
  };

  const removeField = (index: number) => {
    const newConfig = displayConfig.filter((_, i) => i !== index);
    setDisplayConfig(newConfig);
  };

  const handleSave = async () => {
    if (!name || !slug || !group || !groupName) {
      alert("Preencha tudo: Nome do Nicho, Pasta do Nicho, Nome da Categoria e Pasta da Categoria.");
      return;
    }
    if (displayConfig.length === 0) {
      alert("Adicione pelo menos um campo de exibição.");
      return;
    }

    setLoading(true);

    // Normalização de URLs (Diretórios)
    const cleanGroup = group.trim().toLowerCase().replace(/\s+/g, '-');
    const cleanSlug = slug.trim().toLowerCase().replace(/\s+/g, '-');

    const payload = { 
      name, 
      slug: cleanSlug, 
      group: cleanGroup, 
      groupName: groupName.trim(), 
      displayConfig 
    };
    
    let result;
    if (editId) {
      result = await updateDynamicCategory(editId, payload);
    } else {
      result = await createDynamicCategory(payload);
    }
    
    setLoading(false);

    if (result?.error) {
      alert(result.error);
    } else if (result?.success) {
      alert(editId ? "Categoria atualizada!" : "Categoria criada!");
      router.push('/admin/dynamic/categorias');
    }
  };

  if (initialLoading) return <div className="p-20 text-center font-bold">Carregando...</div>;

  return (
    <div className="p-8 max-w-6xl mx-auto bg-white min-h-screen text-black font-sans">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-black transition">← Voltar</button>
        <h1 className="text-3xl font-black tracking-tight text-gray-900 uppercase italic">
          Configurar Estrutura de Navegação
        </h1>
      </div>
      
      {/* 🚀 OS 4 CAMPOS DE ESTRUTURA */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8 bg-gray-50 p-6 rounded-3xl border border-gray-200 shadow-sm">
        <div>
          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">1. Nome do Nicho</label>
          <input 
            type="text" 
            value={groupName} 
            onChange={(e) => setGroupName(e.target.value)} 
            placeholder="Ex: Higiene Pessoal" 
            className="w-full border border-gray-200 p-3 rounded-xl font-bold outline-none focus:ring-2 focus:ring-yellow-400 bg-white shadow-sm"
          />
        </div>

        <div>
          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1 text-blue-500">2. Pasta do Nicho (URL)</label>
          <input 
            value={group}
            onChange={(e) => setGroup(e.target.value)}
            placeholder="Ex: higiene"
            className="w-full border border-gray-200 p-3 rounded-xl font-mono text-xs font-bold outline-none focus:ring-2 focus:ring-blue-400 bg-blue-50/30"
          />
        </div>
        
        <div>
          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">3. Nome da Categoria</label>
          <input 
            type="text" 
            value={name} 
            onChange={(e) => setName(e.target.value)} 
            placeholder="Ex: Pasta de dente" 
            className="w-full border border-gray-200 p-3 rounded-xl outline-none focus:ring-2 focus:ring-yellow-400 font-bold bg-white shadow-sm" 
          />
        </div>

        <div>
          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1 text-blue-500">4. Pasta Categoria (URL)</label>
          <input 
            type="text" 
            value={slug} 
            onChange={(e) => setSlug(e.target.value)} 
            placeholder="Ex: pasta-de-dente" 
            className="w-full border border-gray-200 p-3 rounded-xl font-mono text-xs font-bold outline-none focus:ring-2 focus:ring-blue-400 bg-blue-50/30" 
          />
        </div>
      </div>

      <div className="mb-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-800">Campos do Card (Display Config)</h2>
          <button onClick={addField} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-black hover:bg-blue-700 transition shadow-md">+ Novo Atributo</button>
        </div>

        <div className="space-y-4">
          {displayConfig.map((field, index) => (
            <div key={index} className="flex flex-wrap md:flex-nowrap gap-4 items-end bg-white p-5 rounded-2xl border border-gray-200 shadow-sm relative transition-all hover:border-gray-300">
              <div className="flex-1 min-w-[150px]">
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Rótulo (Público)</label>
                <input type="text" value={field.label} onChange={(e) => updateField(index, { label: e.target.value })} className="w-full border border-gray-100 p-2.5 rounded-lg bg-gray-50 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="flex-1 min-w-[150px]">
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Chave Interna</label>
                <input type="text" value={field.key} onChange={(e) => updateField(index, { key: e.target.value })} className="w-full border border-gray-100 p-2.5 rounded-lg bg-gray-50 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 font-mono text-xs" />
              </div>
              
              <div className="w-32">
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Formato</label>
                <select 
                  value={field.type} 
                  onChange={(e) => updateField(index, { type: e.target.value as FieldType })} 
                  className="w-full border border-gray-100 p-2.5 rounded-lg bg-gray-50 outline-none focus:bg-white"
                >
                  <option value="text">Texto</option>
                  <option value="number">Número</option>
                  <option value="currency">Moeda</option>
                </select>
              </div>

              <div className="flex flex-col items-center justify-center bg-gray-50 p-2 rounded-xl border border-gray-100 min-w-[110px]">
                <label className="text-[9px] font-black uppercase text-gray-400 mb-1">Exibir no Site?</label>
                <div className="flex items-center gap-2">
                   <span className="text-xs">{field.public ? '👁️' : '🔒'}</span>
                   <input 
                    type="checkbox" 
                    checked={field.public} 
                    onChange={(e) => updateField(index, { public: e.target.checked })}
                    className="w-5 h-5 accent-emerald-500 cursor-pointer"
                  />
                </div>
              </div>

              <button onClick={() => removeField(index)} className="text-red-400 hover:text-red-600 font-black text-[10px] uppercase p-2 transition-colors">Excluir</button>
            </div>
          ))}
        </div>
      </div>

      <button onClick={handleSave} disabled={loading} className="bg-black text-white font-black px-6 py-4 rounded-2xl hover:bg-gray-800 w-full transition-all shadow-xl active:scale-[0.98] disabled:opacity-50">
        {loading ? 'Sincronizando...' : (editId ? 'Salvar Alterações' : 'Finalizar Estrutura')}
      </button>
    </div>
  );
}

export default function NovaCategoriaDynamic() {
  return (
    <Suspense fallback={<div className="p-20 text-center">Carregando interface...</div>}>
      <CategoriaForm />
    </Suspense>
  );
}