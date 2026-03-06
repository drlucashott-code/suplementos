'use client';

import { useState, useEffect, use } from 'react';
// 🚀 CORREÇÃO: Caminho do import ajustado para um nível acima (onde costumam ficar as actions de produtos)
import { getProductById, updateDynamicProduct, type DynamicAttributes } from '../actions';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

// Interface para os campos da categoria
interface DisplayConfigField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'currency';
}

interface EditProps {
  params: Promise<{ id: string }>;
}

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
  
  const [attributes, setAttributes] = useState<DynamicAttributes>({});
  const [displayConfig, setDisplayConfig] = useState<DisplayConfigField[]>([]);

  useEffect(() => {
    // 🚀 CORREÇÃO: Tipagem do parâmetro 'p' definida implicitamente pelo retorno da Action
    getProductById(id).then((p) => {
      if (p) {
        setFormData({
          name: p.name,
          totalPrice: p.totalPrice,
          imageUrl: p.imageUrl || '',
          url: p.url,
        });
        // Sincroniza os atributos e a configuração de exibição da categoria
        // O cast 'unknown' seguido do tipo final resolve o erro de 'any'
        setAttributes((p.attributes as unknown as DynamicAttributes) || {});
        setDisplayConfig((p.category.displayConfig as unknown as DisplayConfigField[]) || []);
      }
      setLoading(false);
    });
  }, [id]);

  const handleSave = async () => {
    const res = await updateDynamicProduct(id, {
      ...formData,
      attributes
    });
    
    if (res.success) {
      alert("Produto atualizado com sucesso!");
      // Redirecionamento para a rota administrativa correta
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
        <h1 className="text-3xl font-black tracking-tight text-gray-900">Editar Produto</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Lado Esquerdo: Dados Gerais */}
        <div className="space-y-6">
          <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100 shadow-sm">
             <div className="relative w-full h-64 mb-6 bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-inner">
                {formData.imageUrl ? (
                  <Image 
                    src={formData.imageUrl} 
                    alt="Preview" 
                    fill 
                    className="object-contain p-6 mix-blend-multiply" 
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-300 italic text-sm">
                    Sem imagem disponível
                  </div>
                )}
             </div>
             
             <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-2 block ml-1">
               Título da Oferta (Amazon)
             </label>
             <textarea 
               value={formData.name} 
               onChange={e => setFormData({...formData, name: e.target.value})}
               className="w-full border border-gray-200 p-4 rounded-xl text-sm h-32 focus:ring-2 focus:ring-yellow-400 outline-none transition-all bg-white shadow-sm"
               placeholder="Nome do produto como aparece no site..."
             />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
              <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-2 block">
                Preço Total (R$)
              </label>
              <input 
                type="number" 
                step="0.01"
                value={formData.totalPrice} 
                onChange={e => setFormData({...formData, totalPrice: Number(e.target.value)})}
                className="w-full border-0 p-1 font-black text-2xl text-green-700 outline-none focus:ring-0"
              />
            </div>
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
               <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-2 block">
                 URL da Imagem
               </label>
               <input 
                value={formData.imageUrl} 
                onChange={e => setFormData({...formData, imageUrl: e.target.value})}
                className="w-full border-0 p-1 text-xs text-blue-500 outline-none focus:ring-0 truncate"
                placeholder="https://..."
              />
            </div>
          </div>
        </div>

        {/* Lado Direito: Atributos da Categoria */}
        <div className="bg-yellow-50/50 p-8 rounded-[2rem] border border-yellow-100 shadow-sm h-fit">
          <div className="flex items-center gap-2 mb-8">
             <span className="bg-yellow-400 text-[10px] font-black px-2.5 py-1 rounded-lg shadow-sm">
               DYNAMIC ATTRS
             </span>
             <h2 className="font-bold text-gray-800 uppercase text-xs tracking-widest">
               Regras de Cálculo
             </h2>
          </div>
          
          <div className="space-y-6">
            {displayConfig.length > 0 ? (
              displayConfig.map((field) => (
                <div key={field.key}>
                  <label className="block text-xs font-black text-gray-500 uppercase mb-2 ml-1 tracking-tight">
                    {field.label}
                  </label>
                  <input 
                    type={field.type === 'number' ? 'number' : 'text'}
                    className="w-full border-0 p-4 rounded-2xl focus:ring-2 focus:ring-yellow-400 outline-none bg-white shadow-md transition-all font-medium text-gray-800"
                    value={attributes[field.key] || ''}
                    onChange={e => setAttributes({
                      ...attributes, 
                      [field.key]: field.type === 'number' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value
                    })}
                    placeholder={`Informe o valor de ${field.label.toLowerCase()}...`}
                  />
                </div>
              ))
            ) : (
              <div className="text-gray-400 text-sm italic py-4">
                Esta categoria não possui campos dinâmicos configurados.
              </div>
            )}
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