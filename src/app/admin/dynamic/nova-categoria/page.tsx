"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { GripVertical, X } from "lucide-react";
import {
  buildPrimaryMetricFields,
  createPrimaryMetricDraft,
  createPrimaryMetricDraftFromSettings,
  getPrimaryMetricManagedKeys,
  getPrimaryMetricPresetOptions,
  normalizeDynamicDisplayConfig,
} from "@/lib/dynamicCategoryMetrics";
import {
  createDynamicCategory,
  updateDynamicCategory,
  getDynamicCategoryById,
  type CategorySettings,
  type ConfigField,
  type DisplayConfigPayload,
  type FieldType,
  type FieldVisibility,
  type PrimaryMetricPresetId,
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

type PreviewFieldItem = {
  key: string;
  label: string;
  value: string;
  type: FieldType;
};

function normalizeDisplayConfig(rawConfig: unknown): DisplayConfigPayload {
  return normalizeDynamicDisplayConfig(rawConfig) as DisplayConfigPayload;
}

function normalizePreviewToken(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function formatPreviewCurrency(value: number) {
  return `R$ ${value.toFixed(2).replace(".", ",")}`;
}

function formatPreviewNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(".", ",");
}

function resolvePreviewTemplate(
  template: string,
  attributes: Record<string, string | number>
) {
  return template.replace(/\{([^}]+)\}/g, (_, key: string) => {
    const value = attributes[key];
    return value === undefined || value === null ? "" : String(value);
  });
}

function getPreviewPricing(preset: PrimaryMetricPresetId) {
  switch (preset) {
    case "units":
      return { current: 77.9, previous: 92.76, discountPercent: 13 };
    case "volume_ml":
      return { current: 45.8, previous: 85.08, discountPercent: 46 };
    case "washes":
      return { current: 21.47, previous: 26.45, discountPercent: 19 };
    case "weight_grams":
      return { current: 120.7, previous: 138.46, discountPercent: 13 };
    case "meters":
      return { current: 24.9, previous: 31.9, discountPercent: 22 };
    case "capsules":
      return { current: 64.9, previous: 79.9, discountPercent: 19 };
    case "doses":
      return { current: 89.9, previous: 109.9, discountPercent: 18 };
    default:
      return { current: 79.9, previous: 92.76, discountPercent: 14 };
  }
}

function inferPreviewRawValue(
  field: ConfigField,
  primaryDraft: ReturnType<typeof createPrimaryMetricDraft>,
  currentPrice: number
): string | number | null {
  const token = normalizePreviewToken(`${field.key} ${field.label}`);

  const knownValues: Array<[string[], string | number]> = [
    [["units", "unidades", "unit", "unidade"], 24],
    [["volumeml", "volume"], 200],
    [["weightgrams", "peso", "gramas"], 900],
    [["meters", "metro", "metros", "metragem"], 30],
    [["washes", "lavagem", "lavagens"], 83],
    [["capsules", "capsula", "capsulas"], 120],
    [["doses", "dose"], 30],
    [["proteinperdoseingrams", "proteina"], 20],
    [["proteinpercentage", "proteinconcentration", "conc"], 67],
    [["doseingrams"], 30],
    [["sabor", "flavor"], "Baunilha"],
    [["cor", "color"], "Azul"],
    [["tamanho", "size"], "Grande"],
  ];

  for (const [aliases, value] of knownValues) {
    if (aliases.some((alias) => token.includes(alias))) {
      return value;
    }
  }

  if (field.key === primaryDraft.attributeKey) {
    switch (primaryDraft.preset) {
      case "units":
        return 24;
      case "volume_ml":
        return 200;
      case "weight_grams":
        return 900;
      case "meters":
        return 30;
      case "washes":
        return 83;
      case "capsules":
        return 120;
      case "doses":
        return 30;
      default:
        return field.type === "number" ? 100 : "Exemplo";
    }
  }

  if (field.key === primaryDraft.priceKey) {
    const metricValue: string | number | null = inferPreviewRawValue(
      {
        ...field,
        key: primaryDraft.attributeKey,
        label: primaryDraft.label,
        type: "number",
      },
      primaryDraft,
      currentPrice
    );
    const numericMetric: number = Number(metricValue);
    return numericMetric > 0 ? Number((currentPrice / numericMetric).toFixed(2)) : null;
  }

  if (field.type === "currency") {
    return Number((currentPrice / 10).toFixed(2));
  }

  if (field.type === "number") {
    return 10;
  }

  return "Exemplo";
}

function buildPreviewFieldItems(params: {
  fields: ConfigField[];
  primaryDraft: ReturnType<typeof createPrimaryMetricDraft>;
  currentPrice: number;
}) {
  const attributes: Record<string, string | number> = {};

  for (const field of params.fields) {
    const rawValue = inferPreviewRawValue(field, params.primaryDraft, params.currentPrice);
    if (rawValue !== null && rawValue !== undefined && rawValue !== "") {
      attributes[field.key] = rawValue;
    }
  }

  const items: PreviewFieldItem[] = params.fields.map((field) => {
    const rawValue = attributes[field.key];
    let value = "-";

    if (field.type === "currency" && typeof rawValue === "number") {
      value = formatPreviewCurrency(rawValue);
    } else if (field.type === "number" && typeof rawValue === "number") {
      value = formatPreviewNumber(rawValue);
    } else if (rawValue !== undefined && rawValue !== null && String(rawValue).trim() !== "") {
      value = String(rawValue);
    }

    return {
      key: field.key,
      label: field.label,
      value,
      type: field.type,
    };
  });

  return { items, attributes };
}

function PreviewCard({
  categoryName,
  imageUrl,
  tableFields,
  highlightFields,
  analysisTitleTemplate,
  primaryDraft,
}: {
  categoryName: string;
  imageUrl: string;
  tableFields: ConfigField[];
  highlightFields: ConfigField[];
  analysisTitleTemplate?: string;
  primaryDraft: ReturnType<typeof createPrimaryMetricDraft>;
}) {
  const pricing = getPreviewPricing(primaryDraft.preset);
  const currentPrice = pricing.current;
  const previewTitle = categoryName
    ? `${categoryName} Exemplo Premium`
    : "Produto Exemplo Premium";

  const { items: tableItems, attributes } = buildPreviewFieldItems({
    fields: tableFields,
    primaryDraft,
    currentPrice,
  });

  const { items: highlightItems } = buildPreviewFieldItems({
    fields: highlightFields,
    primaryDraft,
    currentPrice,
  });

  const analysisTitle =
    analysisTitleTemplate?.trim()
      ? resolvePreviewTemplate(analysisTitleTemplate, attributes)
      : "";

  return (
    <div className="relative overflow-hidden rounded-[28px] border border-gray-200 bg-white shadow-sm">
      <div className="flex min-h-[260px] items-stretch gap-3 border-b border-gray-100 bg-white font-sans">
        {pricing.discountPercent > 0 ? (
          <div className="absolute ml-0 mt-4 bg-[#CC0C39] px-2 py-0.5 text-[11px] font-bold text-white">
            {pricing.discountPercent}% OFF
          </div>
        ) : null}

        <div className="relative flex w-[180px] flex-shrink-0 flex-col items-center justify-center bg-[#f3f3f3] p-3">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt="Prévia"
              className="max-h-[190px] max-w-[120px] object-contain mix-blend-multiply"
            />
          ) : (
            <div className="flex h-[200px] w-[120px] items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white text-center text-xs text-gray-400">
              Imagem da categoria
            </div>
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col py-4 pr-4">
          <h2 className="mb-1 line-clamp-3 text-[14px] font-normal leading-tight text-[#0F1111]">
            {previewTitle}
          </h2>

          <div className="mb-2 flex items-center gap-1 text-[12px]">
            <span className="font-normal text-[#0F1111]">4.6</span>
            <span className="text-[#DE7921]">★★★★★</span>
            <span className="text-[#007185]">(242)</span>
          </div>

          {highlightItems.length > 0 ? (
            <div className="mb-2 flex flex-wrap items-center gap-x-1.5 text-[11px] text-zinc-500">
              {highlightItems.map((item, index) => (
                <span key={item.key}>
                  {index > 0 ? <span className="mr-1">•</span> : null}
                  {item.label}: <b className="font-medium text-zinc-700">{item.value}</b>
                </span>
              ))}
            </div>
          ) : null}

          {tableItems.length > 0 ? (
            <div
              className="mb-3 grid gap-2 divide-x divide-zinc-200 rounded border border-zinc-200 bg-white p-2"
              style={{
                gridTemplateColumns: `repeat(${Math.max(tableItems.length, 1)}, minmax(0, 1fr))`,
              }}
            >
              {analysisTitle ? (
                <div
                  className="border-b border-zinc-200 pb-2 text-center text-[11px] font-bold uppercase tracking-wide text-zinc-500"
                  style={{ gridColumn: "1 / -1" }}
                >
                  {analysisTitle}
                </div>
              ) : null}

              {tableItems.map((item) => (
                <div key={item.key} className="flex flex-col overflow-hidden px-1 text-center">
                  <span
                    className={`mb-1 truncate text-[12px] font-semibold leading-none ${
                      item.type === "currency" ? "text-green-700" : "text-[#0F1111]"
                    }`}
                  >
                    {item.value}
                  </span>
                  <span
                    className={`truncate text-[9px] font-bold uppercase tracking-wide ${
                      item.type === "currency" ? "text-green-600" : "text-zinc-400"
                    }`}
                  >
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          ) : null}

          <div className="mt-auto flex flex-col">
            <div className="mb-1.5 flex flex-col items-start gap-0.5">
              <span className="inline-flex items-center border border-[#CC0C39] bg-[#CC0C39] px-2.5 py-1 text-[11px] font-semibold leading-none text-white">
                Menor preço em 30 dias
              </span>
            </div>

            <div className="flex items-start">
              <div className="flex items-start">
                <span className="mt-1 text-[13px] font-medium text-[#CC0C39]">R$</span>
                <span className="text-3xl font-medium leading-none tracking-tight text-[#CC0C39]">
                  {currentPrice.toFixed(2).split(".")[0]}
                </span>
                <span className="mt-[3px] text-[14px] font-medium leading-none text-[#CC0C39]">
                  {currentPrice.toFixed(2).split(".")[1]}
                </span>
              </div>
            </div>

            <div className="relative mt-0.5 flex items-center gap-1 text-[11px] text-zinc-500">
              <span className="font-medium">De:</span>
              <span className="line-through">
                {formatPreviewCurrency(pricing.previous)}
              </span>
            </div>

            <div className="mt-1 flex items-center">
              <span className="flex items-center text-[12px] font-black italic leading-none">
                <span className="mr-0.5 text-[13px] not-italic text-[#FEBD69]">✓</span>
                <span className="text-[#00A8E1]">prime</span>
              </span>
            </div>

            <div className="mt-2">
              <div className="block w-full rounded-full border border-[#FCD200] bg-[#FFD814] py-2.5 text-center text-[13px] font-medium text-[#0F1111] shadow-sm">
                Ver na Amazon
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
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
  const [primaryMetricPreset, setPrimaryMetricPreset] = useState<PrimaryMetricPresetId>("");
  const [primaryMetricLabel, setPrimaryMetricLabel] = useState("");
  const [primaryMetricUnitLabel, setPrimaryMetricUnitLabel] = useState("");
  const [primaryMetricAttributeKey, setPrimaryMetricAttributeKey] = useState("");
  const [primaryMetricPriceKey, setPrimaryMetricPriceKey] = useState("");
  const [primaryMetricPriceLabel, setPrimaryMetricPriceLabel] = useState("");
  const [analysisTitleTemplate, setAnalysisTitleTemplate] = useState("");
  const [bestValueAttributeKey, setBestValueAttributeKey] = useState("");
  const [dosePriceAttributeKey, setDosePriceAttributeKey] = useState("");
  const [hideFromHome, setHideFromHome] = useState(false);
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
  const [previewOpen, setPreviewOpen] = useState(false);
  const [draggingFieldIndex, setDraggingFieldIndex] = useState<number | null>(null);
  const [dragOverFieldIndex, setDragOverFieldIndex] = useState<number | null>(null);

  const primaryMetricDraft = useMemo(
    () =>
      createPrimaryMetricDraft(primaryMetricPreset, {
        label: primaryMetricLabel,
        unitLabel: primaryMetricUnitLabel,
        attributeKey: primaryMetricAttributeKey,
        priceKey: primaryMetricPriceKey,
        priceLabel: primaryMetricPriceLabel,
      }),
    [
      primaryMetricPreset,
      primaryMetricLabel,
      primaryMetricUnitLabel,
      primaryMetricAttributeKey,
      primaryMetricPriceKey,
      primaryMetricPriceLabel,
    ]
  );

  const generatedPrimaryFields = useMemo(
    () => buildPrimaryMetricFields(primaryMetricDraft),
    [primaryMetricDraft]
  );
  const managedPrimaryKeys = useMemo(
    () => new Set(getPrimaryMetricManagedKeys(primaryMetricDraft)),
    [primaryMetricDraft]
  );
  const previewDisplayFields = useMemo<ConfigField[]>(
    () => [
      ...generatedPrimaryFields.map((field) => ({
        ...field,
        visibility: field.visibility ?? "public_table",
      })),
      ...displayConfig.filter((field) => !managedPrimaryKeys.has(field.key)),
    ],
    [displayConfig, generatedPrimaryFields, managedPrimaryKeys]
  );
  const previewTableFields = useMemo(
    () =>
      previewDisplayFields.filter(
        (field) => (field.visibility ?? "public_table") === "public_table"
      ),
    [previewDisplayFields]
  );
  const previewHighlightFields = useMemo(
    () =>
      previewDisplayFields.filter(
        (field) => (field.visibility ?? "public_table") === "public_highlight"
      ),
    [previewDisplayFields]
  );
  const previewAnalysisTitle = useMemo(
    () => analysisTitleTemplate.trim(),
    [analysisTitleTemplate]
  );

  const availablePrimaryPresets = getPrimaryMetricPresetOptions();

  const applyPrimaryMetricPreset = (presetId: PrimaryMetricPresetId) => {
    const nextDraft = createPrimaryMetricDraft(presetId);
    setPrimaryMetricPreset(nextDraft.preset);
    setPrimaryMetricLabel(nextDraft.label);
    setPrimaryMetricUnitLabel(nextDraft.unitLabel);
    setPrimaryMetricAttributeKey(nextDraft.attributeKey);
    setPrimaryMetricPriceKey(nextDraft.priceKey);
    setPrimaryMetricPriceLabel(nextDraft.priceLabel);

    if (presetId) {
      setBestValueAttributeKey(nextDraft.priceKey);
      setDosePriceAttributeKey(
        presetId === "doses" ? nextDraft.priceKey : ""
      );
    }
  };

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
      const primaryDraftFromSettings = createPrimaryMetricDraftFromSettings(settings);
      const primaryManagedKeys = new Set(
        getPrimaryMetricManagedKeys(primaryDraftFromSettings)
      );
      const nextEnabledSorts: SortOptionValue[] =
        settings.enabledSorts && settings.enabledSorts.length > 0
          ? [...settings.enabledSorts]
          : ["best_value", "price_asc", "discount"];

      setName(cat.name);
      setSlug(cat.slug);
      setGroup(cat.group || "");
      setGroupName(cat.groupName || cat.group || "");
      setImageUrl(cat.imageUrl || "");
      setHideFromHome(Boolean(settings.hideFromHome));
      setPrimaryMetricPreset(primaryDraftFromSettings.preset);
      setPrimaryMetricLabel(primaryDraftFromSettings.label);
      setPrimaryMetricUnitLabel(primaryDraftFromSettings.unitLabel);
      setPrimaryMetricAttributeKey(primaryDraftFromSettings.attributeKey);
      setPrimaryMetricPriceKey(primaryDraftFromSettings.priceKey);
      setPrimaryMetricPriceLabel(primaryDraftFromSettings.priceLabel);
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

      const config = normalized.fields
        .filter((field) => !primaryManagedKeys.has(field.key))
        .map((field) => ({
          ...field,
          visibility:
            field.visibility ??
            ((field as { public?: boolean }).public === false
              ? "internal"
              : "public_table"),
          filterable:
            typeof field.filterable === "boolean"
              ? field.filterable
              : field.type !== "currency" &&
                (field.visibility ?? "public_table") !== "internal",
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
        filterable: true,
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

  const moveField = (fromIndex: number, toIndex: number) => {
    setDisplayConfig((current) => {
      if (fromIndex === toIndex) return current;
      const next = [...current];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
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

    if (
      primaryMetricPreset &&
      (!primaryMetricLabel.trim() ||
        !primaryMetricPriceLabel.trim() ||
        !primaryMetricAttributeKey.trim() ||
        !primaryMetricPriceKey.trim() ||
        generatedPrimaryFields.length === 0)
    ) {
      alert("Complete a configuracao da metrica principal antes de salvar.");
      return;
    }

    if (displayConfig.length === 0 && generatedPrimaryFields.length === 0) {
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
    const finalDisplayFields: ConfigField[] = previewDisplayFields;

    const settings: CategorySettings = {
      analysisTitleTemplate: analysisTitleTemplate.trim() || undefined,
      bestValueAttributeKey:
        bestValueAttributeKey.trim() ||
        primaryMetricDraft.priceKey.trim() ||
        undefined,
      dosePriceAttributeKey:
        dosePriceAttributeKey.trim() ||
        (primaryMetricPreset === "doses"
          ? primaryMetricDraft.priceKey.trim() || undefined
          : undefined),
      primaryMetricPreset: primaryMetricPreset || undefined,
      primaryMetricLabel: primaryMetricLabel.trim() || undefined,
      primaryMetricUnitLabel: primaryMetricUnitLabel.trim() || undefined,
      primaryMetricAttributeKey:
        primaryMetricAttributeKey.trim() || undefined,
      primaryMetricPriceKey: primaryMetricPriceKey.trim() || undefined,
      primaryMetricPriceLabel: primaryMetricPriceLabel.trim() || undefined,
      enabledSorts,
      defaultSort,
      hideFromHome,
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
        fields: finalDisplayFields,
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

      <div className="mb-8 grid grid-cols-1 gap-4 rounded-3xl border border-gray-200 bg-gray-50 p-6 shadow-sm md:grid-cols-6">
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

        <div className="flex items-end">
          <label className="flex w-full items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-xs font-semibold text-gray-700">
            <input
              type="checkbox"
              checked={!hideFromHome}
              onChange={(e) => setHideFromHome(!e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-yellow-500 focus:ring-yellow-400"
            />
            Mostrar na home
          </label>
        </div>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-6 rounded-3xl border border-gray-200 bg-gray-50 p-6 shadow-sm md:grid-cols-2">
        <div className="md:col-span-2">
          <div className="mb-4">
            <h2 className="text-xl font-bold text-gray-800">
              Metrica principal de custo-beneficio
            </h2>
            <p className="mt-1 text-[12px] text-gray-500">
              Escolha a unidade principal da categoria. O sistema cria
              automaticamente o campo base e o preco por unidade, e tenta
              preencher isso sozinho no import.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-6">
            <div className="md:col-span-2">
              <label className="mb-2 ml-1 block text-[10px] font-black uppercase tracking-widest text-gray-400">
                Tipo da metrica
              </label>
              <select
                value={primaryMetricPreset}
                onChange={(e) =>
                  applyPrimaryMetricPreset(e.target.value as PrimaryMetricPresetId)
                }
                className="w-full rounded-xl border border-gray-200 bg-white p-3 font-bold outline-none focus:ring-2 focus:ring-yellow-400"
              >
                <option value="">Sem metrica automatica</option>
                {availablePrimaryPresets.map((preset) => (
                  <option key={preset.value} value={preset.value}>
                    {preset.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 ml-1 block text-[10px] font-black uppercase tracking-widest text-gray-400">
                Rotulo
              </label>
              <input
                type="text"
                value={primaryMetricLabel}
                onChange={(e) => setPrimaryMetricLabel(e.target.value)}
                placeholder="Ex: Volume"
                className="w-full rounded-xl border border-gray-200 bg-white p-3 outline-none focus:ring-2 focus:ring-yellow-400"
              />
            </div>

            <div>
              <label className="mb-2 ml-1 block text-[10px] font-black uppercase tracking-widest text-gray-400">
                Unidade
              </label>
              <input
                type="text"
                value={primaryMetricUnitLabel}
                onChange={(e) => setPrimaryMetricUnitLabel(e.target.value)}
                placeholder="Ex: ml"
                className="w-full rounded-xl border border-gray-200 bg-white p-3 outline-none focus:ring-2 focus:ring-yellow-400"
              />
            </div>

            <div>
              <label className="mb-2 ml-1 block text-[10px] font-black uppercase tracking-widest text-gray-400">
                Chave base
              </label>
              <input
                type="text"
                value={primaryMetricAttributeKey}
                onChange={(e) => setPrimaryMetricAttributeKey(e.target.value)}
                placeholder="Ex: volumeMl"
                className="w-full rounded-xl border border-gray-200 bg-white p-3 font-mono text-xs font-bold outline-none focus:ring-2 focus:ring-yellow-400"
              />
            </div>

            <div>
              <label className="mb-2 ml-1 block text-[10px] font-black uppercase tracking-widest text-gray-400">
                Chave do preco
              </label>
              <input
                type="text"
                value={primaryMetricPriceKey}
                onChange={(e) => setPrimaryMetricPriceKey(e.target.value)}
                placeholder="Ex: precoPorMl"
                className="w-full rounded-xl border border-gray-200 bg-white p-3 font-mono text-xs font-bold outline-none focus:ring-2 focus:ring-yellow-400"
              />
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 ml-1 block text-[10px] font-black uppercase tracking-widest text-gray-400">
                Rotulo do preco derivado
              </label>
              <input
                type="text"
                value={primaryMetricPriceLabel}
                onChange={(e) => setPrimaryMetricPriceLabel(e.target.value)}
                placeholder="Ex: Preco por ml"
                className="w-full rounded-xl border border-gray-200 bg-white p-3 outline-none focus:ring-2 focus:ring-yellow-400"
              />
            </div>

            <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                Campos gerados automaticamente
              </p>
              {generatedPrimaryFields.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {generatedPrimaryFields.map((field) => (
                    <span
                      key={field.key}
                      className="rounded-full border border-[#007185]/20 bg-[#EDFDFF] px-3 py-1 text-[11px] font-bold text-[#007185]"
                    >
                      {field.label} {"->"} {field.key}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-[12px] text-gray-500">
                  Selecione uma metrica principal para gerar os campos base da
                  categoria.
                </p>
              )}
            </div>
          </div>
        </div>

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
            <button
              type="button"
              onClick={addCustomSort}
              className="inline-flex h-[38px] w-[38px] items-center justify-center rounded-full border border-dashed border-blue-300 bg-white text-lg font-black text-blue-600 transition hover:border-blue-400 hover:bg-blue-50"
              title="Adicionar ordenacao customizada"
              aria-label="Adicionar ordenacao customizada"
            >
              +
            </button>
          </div>
        </div>
      </div>

      {customSorts.length > 0 ? (
        <div className="mb-8 rounded-3xl border border-gray-200 bg-gray-50 p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-800">Ordenacoes customizadas</h2>
            <p className="mt-1 text-[12px] text-gray-500">
              Use para casos como "Mais proteina por unidade" ou outras metricas proprias.
            </p>
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
      ) : null}

      <div className="mb-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-800">
              Atributos secundarios e filtros
            </h2>
            <p className="mt-1 text-[12px] text-gray-500">
              Aqui entram campos como sabor, cor e tamanho. Quando a chave ou o
              rotulo for conhecido, o import tambem tenta preencher sozinho.
            </p>
          </div>
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
              className={`relative flex flex-wrap items-end gap-4 rounded-2xl border bg-white p-5 shadow-sm transition-all md:flex-nowrap ${
                dragOverFieldIndex === index
                  ? "border-blue-400 ring-2 ring-blue-100"
                  : "border-gray-200 hover:border-gray-300"
              }`}
              onDragOver={(event) => {
                event.preventDefault();
                if (dragOverFieldIndex !== index) {
                  setDragOverFieldIndex(index);
                }
              }}
              onDrop={() => {
                if (draggingFieldIndex === null || draggingFieldIndex === index) {
                  setDragOverFieldIndex(null);
                  return;
                }
                moveField(draggingFieldIndex, index);
                setDraggingFieldIndex(null);
                setDragOverFieldIndex(null);
              }}
              onDragLeave={() => {
                if (dragOverFieldIndex === index) {
                  setDragOverFieldIndex(null);
                }
              }}
            >
              <div className="flex h-full items-center">
                <button
                  type="button"
                  draggable
                  onDragStart={(event) => {
                    setDraggingFieldIndex(index);
                    event.dataTransfer.effectAllowed = "move";
                    event.dataTransfer.setData("text/plain", String(index));
                  }}
                  onDragEnd={() => {
                    setDraggingFieldIndex(null);
                    setDragOverFieldIndex(null);
                  }}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-gray-50 text-gray-400 transition hover:border-gray-300 hover:text-gray-600"
                  title="Arraste para ordenar"
                  aria-label="Arraste para ordenar"
                >
                  <GripVertical className="h-4 w-4" />
                </button>
              </div>
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

              <div className="min-w-[170px]">
                <label className="mb-1 block text-[10px] font-black uppercase text-gray-400">
                  Filtro
                </label>
                <label className="flex h-[42px] items-center gap-2 rounded-lg border border-gray-100 bg-gray-50 px-3">
                  <input
                    type="checkbox"
                    checked={field.filterable ?? false}
                    onChange={(e) =>
                      updateField(index, { filterable: e.target.checked })
                    }
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <span className="text-[12px] font-medium text-gray-700">
                    Aparece nos filtros
                  </span>
                </label>
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

      <div className="flex flex-col gap-3 md:flex-row">
        <button
          type="button"
          onClick={() => setPreviewOpen(true)}
          disabled={previewDisplayFields.length === 0}
          className="w-full rounded-2xl border border-gray-300 bg-white px-6 py-4 font-black text-gray-800 shadow-sm transition-all hover:border-gray-400 hover:bg-gray-50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 md:w-auto"
        >
          Previa do card
        </button>

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

      {previewOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
          onClick={() => setPreviewOpen(false)}
        >
          <div
            className="w-full max-w-6xl rounded-[2rem] bg-[#f8f8f8] p-5 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-black text-gray-900">Previa da categoria</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Simulacao do card publico com os campos atuais.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setPreviewOpen(false)}
                className="rounded-full border border-gray-200 bg-white p-2 text-gray-500 transition hover:bg-gray-50 hover:text-gray-700"
                aria-label="Fechar previa"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <PreviewCard
              categoryName={name}
              imageUrl={imageUrl}
              tableFields={previewTableFields}
              highlightFields={previewHighlightFields}
              analysisTitleTemplate={previewAnalysisTitle}
              primaryDraft={primaryMetricDraft}
            />
          </div>
        </div>
      ) : null}
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
