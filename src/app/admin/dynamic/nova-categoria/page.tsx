"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  createDynamicCategory,
  updateDynamicCategory,
  getDynamicCategoryById,
} from "./actions";

type FieldType = "text" | "number" | "currency";
type FieldVisibility = "internal" | "public_table" | "public_highlight";

type ConfigField = {
  key: string;
  label: string;
  type: FieldType;
  visibility: FieldVisibility;
};

interface DynamicCategoryResponse {
  id: string;
  name: string;
  slug: string;
  group: string | null;
  groupName?: string | null;
  imageUrl?: string | null;
  displayConfig: unknown;
}

function CategoriaForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("id");

  const [groupName, setGroupName] = useState("");
  const [group, setGroup] = useState("");
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [displayConfig, setDisplayConfig] = useState<ConfigField[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(Boolean(editId));

  useEffect(() => {
    if (!editId) return;

    const currentEditId = editId;

    async function loadData() {
      const catRaw = await getDynamicCategoryById(currentEditId);

      if (!catRaw) {
        alert("Categoria não encontrada.");
        router.push("/admin/dynamic/categorias");
        return;
      }

      const cat = catRaw as unknown as DynamicCategoryResponse;

      setName(cat.name);
      setSlug(cat.slug);
      setGroup(cat.group || "");
      setGroupName(cat.groupName || cat.group || "");
      setImageUrl(cat.imageUrl || "");

      const config = ((cat.displayConfig as ConfigField[]) || []).map((f) => ({
        ...f,
        visibility:
          f.visibility ??
          ((f as { public?: boolean }).public === false
            ? "internal"
            : "public_table"),
      }));

      setDisplayConfig(config);
      setInitialLoading(false);
    }

    loadData();
  }, [editId, router]);

  const addField = () => {
    setDisplayConfig([
      ...displayConfig,
      {
        key: "",
        label: "",
        type: "text",
        visibility: "public_table",
      },
    ]);
  };

  const updateField = (index: number, field: Partial<ConfigField>) => {
    const newConfig = [...displayConfig];
    newConfig[index] = { ...newConfig[index], ...field };
    setDisplayConfig(newConfig);
  };

  const removeField = (index: number) => {
    setDisplayConfig(displayConfig.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!name || !slug || !group || !groupName) {
      alert("Preencha todos os campos da estrutura.");
      return;
    }

    if (displayConfig.length === 0) {
      alert("Adicione pelo menos um campo de exibição.");
      return;
    }

    setLoading(true);

    const cleanGroup = group.trim().toLowerCase().replace(/\s+/g, "-");
    const cleanSlug = slug.trim().toLowerCase().replace(/\s+/g, "-");

    const payload = {
      name,
      slug: cleanSlug,
      group: cleanGroup,
      groupName: groupName.trim(),
      imageUrl: imageUrl.trim(),
      displayConfig,
    };

    const result = editId
      ? await updateDynamicCategory(editId, payload)
      : await createDynamicCategory(payload);

    setLoading(false);

    if (result?.error) {
      alert(result.error);
      return;
    }

    if (result?.success) {
      alert(editId ? "Categoria atualizada!" : "Categoria criada!");
      router.push("/admin/dynamic/categorias");
    }
  };

  if (initialLoading) {
    return <div className="p-20 text-center font-bold">Carregando...</div>;
  }

  return (
    <div className="p-8 max-w-6xl mx-auto bg-white min-h-screen text-black font-sans">
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => router.back()}
          className="text-gray-400 hover:text-black transition"
        >
          ← Voltar
        </button>
        <h1 className="text-3xl font-black tracking-tight text-gray-900 uppercase italic">
          Configurar Estrutura de Navegação
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8 bg-gray-50 p-6 rounded-3xl border border-gray-200 shadow-sm">
        <div>
          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">
            1. Nome do Nicho
          </label>
          <input
            type="text"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="Ex: Higiene Pessoal"
            className="w-full border border-gray-200 p-3 rounded-xl font-bold outline-none focus:ring-2 focus:ring-yellow-400 bg-white"
          />
        </div>

        <div>
          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1 text-blue-500">
            2. Pasta do Nicho (URL)
          </label>
          <input
            value={group}
            onChange={(e) => setGroup(e.target.value)}
            placeholder="Ex: higiene"
            className="w-full border border-gray-200 p-3 rounded-xl font-mono text-xs font-bold outline-none focus:ring-2 focus:ring-blue-400 bg-blue-50/30"
          />
        </div>

        <div>
          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">
            3. Nome da Categoria
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Pasta de dente"
            className="w-full border border-gray-200 p-3 rounded-xl font-bold outline-none focus:ring-2 focus:ring-yellow-400 bg-white"
          />
        </div>

        <div>
          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1 text-blue-500">
            4. Pasta Categoria (URL)
          </label>
          <input
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="Ex: pasta-de-dente"
            className="w-full border border-gray-200 p-3 rounded-xl font-mono text-xs font-bold outline-none focus:ring-2 focus:ring-blue-400 bg-blue-50/30"
          />
        </div>

        <div>
          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">
            5. Imagem da Home
          </label>
          <input
            type="text"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://..."
            className="w-full border border-gray-200 p-3 rounded-xl font-mono text-xs font-bold outline-none focus:ring-2 focus:ring-yellow-400 bg-white"
          />
        </div>
      </div>

      <div className="mb-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-800">
            Campos do Card (Display Config)
          </h2>
          <button
            onClick={addField}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-black hover:bg-blue-700 transition shadow-md"
          >
            + Novo Atributo
          </button>
        </div>

        <div className="space-y-4">
          {displayConfig.map((field, index) => (
            <div
              key={index}
              className="flex flex-wrap md:flex-nowrap gap-4 items-end bg-white p-5 rounded-2xl border border-gray-200 shadow-sm relative transition-all hover:border-gray-300"
            >
              <div className="flex-1 min-w-[150px]">
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">
                  Rótulo (Público)
                </label>
                <input
                  type="text"
                  value={field.label}
                  onChange={(e) => updateField(index, { label: e.target.value })}
                  className="w-full border border-gray-100 p-2.5 rounded-lg bg-gray-50 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex-1 min-w-[150px]">
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">
                  Chave Interna
                </label>
                <input
                  type="text"
                  value={field.key}
                  onChange={(e) => updateField(index, { key: e.target.value })}
                  className="w-full border border-gray-100 p-2.5 rounded-lg bg-gray-50 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 font-mono text-xs"
                />
              </div>

              <div className="w-32">
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">
                  Formato
                </label>
                <select
                  value={field.type}
                  onChange={(e) =>
                    updateField(index, { type: e.target.value as FieldType })
                  }
                  className="w-full border border-gray-100 p-2.5 rounded-lg bg-gray-50 outline-none focus:bg-white"
                >
                  <option value="text">Texto</option>
                  <option value="number">Número</option>
                  <option value="currency">Moeda</option>
                </select>
              </div>

              <div className="min-w-[190px]">
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">
                  Visibilidade
                </label>
                <select
                  value={field.visibility}
                  onChange={(e) =>
                    updateField(index, {
                      visibility: e.target.value as FieldVisibility,
                    })
                  }
                  className="w-full border border-gray-100 p-2.5 rounded-lg bg-gray-50 outline-none focus:bg-white"
                >
                  <option value="public_table">Público na tabela</option>
                  <option value="public_highlight">Público fora da tabela</option>
                  <option value="internal">Apenas interno</option>
                </select>
              </div>

              <button
                onClick={() => removeField(index)}
                className="text-red-400 hover:text-red-600 font-black text-[10px] uppercase p-2 transition-colors"
              >
                Excluir
              </button>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={loading}
        className="bg-black text-white font-black px-6 py-4 rounded-2xl hover:bg-gray-800 w-full transition-all shadow-xl active:scale-[0.98] disabled:opacity-50"
      >
        {loading
          ? "Sincronizando..."
          : editId
            ? "Salvar Alterações"
            : "Finalizar Estrutura"}
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
