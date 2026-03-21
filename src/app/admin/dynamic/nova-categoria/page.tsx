"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  createDynamicCategory,
  updateDynamicCategory,
  getDynamicCategoryById,
  type CategorySettings,
  type ConfigField,
  type DisplayConfigPayload,
  type FieldType,
  type FieldVisibility,
  type SortOptionValue,
} from "./actions";

type CustomSortConfig = {
  value: string;
  label: string;
  attributeKey: string;
  direction: "asc" | "desc";
};

const SORT_OPTIONS: Array<{ value: SortOptionValue; label: string }> = [
  { value: "best_value", label: "Melhor custo-beneficio" },
  { value: "price_asc", label: "Menor preco final" },
  { value: "discount", label: "Maior desconto" },
];

interface DynamicCategoryResponse {
  id: string;
  name: string;
  slug: string;
  group: string | null;
  groupName?: string | null;
  imageUrl?: string | null;
  displayConfig: unknown;
}

function normalizeDisplayConfig(rawConfig: unknown): DisplayConfigPayload {
  if (Array.isArray(rawConfig)) {
    return {
      fields: rawConfig as ConfigField[],
      settings: {},
    };
  }

  if (
    rawConfig &&
    typeof rawConfig === "object" &&
    Array.isArray((rawConfig as DisplayConfigPayload).fields)
  ) {
    return rawConfig as DisplayConfigPayload;
  }

  return {
    fields: [],
    settings: {},
  };
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
  const [analysisTitleTemplate, setAnalysisTitleTemplate] = useState("");
  const [bestValueAttributeKey, setBestValueAttributeKey] = useState("");
  const [dosePriceAttributeKey, setDosePriceAttributeKey] = useState("");
  const [customSorts, setCustomSorts] = useState<CustomSortConfig[]>([]);
  const [enabledSorts, setEnabledSorts] = useState<SortOptionValue[]>([
    "best_value",
    "price_asc",
    "discount",
  ]);
  const [defaultSort, setDefaultSort] = useState<SortOptionValue>("best_value");
  const [displayConfig, setDisplayConfig] = useState<ConfigField[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(Boolean(editId));

  useEffect(() => {
    if (!editId) return;

    const currentEditId = editId;

    async function loadData() {
      const catRaw = await getDynamicCategoryById(currentEditId);

      if (!catRaw) {
        alert("Categoria nao encontrada.");
        router.push("/admin/dynamic/categorias");
        return;
      }

      const cat = catRaw as unknown as DynamicCategoryResponse;
      const normalized = normalizeDisplayConfig(cat.displayConfig);
      const settings = normalized.settings ?? {};
      const nextEnabledSorts: SortOptionValue[] =
        settings.enabledSorts && settings.enabledSorts.length > 0
          ? [...settings.enabledSorts]
          : ["best_value", "price_asc", "discount"];

      setName(cat.name);
      setSlug(cat.slug);
      setGroup(cat.group || "");
      setGroupName(cat.groupName || cat.group || "");
      setImageUrl(cat.imageUrl || "");
      setAnalysisTitleTemplate(settings.analysisTitleTemplate || "");
      setBestValueAttributeKey(settings.bestValueAttributeKey || "");
      setDosePriceAttributeKey(settings.dosePriceAttributeKey || "");
      setCustomSorts(settings.customSorts || []);
      setEnabledSorts(nextEnabledSorts);
      setDefaultSort(
        (settings.defaultSort as SortOptionValue | undefined) ||
          nextEnabledSorts[0] ||
          "best_value"
      );

      const config = normalized.fields.map((field) => ({
        ...field,
        visibility:
          field.visibility ??
          ((field as { public?: boolean }).public === false
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
    const nextConfig = [...displayConfig];
    nextConfig[index] = { ...nextConfig[index], ...field };
    setDisplayConfig(nextConfig);
  };

  const removeField = (index: number) => {
    setDisplayConfig(displayConfig.filter((_, currentIndex) => currentIndex !== index));
  };

  const addCustomSort = () => {
    setCustomSorts((current) => [
      ...current,
      {
        value: "",
        label: "",
        attributeKey: "",
        direction: "asc",
      },
    ]);
  };

  const updateCustomSort = (index: number, field: Partial<CustomSortConfig>) => {
    const next = [...customSorts];
    next[index] = { ...next[index], ...field };
    setCustomSorts(next);
  };

  const removeCustomSort = (index: number) => {
    setCustomSorts(customSorts.filter((_, currentIndex) => currentIndex !== index));
  };

  const toggleSortOption = (value: SortOptionValue) => {
    setEnabledSorts((current) => {
      const next = current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value];

      if (!next.includes(defaultSort)) {
        setDefaultSort(next[0] || "best_value");
      }

      return next;
    });
  };

  const handleSave = async () => {
    if (!name || !slug || !group || !groupName) {
      alert("Preencha todos os campos da estrutura.");
      return;
    }

    if (displayConfig.length === 0) {
      alert("Adicione pelo menos um campo de exibicao.");
      return;
    }

    if (enabledSorts.length === 0) {
      alert("Selecione pelo menos uma opcao de ordenacao.");
      return;
    }

    setLoading(true);

    const cleanGroup = group.trim().toLowerCase().replace(/\s+/g, "-");
    const cleanSlug = slug.trim().toLowerCase().replace(/\s+/g, "-");

    const settings: CategorySettings = {
      analysisTitleTemplate: analysisTitleTemplate.trim() || undefined,
      bestValueAttributeKey: bestValueAttributeKey.trim() || undefined,
      dosePriceAttributeKey: dosePriceAttributeKey.trim() || undefined,
      enabledSorts,
      defaultSort,
      customSorts: customSorts
        .map((item) => ({
          value: item.value.trim(),
          label: item.label.trim(),
          attributeKey: item.attributeKey.trim(),
          direction: item.direction,
        }))
        .filter((item) => item.value && item.label && item.attributeKey),
    };

    const payload = {
      name,
      slug: cleanSlug,
      group: cleanGroup,
      groupName: groupName.trim(),
      imageUrl: imageUrl.trim(),
      displayConfig: {
        fields: displayConfig,
        settings,
      },
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
    <div className="mx-auto min-h-screen max-w-6xl bg-white p-8 font-sans text-black">
      <div className="mb-8 flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="text-gray-400 transition hover:text-black"
        >
          {"<-"} Voltar
        </button>
        <h1 className="text-3xl font-black uppercase italic tracking-tight text-gray-900">
          Configurar Estrutura de Navegacao
        </h1>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 rounded-3xl border border-gray-200 bg-gray-50 p-6 shadow-sm md:grid-cols-5">
        <div>
          <label className="mb-2 ml-1 block text-[10px] font-black uppercase tracking-widest text-gray-400">
            1. Nome do Nicho
          </label>
          <input
            type="text"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="Ex: Higiene Pessoal"
            className="w-full rounded-xl border border-gray-200 bg-white p-3 font-bold outline-none focus:ring-2 focus:ring-yellow-400"
          />
        </div>

        <div>
          <label className="mb-2 ml-1 block text-[10px] font-black uppercase tracking-widest text-blue-500 text-gray-400">
            2. Pasta do Nicho (URL)
          </label>
          <input
            value={group}
            onChange={(e) => setGroup(e.target.value)}
            placeholder="Ex: higiene"
            className="w-full rounded-xl border border-gray-200 bg-blue-50/30 p-3 font-mono text-xs font-bold outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>

        <div>
          <label className="mb-2 ml-1 block text-[10px] font-black uppercase tracking-widest text-gray-400">
            3. Nome da Categoria
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Pasta de dente"
            className="w-full rounded-xl border border-gray-200 bg-white p-3 font-bold outline-none focus:ring-2 focus:ring-yellow-400"
          />
        </div>

        <div>
          <label className="mb-2 ml-1 block text-[10px] font-black uppercase tracking-widest text-blue-500 text-gray-400">
            4. Pasta Categoria (URL)
          </label>
          <input
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="Ex: pasta-de-dente"
            className="w-full rounded-xl border border-gray-200 bg-blue-50/30 p-3 font-mono text-xs font-bold outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>

        <div>
          <label className="mb-2 ml-1 block text-[10px] font-black uppercase tracking-widest text-gray-400">
            5. Imagem da Home
          </label>
          <input
            type="text"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://..."
            className="w-full rounded-xl border border-gray-200 bg-white p-3 font-mono text-xs font-bold outline-none focus:ring-2 focus:ring-yellow-400"
          />
        </div>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-6 rounded-3xl border border-gray-200 bg-gray-50 p-6 shadow-sm md:grid-cols-2">
        <div>
          <label className="mb-2 ml-1 block text-[10px] font-black uppercase tracking-widest text-gray-400">
            Titulo da Analise
          </label>
          <input
            type="text"
            value={analysisTitleTemplate}
            onChange={(e) => setAnalysisTitleTemplate(e.target.value)}
            placeholder="Ex: ANALISE POR DOSE ({doseInGrams}G)"
            className="w-full rounded-xl border border-gray-200 bg-white p-3 font-mono text-xs font-bold outline-none focus:ring-2 focus:ring-yellow-400"
          />
          <p className="mt-2 text-[11px] text-gray-500">
            Voce pode usar placeholders como `{"{doseInGrams}"}` ou `{"{unitsPerPack}"}`.
          </p>
        </div>

        <div>
          <label className="mb-2 ml-1 block text-[10px] font-black uppercase tracking-widest text-gray-400">
            Ordenacao Padrao
          </label>
          <select
            value={defaultSort}
            onChange={(e) => setDefaultSort(e.target.value as SortOptionValue)}
            className="w-full rounded-xl border border-gray-200 bg-white p-3 font-bold outline-none focus:ring-2 focus:ring-yellow-400"
          >
            {enabledSorts.map((sortValue) => {
              const option = SORT_OPTIONS.find((item) => item.value === sortValue);
              if (!option) return null;
              return (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              );
            })}
          </select>

          <div className="mt-4 flex flex-wrap gap-2">
            {SORT_OPTIONS.map((option) => {
              const active = enabledSorts.includes(option.value);
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => toggleSortOption(option.value)}
                  className={`rounded-full border px-3 py-2 text-[12px] font-bold transition ${
                    active
                      ? "border-[#007185] bg-[#EDFDFF] text-[#007185]"
                      : "border-gray-300 bg-white text-gray-700"
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mb-8 rounded-3xl border border-gray-200 bg-gray-50 p-6 shadow-sm">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Ordenacoes customizadas</h2>
            <p className="mt-1 text-[12px] text-gray-500">
              Use para casos como "Mais proteina por unidade" ou outras metricas proprias.
            </p>
          </div>
          <button
            type="button"
            onClick={addCustomSort}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-black text-white shadow-md transition hover:bg-blue-700"
          >
            + Nova ordenacao
          </button>
        </div>

        <div className="space-y-4">
          {customSorts.map((sortItem, index) => (
            <div
              key={index}
              className="grid grid-cols-1 gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm md:grid-cols-[1fr_1.2fr_1.2fr_180px_auto]"
            >
              <div>
                <label className="mb-1 block text-[10px] font-black uppercase text-gray-400">
                  Valor da URL
                </label>
                <input
                  type="text"
                  value={sortItem.value}
                  onChange={(e) => updateCustomSort(index, { value: e.target.value })}
                  placeholder="Ex: protein_gram"
                  className="w-full rounded-lg border border-gray-100 bg-gray-50 p-2.5 font-mono text-xs outline-none focus:bg-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-[10px] font-black uppercase text-gray-400">
                  Rotulo
                </label>
                <input
                  type="text"
                  value={sortItem.label}
                  onChange={(e) => updateCustomSort(index, { label: e.target.value })}
                  placeholder="Ex: Mais proteina por unidade"
                  className="w-full rounded-lg border border-gray-100 bg-gray-50 p-2.5 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-[10px] font-black uppercase text-gray-400">
                  Chave do atributo
                </label>
                <input
                  type="text"
                  value={sortItem.attributeKey}
                  onChange={(e) =>
                    updateCustomSort(index, { attributeKey: e.target.value })
                  }
                  placeholder="Ex: proteinPerUnitInGrams"
                  className="w-full rounded-lg border border-gray-100 bg-gray-50 p-2.5 font-mono text-xs outline-none focus:bg-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-[10px] font-black uppercase text-gray-400">
                  Direcao
                </label>
                <select
                  value={sortItem.direction}
                  onChange={(e) =>
                    updateCustomSort(index, {
                      direction: e.target.value as "asc" | "desc",
                    })
                  }
                  className="w-full rounded-lg border border-gray-100 bg-gray-50 p-2.5 outline-none focus:bg-white"
                >
                  <option value="asc">Menor para maior</option>
                  <option value="desc">Maior para menor</option>
                </select>
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => removeCustomSort(index)}
                  className="p-2 text-[10px] font-black uppercase text-red-400 transition-colors hover:text-red-600"
                >
                  Excluir
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-6 rounded-3xl border border-gray-200 bg-gray-50 p-6 shadow-sm md:grid-cols-2">
        <div>
          <label className="mb-2 ml-1 block text-[10px] font-black uppercase tracking-widest text-gray-400">
            Chave do Custo-beneficio
          </label>
          <input
            type="text"
            value={bestValueAttributeKey}
            onChange={(e) => setBestValueAttributeKey(e.target.value)}
            placeholder="Ex: precoPor100MgCafeina"
            className="w-full rounded-xl border border-gray-200 bg-white p-3 font-mono text-xs font-bold outline-none focus:ring-2 focus:ring-yellow-400"
          />
        </div>

        <div>
          <label className="mb-2 ml-1 block text-[10px] font-black uppercase tracking-widest text-gray-400">
            Chave do Preco da Dose
          </label>
          <input
            type="text"
            value={dosePriceAttributeKey}
            onChange={(e) => setDosePriceAttributeKey(e.target.value)}
            placeholder="Ex: precoPorDose"
            className="w-full rounded-xl border border-gray-200 bg-white p-3 font-mono text-xs font-bold outline-none focus:ring-2 focus:ring-yellow-400"
          />
        </div>
      </div>

      <div className="mb-8">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-800">
            Campos do Card (Display Config)
          </h2>
          <button
            onClick={addField}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-black text-white shadow-md transition hover:bg-blue-700"
          >
            + Novo Atributo
          </button>
        </div>

        <div className="space-y-4">
          {displayConfig.map((field, index) => (
            <div
              key={index}
              className="relative flex flex-wrap items-end gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:border-gray-300 md:flex-nowrap"
            >
              <div className="min-w-[150px] flex-1">
                <label className="mb-1 block text-[10px] font-black uppercase text-gray-400">
                  Rotulo (Publico)
                </label>
                <input
                  type="text"
                  value={field.label}
                  onChange={(e) => updateField(index, { label: e.target.value })}
                  className="w-full rounded-lg border border-gray-100 bg-gray-50 p-2.5 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="min-w-[150px] flex-1">
                <label className="mb-1 block text-[10px] font-black uppercase text-gray-400">
                  Chave Interna
                </label>
                <input
                  type="text"
                  value={field.key}
                  onChange={(e) => updateField(index, { key: e.target.value })}
                  className="w-full rounded-lg border border-gray-100 bg-gray-50 p-2.5 font-mono text-xs outline-none focus:bg-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="w-32">
                <label className="mb-1 block text-[10px] font-black uppercase text-gray-400">
                  Formato
                </label>
                <select
                  value={field.type}
                  onChange={(e) =>
                    updateField(index, { type: e.target.value as FieldType })
                  }
                  className="w-full rounded-lg border border-gray-100 bg-gray-50 p-2.5 outline-none focus:bg-white"
                >
                  <option value="text">Texto</option>
                  <option value="number">Numero</option>
                  <option value="currency">Moeda</option>
                </select>
              </div>

              <div className="min-w-[190px]">
                <label className="mb-1 block text-[10px] font-black uppercase text-gray-400">
                  Visibilidade
                </label>
                <select
                  value={field.visibility}
                  onChange={(e) =>
                    updateField(index, {
                      visibility: e.target.value as FieldVisibility,
                    })
                  }
                  className="w-full rounded-lg border border-gray-100 bg-gray-50 p-2.5 outline-none focus:bg-white"
                >
                  <option value="public_table">Publico na tabela</option>
                  <option value="public_highlight">Publico fora da tabela</option>
                  <option value="internal">Apenas interno</option>
                </select>
              </div>

              <button
                onClick={() => removeField(index)}
                className="p-2 text-[10px] font-black uppercase text-red-400 transition-colors hover:text-red-600"
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
        className="w-full rounded-2xl bg-black px-6 py-4 font-black text-white shadow-xl transition-all hover:bg-gray-800 active:scale-[0.98] disabled:opacity-50"
      >
        {loading
          ? "Sincronizando..."
          : editId
            ? "Salvar Alteracoes"
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
