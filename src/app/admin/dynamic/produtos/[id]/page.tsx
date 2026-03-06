'use client';

import { useState, useEffect, use } from 'react';
import { getProductById, updateDynamicProduct, type DynamicAttributes } from '../actions';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

interface DisplayConfigField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'currency';
  public?: boolean;
}

interface EditProps {
  params: Promise<{ id: string }>;
}

// 🚀 Tipagem flexível para o estado interno, mas tratada na renderização
type LocalAttributes = Record<string, string | number | boolean | undefined>;

export default function EditProductPage({ params }: EditProps) {
  const { id } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  
  const [formData, setFormData] = useState({
    name: '',
    totalPrice: 0,
    imageUrl: '',
    url: '',
  });
  
  const [attributes, setAttributes] = useState<LocalAttributes>({});
  const [displayConfig, setDisplayConfig] = useState<DisplayConfigField[]>([]);

  useEffect(() => {
    getProductById(id).then((p) => {
      if (p) {
        setFormData({
          name: p.name,
          totalPrice: p.totalPrice,
          imageUrl: p.imageUrl || '',
          url: p.url,
        });
        setAttributes((p.attributes as unknown as LocalAttributes) || {});
        setDisplayConfig((p.category.displayConfig as unknown as DisplayConfigField[]) || []);
      }
      setLoading(false);
    });
  }, [id]);

  const handleSave = async () => {
    const res = await updateDynamicProduct(id, {
      ...formData,
      attributes: attributes as DynamicAttributes
    });
    
    if (res.success) {
      alert("Produto atualizado com sucesso!");
      router.push('/admin/dynamic/produtos');
    } else {
      alert(res.error || "Erro ao atualizar produto.");
    }
  };

  if (loading) return (
    <div className="p-10 text-center font-mono animate-pulse text-gray-400">
      Carregando dados do produto...
    </div>
  );

  return (
    <div className="p-8 max-w-5xl mx-auto text-black bg-white min-h-screen font-sans">
      <div className="flex items-center gap-4 mb-8">
        <button 
          onClick={() => router.back()} 
          className="text-gray-400 hover:text-black transition-colors"
        >
          ← Voltar
        </button>
        <h1 className="text-3xl font-black tracking-tight text-gray-900 uppercase italic">
          Editar Produto
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        <div className="space-y-6">
          <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100 shadow-sm">
             <div className="relative w-full h-64 mb-6 bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-inner">
                {formData.imageUrl ? (
                  <Image src={formData.imageUrl} alt="Preview" fill className="object-contain p-6 mix-blend-multiply" />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-300 italic text-sm">Sem imagem</div>
                )}
             </div>
             
             <label className="text-[10px] font-black uppercase text-gray-400 mb-2 block ml-1">Título Amazon</label>
             <textarea 
                value={formData.name} 
                onChange={e => setFormData({...formData, name: e.target.value})}
                className="w-full border border-gray-200 p-4 rounded-xl text-sm h-32 focus:ring-2 focus:ring-yellow-400 outline-none bg-white font-medium"
             />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
              <label className="text-[10px] font-black uppercase text-gray-400 mb-2 block">Preço Total (R$)</label>
              <input 
                type="number" step="0.01"
                value={formData.totalPrice} 
                onChange={e => setFormData({...formData, totalPrice: Number(e.target.value)})}
                className="w-full border-0 p-1 font-black text-2xl text-green-700 outline-none focus:ring-0"
              />
            </div>
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
               <label className="text-[10px] font-black uppercase text-gray-400 mb-2 block">URL Imagem</label>
               <input 
                value={formData.imageUrl} 
                onChange={e => setFormData({...formData, imageUrl: e.target.value})}
                className="w-full border-0 p-1 text-xs text-blue-500 outline-none focus:ring-0 truncate font-mono"
              />
            </div>
          </div>
        </div>

        <div className="bg-yellow-50/50 p-8 rounded-[2rem] border border-yellow-100 shadow-sm h-fit">
          <div className="flex items-center gap-2 mb-8">
             <span className="bg-yellow-400 text-[10px] font-black px-2.5 py-1 rounded-lg">DYNAMIC ATTRS</span>
             <h2 className="font-bold text-gray-800 uppercase text-xs tracking-widest">Regras de Cálculo</h2>
          </div>
          
          <div className="space-y-6">
            {displayConfig.map((field) => (
              <div key={field.key}>
                <label className="block text-xs font-black text-gray-500 uppercase mb-2 ml-1 flex items-center gap-1">
                  {field.public === false && <span className="text-red-400">👁️‍🗨️</span>}
                  {field.label}
                </label>
                <input 
                  type={field.type === 'number' ? 'number' : 'text'}
                  className={`w-full border-0 p-4 rounded-2xl focus:ring-2 focus:ring-yellow-400 outline-none shadow-md font-medium ${
                    field.public === false ? 'bg-gray-100 text-gray-500 italic' : 'bg-white text-gray-800'
                  }`}
                  // 🚀 SOLUÇÃO DEFINITIVA PARA O ERRO 2322:
                  // Forçamos o valor para string através do String() para o TS não reclamar do booleano
                  value={attributes[field.key] !== undefined && attributes[field.key] !== null ? String(attributes[field.key]) : ''}
                  onChange={e => setAttributes({
                    ...attributes, 
                    [field.key]: field.type === 'number' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value
                  })}
                  placeholder={`Valor de ${field.label.toLowerCase()}...`}
                />
              </div>
            ))}
          </div>

          <button 
            onClick={handleSave}
            className="w-full mt-12 bg-[#131921] text-white py-5 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-black transition-all shadow-2xl active:scale-[0.97]"
          >
            Sincronizar Alterações
          </button>
        </div>
      </div>
    </div>
  );
}