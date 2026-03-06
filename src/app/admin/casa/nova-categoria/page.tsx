'use client';

import { useState } from 'react';
import { createHomeCategory } from './actions';

// Tipo da configuração para o TypeScript não reclamar
type ConfigField = {
  key: string;
  label: string;
  type: 'text' | 'number' | 'currency';
};

export default function NovaCategoriaCasa() {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [displayConfig, setDisplayConfig] = useState<ConfigField[]>([]);
  const [loading, setLoading] = useState(false);

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
    const result = await createHomeCategory({ name, slug, displayConfig });
    setLoading(false);

    if (result?.error) {
      alert(result.error);
    } else if (result?.success) {
      alert("Categoria criada com sucesso!");
      // Limpa o formulário após salvar
      setName('');
      setSlug('');
      setDisplayConfig([]);
    }
  };

  return (
    <div className="p-8 max-w-3xl mx-auto bg-white min-h-screen text-black">
      <h1 className="text-3xl font-bold mb-8">Nova Categoria de Casa</h1>
      
      {/* Informações Básicas */}
      <div className="grid grid-cols-2 gap-6 mb-8 bg-gray-50 p-6 rounded-lg border">
        <div>
          <label className="block text-sm font-bold mb-2">Nome da Categoria</label>
          <input 
            type="text" 
            value={name} 
            onChange={(e) => setName(e.target.value)} 
            placeholder="Ex: Sabão de Lavar Roupa"
            className="w-full border p-3 rounded"
          />
        </div>
        <div>
          <label className="block text-sm font-bold mb-2">Slug (URL)</label>
          <input 
            type="text" 
            value={slug} 
            onChange={(e) => setSlug(e.target.value)} 
            placeholder="Ex: sabao-de-lavar-roupa"
            className="w-full border p-3 rounded"
          />
        </div>
      </div>

      {/* Configuração Dinâmica dos Cards */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Campos do Card (O que exibir)</h2>
          <button 
            onClick={addField}
            className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 transition font-bold"
          >
            + Adicionar Campo
          </button>
        </div>
        
        {displayConfig.length === 0 && (
          <div className="text-gray-500 text-sm p-4 bg-gray-50 border border-dashed rounded text-center">
            Nenhum campo adicionado. Clique no botão acima para adicionar.
          </div>
        )}

        {displayConfig.map((field, index) => (
          <div key={index} className="flex gap-4 mb-4 items-end bg-gray-50 p-4 rounded border relative group">
            <div className="flex-1">
              <label className="block text-xs font-bold text-gray-700 mb-1">Rótulo na tela (Ex: Rende)</label>
              <input 
                type="text" 
                value={field.label} 
                onChange={(e) => updateField(index, { label: e.target.value })}
                placeholder="Ex: Lavagens"
                className="w-full border p-2 rounded"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-bold text-gray-700 mb-1">Chave no Banco (Ex: washes)</label>
              <input 
                type="text" 
                value={field.key} 
                onChange={(e) => updateField(index, { key: e.target.value })}
                placeholder="Sem espaços ou acentos"
                className="w-full border p-2 rounded"
              />
            </div>
            <div className="w-40">
              <label className="block text-xs font-bold text-gray-700 mb-1">Formato</label>
              <select 
                value={field.type} 
                onChange={(e) => updateField(index, { type: e.target.value as 'text' | 'number' | 'currency' })}
                className="w-full border p-2 rounded bg-white"
              >
                <option value="text">Texto livre</option>
                <option value="number">Número</option>
                <option value="currency">Moeda (R$)</option>
              </select>
            </div>
            <button 
              onClick={() => removeField(index)}
              className="text-red-500 hover:text-red-700 font-bold px-2 pb-2"
              title="Remover campo"
            >
              X
            </button>
          </div>
        ))}
      </div>

      {/* Botão Salvar */}
      <button 
        onClick={handleSave}
        disabled={loading}
        className="bg-green-600 text-white font-bold px-6 py-4 rounded hover:bg-green-700 w-full transition disabled:opacity-50"
      >
        {loading ? 'Salvando no banco...' : 'Salvar Categoria'}
      </button>
    </div>
  );
}