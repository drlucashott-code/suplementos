'use client';

import { use, useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { getProductById, updateDynamicProduct, type DynamicAttributes } from '../actions';
import {
  getDynamicVisibilityLabel,
  normalizeDynamicVisibilityStatus,
  type DynamicVisibilityStatus,
} from '@/lib/dynamicVisibility';

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
    visibilityStatus: 'visible' as DynamicVisibilityStatus,
  });

  const [attributes, setAttributes] = useState<LocalAttributes>({});
  const [displayConfig, setDisplayConfig] = useState<DisplayConfigField[]>([]);

  useEffect(() => {
    getProductById(id).then((product) => {
      if (product) {
        setFormData({
          name: product.name,
          totalPrice: product.totalPrice,
          imageUrl: product.imageUrl || '',
          url: product.url,
          visibilityStatus: normalizeDynamicVisibilityStatus(
            (product as { visibilityStatus?: string | null }).visibilityStatus,
            (product as { isVisibleOnSite?: boolean }).isVisibleOnSite
          ),
        });
        setAttributes((product.attributes as unknown as LocalAttributes) || {});
        setDisplayConfig(normalizeDisplayConfig(product.category.displayConfig));
      }
      setLoading(false);
    });
  }, [id]);

  const handleSave = async () => {
    const result = await updateDynamicProduct(id, {
      ...formData,
      attributes: attributes as DynamicAttributes,
    });

    if (result.success) {
      alert('Produto atualizado com sucesso!');
      router.push('/admin/dynamic/produtos');
      return;
    }

    alert(result.error || 'Erro ao atualizar produto.');
  };

  if (loading) {
    return (
      <div className="animate-pulse p-10 text-center font-mono text-gray-400">
        Carregando dados do produto...
      </div>
    );
  }

  return (
    <div className="min-h-screen max-w-5xl bg-white p-8 font-sans text-black">
      <div className="mb-8 flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="text-gray-400 transition-colors hover:text-black"
        >
          {'<-'} Voltar
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

            <label className="mb-2 ml-1 block text-[10px] font-black uppercase text-gray-400">
              Titulo Amazon
            </label>
            <textarea
              value={formData.name}
              onChange={(event) =>
                setFormData((current) => ({ ...current, name: event.target.value }))
              }
              className="h-32 w-full rounded-xl border border-gray-200 bg-white p-4 text-sm font-medium outline-none focus:ring-2 focus:ring-yellow-400"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
              <label className="mb-2 block text-[10px] font-black uppercase text-gray-400">
                Preco Total (R$)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.totalPrice}
                onChange={(event) =>
                  setFormData((current) => ({
                    ...current,
                    totalPrice: Number(event.target.value),
                  }))
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
                onChange={(event) =>
                  setFormData((current) => ({
                    ...current,
                    imageUrl: event.target.value,
                  }))
                }
                className="w-full truncate border-0 p-1 font-mono text-xs text-blue-500 outline-none focus:ring-0"
              />
            </div>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <label className="mb-3 block text-[10px] font-black uppercase text-gray-400">
              Exibicao no site
            </label>
            <select
              value={formData.visibilityStatus}
              onChange={(event) =>
                setFormData((current) => ({
                  ...current,
                  visibilityStatus: event.target.value as DynamicVisibilityStatus,
                }))
              }
              className="rounded-full border border-gray-200 bg-white px-4 py-2 text-xs font-black uppercase tracking-widest text-gray-700 outline-none transition hover:border-gray-300"
            >
              <option value="visible">Visivel</option>
              <option value="pending">Pendente</option>
              <option value="hidden">Oculto</option>
            </select>
            <p className="mt-3 text-xs text-gray-500">
              Status atual: {getDynamicVisibilityLabel(formData.visibilityStatus)}. So
              produtos visiveis aparecem na vitrine publica; pendentes aguardam revisao.
            </p>
          </div>
        </div>

        <div className="h-fit rounded-[2rem] border border-yellow-100 bg-yellow-50/50 p-8 shadow-sm">
          <div className="mb-8 flex items-center gap-2">
            <span className="rounded-lg bg-yellow-400 px-2.5 py-1 text-[10px] font-black">
              DYNAMIC ATTRS
            </span>
            <h2 className="text-xs font-bold uppercase tracking-widest text-gray-800">
              Regras de calculo
            </h2>
          </div>

          <div className="space-y-6">
            {displayConfig.map((field) => (
              <div key={field.key}>
                <label className="mb-2 ml-1 flex items-center gap-1 text-xs font-black uppercase text-gray-500">
                  {field.public === false ? (
                    <span className="text-red-400">Interno</span>
                  ) : null}
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
                  onChange={(event) =>
                    setAttributes((current) => ({
                      ...current,
                      [field.key]:
                        field.type === 'number'
                          ? event.target.value === ''
                            ? ''
                            : Number(event.target.value)
                          : event.target.value,
                    }))
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
            Sincronizar Alteracoes
          </button>
        </div>
      </div>
    </div>
  );
}
