'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createDynamicCategory, updateDynamicCategory, getDynamicCategoryById } from './actions';

// Tipo da configuração para o TypeScript
type ConfigField = {
  key: string;
  label: string;
  type: 'text' | 'number' | 'currency';
};

function CategoriaForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('id');

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [group, setGroup] = useState('casa'); // 🚀 Estado do Nicho/Grupo
  const [displayConfig, setDisplayConfig] = useState<ConfigField[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(!!editId);

  // Carrega dados para edição
  useEffect(() => {
    if (editId) {
      async function loadData() {
        const cat = await getDynamicCategoryById(editId!);
        if (cat) {
          setName(cat.name);
          setSlug(cat.slug);
          setGroup(cat.group || 'casa'); // 🚀 Carrega o grupo existente no banco
          setDisplayConfig((cat.displayConfig as unknown as ConfigField[]) || []);
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
    setDisplayConfig([...displayConfig, { key: '', label: '', type: 'text' }]);
  };

  const updateField = (index: number, field: Partial<ConfigField>) => {
    const newConfig = [...displayConfig];
    newConfig[index] = { ...newConfig[index], ...field };
    setDisplayConfig(newConfig);
  };

  const removeField = (index: number) => {
    const newConfig = displayConfig.filter((_, i) => i !== index);
    setDisplayConfig(newConfig);
  };

  const handleSave = async () => {
    if (!name || !slug || !group) {
      alert("Por favor, preencha todos os campos obrigatórios.");
      return;
    }
    if (displayConfig.length === 0) {
      alert("Adicione pelo menos um campo de exibição.");
      return;
    }

    setLoading(true);
    
    // Payload inclui o 'group' para o findFirst da action
    const payload = { name, slug, group, displayConfig };
    
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
      alert(editId ? "Categoria atualizada com sucesso!" : "Categoria criada com sucesso!");
      router.push('/admin/dynamic/categorias');
    }
  };

  if (initialLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500 font-medium font-sans">
        Carregando dados da categoria...
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto bg-white min-h-screen text-black font-sans">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-black transition">
          ← Voltar
        </button>
        <h1 className="text-3xl font-black tracking-tight text-gray-900">
          {editId ? 'Editar Categoria' : 'Nova Categoria Dinâmica'}
        </h1>
      </div>
      
      {/* Informações Básicas e Seleção de Grupo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 bg-gray-50 p-6 rounded-2xl border border-gray-200 shadow-sm">
        <div>
          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Nicho (Grupo)</label>
          <select 
            value={group} 
            onChange={(e) => setGroup(e.target.value)}
            className="w-full border border-gray-200 p-3 rounded-xl bg-white outline-none focus:ring-2 focus:ring-yellow-400 font-bold transition-all"
          >
            <option value="casa">Casa & Limpeza</option>
            <option value="petshop">Petshop</option>
            <option value="bebe">Bebês</option>
            <option value="suplementos">Suplementos</option>
            {/* Adicione novos grupos aqui conforme necessário */}
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Nome da Categoria</label>
          <input 
            type="text" 
            value={name} 
            onChange={(e) => setName(e.target.value)} 
            placeholder="Ex: Ração para Cães"
            className="w-full border border-gray-200 p-3 rounded-xl bg-white outline-none focus:ring-2 focus:ring-yellow-400 font-medium transition-all"
          />
        </div>
        <div>
          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Slug (URL)</label>
          <input 
            type="text" 
            value={slug} 
            onChange={(e) => setSlug(e.target.value)} 
            placeholder="Ex: racao-caes"
            className="w-full border border-gray-200 p-3 rounded-xl bg-white outline-none focus:ring-2 focus:ring-yellow-400 font-medium transition-all"
          />
        </div>
      </div>

      {/* Configuração Dinâmica dos Cards */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800">Atributos do Card</h2>
          <button 
            onClick={addField}
            className="bg-black text-white px-4 py-2 rounded-lg text-sm hover:bg-gray-800 transition font-bold shadow-sm"
          >
            + Adicionar Atributo
          </button>
        </div>
        
        {displayConfig.length === 0 && (
          <div className="text-gray-400 text-sm p-10 bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl text-center">
            Nenhum atributo definido. Clique acima para começar.
          </div>
        )}

        {displayConfig.map((field, index) => (
          <div key={index} className="flex flex-col md:flex-row gap-4 mb-4 items-end bg-white p-5 rounded-2xl border border-gray-200 relative group transition-all hover:border-gray-300 shadow-sm">
            <div className="flex-1 w-full">
              <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Rótulo (Ex: Peso)</label>
              <input 
                type="text" 
                value={field.label} 
                onChange={(e) => updateField(index, { label: e.target.value })}
                placeholder="Ex: Peso Líquido"
                className="w-full border border-gray-100 p-2.5 rounded-lg bg-gray-50 outline-none focus:bg-white focus:ring-1 focus:ring-blue-500 transition-all"
              />
            </div>
            <div className="flex-1 w-full">
              <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Chave (Ex: weight)</label>
              <input 
                type="text" 
                value={field.key} 
                onChange={(e) => updateField(index, { key: e.target.value })}
                placeholder="sem-espacos"
                className="w-full border border-gray-100 p-2.5 rounded-lg bg-gray-50 outline-none focus:bg-white focus:ring-1 focus:ring-blue-500 transition-all font-mono"
              />
            </div>
            <div className="w-full md:w-40">
              <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Formato</label>
              <select 
                value={field.type} 
                onChange={(e) => updateField(index, { type: e.target.value as 'text' | 'number' | 'currency' })}
                className="w-full border border-gray-100 p-2.5 rounded-lg bg-gray-50 outline-none focus:bg-white focus:ring-1 focus:ring-blue-500 transition-all"
              >
                <option value="text">Texto</option>
                <option value="number">Número</option>
                <option value="currency">Moeda (R$)</option>
              </select>
            </div>
            <button 
              onClick={() => removeField(index)}
              className="text-red-400 hover:text-red-600 font-bold p-2.5 rounded-lg transition-all"
            >
              Excluir
            </button>
          </div>
        ))}
      </div>

      <button 
        onClick={handleSave}
        disabled={loading}
        className="bg-black text-white font-black px-6 py-4 rounded-2xl hover:bg-gray-800 w-full transition-all shadow-xl disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.99]"
      >
        {loading ? 'Sincronizando...' : (editId ? 'Atualizar Categoria' : 'Finalizar e Criar Categoria')}
      </button>
    </div>
  );
}

export default function NovaCategoriaDynamic() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500">Carregando interface...</div>}>
      <CategoriaForm />
    </Suspense>
  );
}