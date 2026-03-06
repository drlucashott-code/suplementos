'use client';

import { useState, useEffect, use } from 'react';
import { getProductById, updateHomeProduct, type DynamicAttributes } from '../actions';
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
    getProductById(id).then((p) => {
      if (p) {
        setFormData({
          name: p.name,
          totalPrice: p.totalPrice,
          imageUrl: p.imageUrl || '',
          url: p.url,
        });
        setAttributes(p.attributes as unknown as DynamicAttributes);
        setDisplayConfig(p.category.displayConfig as unknown as DisplayConfigField[]);
      }
      setLoading(false);
    });
  }, [id]);

  const handleSave = async () => {
    const res = await updateHomeProduct(id, {
      ...formData,
      attributes
    });
    if (res.success) {
      alert("Produto atualizado com sucesso!");
      router.push('/admin/casa/produtos');
    }
  };

  if (loading) return <div className="p-10 text-center font-mono animate-pulse text-gray-400">Carregando dados do produto...</div>;

  return (
    <div className="p-8 max-w-5xl mx-auto text-black bg-white min-h-screen">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-black">← Voltar</button>
        <h1 className="text-2xl font-bold">Editar Produto</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Lado Esquerdo: Dados Gerais */}
        <div className="space-y-6">
          <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
             <div className="relative w-full h-52 mb-6 bg-white border rounded-xl overflow-hidden shadow-sm">
                {formData.imageUrl ? (
                  <Image src={formData.imageUrl} alt="Preview" fill className="object-contain p-4" />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-300">Sem imagem</div>
                )}
             </div>
             
             <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-2 block">Título da Oferta</label>
             <textarea 
               value={formData.name} 
               onChange={e => setFormData({...formData, name: e.target.value})}
               className="w-full border border-gray-200 p-3 rounded-lg text-sm h-28 focus:ring-2 focus:ring-yellow-400 outline-none transition-all"
             />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-2 block">Preço Total (R$)</label>
              <input 
                type="number" 
                value={formData.totalPrice} 
                onChange={e => setFormData({...formData, totalPrice: Number(e.target.value)})}
                className="w-full border border-gray-200 p-3 rounded-lg font-bold text-green-700 focus:ring-2 focus:ring-yellow-400 outline-none"
              />
            </div>
            <div>
               <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-2 block">URL da Imagem</label>
               <input 
                value={formData.imageUrl} 
                onChange={e => setFormData({...formData, imageUrl: e.target.value})}
                className="w-full border border-gray-200 p-3 rounded-lg text-xs focus:ring-2 focus:ring-yellow-400 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Lado Direito: Atributos da Categoria */}
        <div className="bg-yellow-50/50 p-8 rounded-3xl border border-yellow-100 shadow-sm h-fit">
          <div className="flex items-center gap-2 mb-6">
             <span className="bg-yellow-400 text-[10px] font-black px-2 py-0.5 rounded">DYNAMIC</span>
             <h2 className="font-bold text-gray-800 uppercase text-xs tracking-widest">Atributos de Cálculo</h2>
          </div>
          
          <div className="space-y-5">
            {displayConfig.map((field) => (
              <div key={field.key}>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">
                  {field.label}
                </label>
                <input 
                  type={field.type === 'number' ? 'number' : 'text'}
                  className="w-full border border-yellow-200 p-3 rounded-xl focus:ring-2 focus:ring-yellow-500 outline-none bg-white shadow-sm transition-all"
                  value={attributes[field.key] || ''}
                  onChange={e => setAttributes({
                    ...attributes, 
                    [field.key]: field.type === 'number' ? Number(e.target.value) : e.target.value
                  })}
                  placeholder={`Valor para ${field.label.toLowerCase()}...`}
                />
              </div>
            ))}
          </div>

          <button 
            onClick={handleSave}
            className="w-full mt-10 bg-[#131921] text-white py-4 rounded-xl font-bold hover:bg-black transition-all shadow-xl active:scale-[0.98]"
          >
            Salvar Alterações
          </button>
        </div>
      </div>
    </div>
  );
}