'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createHomeCategory, updateHomeCategory, getHomeCategoryById } from './actions';

// Tipo da configuração para o TypeScript não reclamar
type ConfigField = {
  key: string;
  label: string;
  type: 'text' | 'number' | 'currency';
};

function CategoriaForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('id'); // Pega o ID da URL, se existir

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [displayConfig, setDisplayConfig] = useState<ConfigField[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(!!editId); // Fica carregando se tiver ID

  // EFEITO: Carrega os dados se for modo de edição
  useEffect(() => {
    if (editId) {
      async function loadData() {
        const cat = await getHomeCategoryById(editId!);
        if (cat) {
          setName(cat.name);
          setSlug(cat.slug);
          setDisplayConfig((cat.displayConfig as unknown as ConfigField[]) || []);
        } else {
          alert("Categoria não encontrada.");
          router.push('/admin/casa/categorias');
        }
        setInitialLoading(false);
      }
      loadData();
    }
  }, [editId, router]);

  // Adiciona um novo campo vazio na lista
  const addField = () => {
    setDisplayConfig([
      ...displayConfig, 
      { key: '', label: '', type: 'text' }
    ]);
  };

  // Atualiza um campo específico quando o usuário digita
  const updateField = (index: number, field: Partial<ConfigField>) => {
    const newConfig = [...displayConfig];
    newConfig[index] = { ...newConfig[index], ...field };
    setDisplayConfig(newConfig);
  };

  // Remove um campo
  const removeField = (index: number) => {
    const newConfig = displayConfig.filter((_, i) => i !== index);
    setDisplayConfig(newConfig);
  };

  // Envia os dados para a Server Action
  const handleSave = async () => {
    if (!name || !slug) {
      alert("Por favor, preencha o nome e o slug da categoria.");
      return;
    }
    if (displayConfig.length === 0) {
      alert("Adicione pelo menos um campo de exibição para a tabela.");
      return;
    }

    setLoading(true);
    
    let result;
    if (editId) {
      result = await updateHomeCategory(editId, { name, slug, displayConfig });
    } else {
      result = await createHomeCategory({ name, slug, displayConfig });
    }
    
    setLoading(false);

    if (result?.error) {
      alert(result.error);
    } else if (result?.success) {
      alert(editId ? "Categoria atualizada com sucesso!" : "Categoria criada com sucesso!");
      router.push('/admin/casa/categorias'); // Volta pra lista depois de salvar
    }
  };

  if (initialLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500 font-medium">
        Carregando dados da categoria...
      </div>
    );
  }

  return (
    <div className="p-8 max-w-3xl mx-auto bg-white min-h-screen text-black">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => router.back()} className="text-gray-500 hover:text-black transition">
          ← Voltar
        </button>
        <h1 className="text-3xl font-bold">
          {editId ? 'Editar Categoria' : 'Nova Categoria de Casa'}
        </h1>
      </div>
      
      {/* Informações Básicas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 bg-gray-50 p-6 rounded-lg border">
        <div>
          <label className="block text-sm font-bold mb-2">Nome da Categoria</label>
          <input 
            type="text" 
            value={name} 
            onChange={(e) => setName(e.target.value)} 
            placeholder="Ex: Sabão de Lavar Roupa"
            className="w-full border p-3 rounded bg-white outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-bold mb-2">Slug (URL)</label>
          <input 
            type="text" 
            value={slug} 
            onChange={(e) => setSlug(e.target.value)} 
            placeholder="Ex: sabao-de-lavar-roupa"
            className="w-full border p-3 rounded bg-white outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Configuração Dinâmica dos Cards */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Campos do Card (O que exibir)</h2>
          <button 
            onClick={addField}
            className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 transition font-bold shadow-sm"
          >
            + Adicionar Campo
          </button>
        </div>
        
        {displayConfig.length === 0 && (
          <div className="text-gray-500 text-sm p-6 bg-gray-50 border border-dashed border-gray-300 rounded text-center">
            Nenhum campo adicionado. Clique no botão acima para adicionar as informações que aparecerão no card dos produtos.
          </div>
        )}

        {displayConfig.map((field, index) => (
          <div key={index} className="flex flex-col md:flex-row gap-4 mb-4 items-end bg-gray-50 p-4 rounded border relative group transition-all hover:border-gray-300">
            <div className="flex-1 w-full">
              <label className="block text-xs font-bold text-gray-700 mb-1">Rótulo na tela (Ex: Rende)</label>
              <input 
                type="text" 
                value={field.label} 
                onChange={(e) => updateField(index, { label: e.target.value })}
                placeholder="Ex: Lavagens"
                className="w-full border p-2 rounded bg-white outline-none focus:border-blue-500"
              />
            </div>
            <div className="flex-1 w-full">
              <label className="block text-xs font-bold text-gray-700 mb-1">Chave no Banco (Ex: washes)</label>
              <input 
                type="text" 
                value={field.key} 
                onChange={(e) => updateField(index, { key: e.target.value })}
                placeholder="Sem espaços ou acentos"
                className="w-full border p-2 rounded bg-white outline-none focus:border-blue-500"
              />
            </div>
            <div className="w-full md:w-40">
              <label className="block text-xs font-bold text-gray-700 mb-1">Formato</label>
              {/* 🚀 RESOLVIDO: O 'as any' foi trocado pela tipagem exata dos valores permitidos */}
              <select 
                value={field.type} 
                onChange={(e) => updateField(index, { type: e.target.value as 'text' | 'number' | 'currency' })}
                className="w-full border p-2 rounded bg-white outline-none focus:border-blue-500"
              >
                <option value="text">Texto livre</option>
                <option value="number">Número</option>
                <option value="currency">Moeda (R$)</option>
              </select>
            </div>
            <button 
              onClick={() => removeField(index)}
              className="text-red-500 hover:text-white hover:bg-red-500 font-bold w-full md:w-auto px-4 py-2 rounded transition border border-red-500 md:border-transparent"
              title="Remover campo"
            >
              Remover
            </button>
          </div>
        ))}
      </div>

      {/* Botão Salvar */}
      <button 
        onClick={handleSave}
        disabled={loading}
        className="bg-green-600 text-white font-bold px-6 py-4 rounded hover:bg-green-700 w-full transition shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Salvando no banco...' : (editId ? 'Atualizar Categoria' : 'Salvar Categoria')}
      </button>
    </div>
  );
}

// O Next.js exige um Suspense boundary quando usamos useSearchParams no App Router
export default function NovaCategoriaCasa() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500">Carregando formulário...</div>}>
      <CategoriaForm />
    </Suspense>
  );
}