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

interface DisplayConfigPayload {
  fields: DisplayConfigField[];
}

interface EditProps {
  params: Promise<{ id: string }>;
}

type LocalAttributes = Record<string, string | number | boolean | undefined>;

function normalizeDisplayConfig(rawConfig: unknown): DisplayConfigField[] {
  if (Array.isArray(rawConfig)) {
    return rawConfig as DisplayConfigField[];
  }

  if (
    rawConfig &&
    typeof rawConfig === 'object' &&
    Array.isArray((rawConfig as DisplayConfigPayload).fields)
  ) {
    return (rawConfig as DisplayConfigPayload).fields;
  }

  return [];
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
    isVisibleOnSite: true,
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
          isVisibleOnSite: (p as { isVisibleOnSite?: boolean }).isVisibleOnSite ?? true,
        });
        setAttributes((p.attributes as unknown as LocalAttributes) || {});
        setDisplayConfig(normalizeDisplayConfig(p.category.displayConfig));
      }
      setLoading(false);
    });
  }, [id]);

  const handleSave = async () => {
    const res = await updateDynamicProduct(id, {
      ...formData,
      attributes: attributes as DynamicAttributes,
    });

    if (res.success) {
      alert('Produto atualizado com sucesso!');
      router.push('/admin/dynamic/produtos');
    } else {
      alert(res.error || 'Erro ao atualizar produto.');
    }
  };

  if (loading)
    return (
      <div className="animate-pulse p-10 text-center font-mono text-gray-400">
        Carregando dados do produto...
      </div>
    );

  return (
    <div className="min-h-screen max-w-5xl bg-white p-8 font-sans text-black">
      <div className="mb-8 flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="text-gray-400 transition-colors hover:text-black"
        >
          ← Voltar
        </button>
        <h1 className="text-3xl font-black uppercase italic tracking-tight text-gray-900">
          Editar Produto
        </h1>
      </div>

      <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
        <div className="space-y-6">
          <div className="rounded-3xl border border-gray-100 bg-gray-50 p-6 shadow-sm">
            <div className="relative mb-6 h-64 w-full overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-inner">
              {formData.imageUrl ? (
                <Image
                  src={formData.imageUrl}
                  alt="Preview"
                  fill
                  className="object-contain p-6 mix-blend-multiply"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm italic text-gray-300">
                  Sem imagem
                </div>
              )}
            </div>

            <label className="ml-1 mb-2 block text-[10px] font-black uppercase text-gray-400">
              Título Amazon
            </label>
            <textarea
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="h-32 w-full rounded-xl border border-gray-200 bg-white p-4 text-sm font-medium outline-none focus:ring-2 focus:ring-yellow-400"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
              <label className="mb-2 block text-[10px] font-black uppercase text-gray-400">
                Preço Total (R$)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.totalPrice}
                onChange={(e) =>
                  setFormData({ ...formData, totalPrice: Number(e.target.value) })
                }
                className="w-full border-0 p-1 text-2xl font-black text-green-700 outline-none focus:ring-0"
              />
            </div>
            <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
              <label className="mb-2 block text-[10px] font-black uppercase text-gray-400">
                URL Imagem
              </label>
              <input
                value={formData.imageUrl}
                onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                className="w-full truncate border-0 p-1 font-mono text-xs text-blue-500 outline-none focus:ring-0"
              />
            </div>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <label className="mb-3 block text-[10px] font-black uppercase text-gray-400">
              Exibição no site
            </label>
            <button
              type="button"
              onClick={() =>
                setFormData((current) => ({
                  ...current,
                  isVisibleOnSite: !current.isVisibleOnSite,
                }))
              }
              className={`inline-flex items-center gap-3 rounded-full px-4 py-2 text-xs font-black uppercase tracking-widest transition ${
                formData.isVisibleOnSite
                  ? 'bg-green-50 text-green-700 ring-1 ring-green-200'
                  : 'bg-red-50 text-red-700 ring-1 ring-red-200'
              }`}
            >
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  formData.isVisibleOnSite ? 'bg-green-500' : 'bg-red-500'
                }`}
              />
              {formData.isVisibleOnSite ? 'Produto visível' : 'Produto oculto'}
            </button>
            <p className="mt-3 text-xs text-gray-500">
              O produto continua no catálogo e no admin, mas some da vitrine pública enquanto estiver oculto.
            </p>
          </div>
        </div>

        <div className="h-fit rounded-[2rem] border border-yellow-100 bg-yellow-50/50 p-8 shadow-sm">
          <div className="mb-8 flex items-center gap-2">
            <span className="rounded-lg bg-yellow-400 px-2.5 py-1 text-[10px] font-black">
              DYNAMIC ATTRS
            </span>
            <h2 className="text-xs font-bold uppercase tracking-widest text-gray-800">
              Regras de cálculo
            </h2>
          </div>

          <div className="space-y-6">
            {displayConfig.map((field) => (
              <div key={field.key}>
                <label className="ml-1 mb-2 flex items-center gap-1 text-xs font-black uppercase text-gray-500">
                  {field.public === false && <span className="text-red-400">👁️‍🗨️</span>}
                  {field.label}
                </label>
                <input
                  type={field.type === 'number' ? 'number' : 'text'}
                  className={`w-full rounded-2xl border-0 p-4 font-medium shadow-md outline-none focus:ring-2 focus:ring-yellow-400 ${
                    field.public === false
                      ? 'bg-gray-100 italic text-gray-500'
                      : 'bg-white text-gray-800'
                  }`}
                  value={
                    attributes[field.key] !== undefined && attributes[field.key] !== null
                      ? String(attributes[field.key])
                      : ''
                  }
                  onChange={(e) =>
                    setAttributes({
                      ...attributes,
                      [field.key]:
                        field.type === 'number'
                          ? e.target.value === ''
                            ? ''
                            : Number(e.target.value)
                          : e.target.value,
                    })
                  }
                  placeholder={`Valor de ${field.label.toLowerCase()}...`}
                />
              </div>
            ))}
          </div>

          <button
            onClick={handleSave}
            className="mt-12 w-full rounded-2xl bg-[#131921] py-5 text-sm font-black uppercase tracking-widest text-white shadow-2xl transition-all hover:bg-black active:scale-[0.97]"
          >
            Sincronizar Alterações
          </button>
        </div>
      </div>
    </div>
  );
}
