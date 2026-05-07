"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ChevronDown, Plus, Search, WandSparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  clearDiscoveryPendingProducts,
  runDiscoveryForCategory,
  saveDiscoveryCategoryConfig,
  syncDiscoveryBrandsFromCatalog,
  updateDiscoveryBrandStatus,
  updateDiscoveryProductStatus,
} from "./actions";
import type { AmazonDiscoverySortBy } from "@/lib/amazonDiscoveryScraper";

type CategoryOption = {
  id: string;
  name: string;
  group: string;
  slug: string;
};

type DiscoveryConfig = {
  mode: string;
  primeOnlyDefault: boolean;
  ignoreInternationalDefault: boolean;
  broadDiscoveryDefault: boolean;
  defaultSortBy: string;
  autoMaxPages: boolean;
  maxPages: number;
  autoMaxItemsPerQuery: boolean;
  maxItemsPerQuery: number;
  searchTerms: string[];
  seedBrands: string[];
} | null;

type DiscoveryRun = {
  id: string;
  createdAt: string;
  updatedAt: string;
  status: string;
  queryCount: number;
  asinCount: number;
  newCount: number;
  existingCount: number;
  pendingCount: number;
  rejectedCount: number;
  approvedCount: number;
  sortBy: string[];
  searchTerms: string[];
  seedBrands: string[];
  exportAsins: string[];
  previewSummary?: {
    progress?: {
      phase: string;
      completedQueries: number;
      totalQueries: number;
      currentQuery: string;
      currentPage: number;
      currentUrl: string;
      currentCards: number;
      currentAsins: number;
      renderer: "http" | "browser";
    };
    queries?: Array<{
      query: string;
      url: string;
      sortBy: string;
      page: number;
      cards: number;
      validAsins: number;
      hits: number;
      renderer: "http" | "browser";
    }>;
    finalCounts?: {
      approved: number;
      rejected: number;
      existing: number;
      pendingReview: number;
    };
    counts?: {
      discovered: number;
      existing: number;
      rejected: number;
      approved: number;
      pendingReview: number;
    };
  } | null;
};

type BrandRow = {
  brandName: string;
  status: string;
  relevanceScore: number;
  timesDetected: number;
  firstSeenAt: string;
  lastSeenAt: string;
};

type ProductRow = {
  asin: string;
  status: string;
  catalogState: string;
  reason: string | null;
  source: string;
  query: string;
  title: string | null;
  brandName: string | null;
  ratingAverage: number | null;
  reviewCount: number | null;
  searchPosition: number | null;
  sponsored: boolean;
  isPrime: boolean;
  isInternational: boolean;
  timesDetected: number;
  relevanceScore: number;
  queriesDetected: string[];
  sources: string[];
  lastSeenAt: string;
};

type DiscoveryWorkbenchProps = {
  categories: CategoryOption[];
  selectedCategoryId: string;
  notice: string;
  config: DiscoveryConfig;
  latestRun: DiscoveryRun | null;
  runHistory: DiscoveryRun[];
  brands: BrandRow[];
  products: ProductRow[];
};

const SORT_OPTIONS: Array<{ value: AmazonDiscoverySortBy; label: string }> = [
  { value: "best_sellers", label: "Mais vendidos" },
  { value: "newest", label: "Lânçamentos mais novos" },
  { value: "top_rated", label: "Méd. avaliações" },
  { value: "featured", label: "Em destaque" },
];

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

function formatDuration(startedAt: string, endedAt: string) {
  const diff = Math.max(0, new Date(endedAt).getTime() - new Date(startedAt).getTime());
  const minutes = Math.floor(diff / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);

  if (minutes <= 0) {
    return `${seconds}s`;
  }

  return `${minutes}m ${seconds.toString().padStart(2, "0")}s`;
}

function parseNewCategoryTags(raw: string) {
  return raw
    .split(/\r?\n|,/g)
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatReviewCount(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "—";
  }

  return new Intl.NumberFormat("pt-BR").format(value);
}

function sortAlphabetically(values: string[]) {
  return values.slice().sort((a, b) => a.localeCompare(b, "pt-BR"));
}

function goSelectClass(active: boolean) {
  return active
    ? "border-gray-900 bg-gray-900 text-white shadow-sm"
    : "border-gray-200 bg-white text-gray-700 hover:border-gray-300";
}

export default function DiscoveryWorkbenchClient({
  categories,
  selectedCategoryId,
  notice,
  config,
  latestRun,
  runHistory,
  brands,
  products,
}: DiscoveryWorkbenchProps) {
  const router = useRouter();
  const selectedCategory = categories.find((category) => category.id === selectedCategoryId) ?? null;
  const [autoMaxPages, setAutoMaxPages] = useState(config?.autoMaxPages ?? true);
  const [autoMaxItemsPerQuery, setAutoMaxItemsPerQuery] = useState(config?.autoMaxItemsPerQuery ?? true);
  const approvedBrands = useMemo(
    () =>
      brands
        .filter((brand) => brand.status === "approved")
        .slice()
        .sort((a, b) => a.brandName.localeCompare(b.brandName, "pt-BR")),
    [brands]
  );
  const pendingBrands = useMemo(
    () => brands.filter((brand) => brand.status === "pending"),
    [brands]
  );
  const rejectedBrands = useMemo(
    () => brands.filter((brand) => brand.status === "rejected"),
    [brands]
  );
  const pendingReviewProducts = useMemo(
    () => products.filter((item) => item.status === "pending_review" || item.status === "pending"),
    [products]
  );
  const existingProducts = useMemo(
    () => products.filter((item) => item.status === "existing"),
    [products]
  );
  const rejectedProducts = useMemo(
    () => products.filter((item) => item.status === "rejected"),
    [products]
  );
  const approvedProducts = useMemo(
    () => products.filter((item) => item.status === "approved"),
    [products]
  );
  const sortedSearchTerms = useMemo(
    () => (config?.searchTerms ?? []).slice().sort((a, b) => a.localeCompare(b, "pt-BR")),
    [config?.searchTerms]
  );
  const sortModes = latestRun?.sortBy?.length ? latestRun.sortBy : [config?.defaultSortBy ?? "featured"];
  const exportAsins =
    latestRun?.exportAsins?.length ? latestRun.exportAsins : approvedProducts.map((item) => item.asin);
  const debugQueries = latestRun?.previewSummary?.queries ?? [];
  const debugCounts = latestRun?.previewSummary?.counts ?? null;
  const debugFinalCounts = latestRun?.previewSummary?.finalCounts ?? null;
  const progress = latestRun?.previewSummary?.progress ?? null;
  const progressTotalQueries = Math.max(1, progress?.totalQueries ?? latestRun?.queryCount ?? 1);
  const progressCompletedQueries = progress?.completedQueries ?? latestRun?.queryCount ?? 0;

  useEffect(() => {
    setAutoMaxPages(config?.autoMaxPages ?? true);
    setAutoMaxItemsPerQuery(config?.autoMaxItemsPerQuery ?? true);
  }, [selectedCategoryId, config?.autoMaxPages, config?.autoMaxItemsPerQuery]);

  useEffect(() => {
    if (latestRun?.status !== "running") return;

    const interval = window.setInterval(() => {
      router.refresh();
    }, 2500);

    return () => window.clearInterval(interval);
  }, [latestRun?.status, router]);

  function goToCategory(categoryId: string) {
    const params = new URLSearchParams();
    if (categoryId) {
      params.set("category", categoryId);
    }
    router.push(`/admin/dynamic/discovery${params.toString() ? `?${params.toString()}` : ""}`, {
      scroll: false,
    });
  }

  async function copyApprovedAsins() {
    if (exportAsins.length === 0) return;
    await navigator.clipboard.writeText(exportAsins.join("\n"));
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-6 text-black md:px-6">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-5">
        <header className="rounded-[24px] border border-gray-200 bg-white px-4 py-4 shadow-sm md:px-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <div className="mb-2 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-indigo-500" />
                <span className="text-[10px] font-black uppercase tracking-[0.28em] text-indigo-600">
                  Discovery Amazon
                </span>
              </div>
              <h1 className="text-3xl font-black tracking-tight text-gray-900 md:text-4xl">
                Discovery de produtos Amazon
              </h1>
              <p className="mt-1 max-w-3xl text-sm font-medium text-gray-500">
                Descubra novos produtos da Amazon por categoria, marcas e relevância antes de importar para o catálogo.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <label className="min-w-[280px]">
                <span className="mb-2 block text-[11px] font-black uppercase tracking-[0.22em] text-gray-500">
                  Selecionar categoria
                </span>
                <div className="relative">
                  <select
                    value={selectedCategoryId}
                    onChange={(event) => goToCategory(event.target.value)}
                    className="w-full appearance-none rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 pr-10 text-sm outline-none transition focus:border-indigo-300 focus:bg-white"
                  >
                    <option value="">Selecionar categoria</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                </div>
              </label>
            </div>
          </div>
        </header>

        {notice ? (
          <div className="rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm font-semibold text-indigo-800">
            {notice}
          </div>
        ) : null}

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Categoria"
            value={selectedCategory?.name ?? "—"}
            description={selectedCategory ? `Grupo ${selectedCategory.group}` : "Sem categoria selecionada"}
          />
          <StatCard title="Queries geradas" value={String(latestRun?.queryCount ?? 0)} description="Volume do run atual" />
          <StatCard title="ASINs exportáveis" value={String(exportAsins.length)} description="Aprovados para o importador" />
          <StatCard title="Itens pendentes" value={String(pendingReviewProducts.length)} description="Fila ativa de revisão" />
        </div>

        {latestRun ? (
          <section className="rounded-[24px] border border-gray-200 bg-white p-4 shadow-sm md:p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${latestRun.status === "running" ? "bg-amber-500" : latestRun.status === "error" ? "bg-rose-500" : "bg-emerald-500"}`} />
                  <span className="text-[11px] font-black uppercase tracking-[0.22em] text-gray-500">
                    Status do run
                  </span>
                  <span className="rounded-full bg-gray-100 px-3 py-1 text-[11px] font-bold text-gray-700">
                    {latestRun.status}
                  </span>
                </div>
                <div className="text-sm font-semibold text-gray-900">
                  {progress?.currentQuery ?? "Preparando descoberta"}
                </div>
                <div className="text-[12px] text-gray-500">
                  P?gina {progress?.currentPage ?? 0} ? {progress?.renderer ?? "browser"} ? {progress?.currentCards ?? 0} cards ? {progress?.currentAsins ?? 0} ASINs v?lidos
                </div>
              </div>

              <div className="min-w-[220px] flex-1 max-w-xl">
                <div className="mb-2 flex items-center justify-between text-[11px] font-bold uppercase tracking-[0.2em] text-gray-500">
                  <span>Progresso</span>
                  <span>
                    {progressCompletedQueries} / {progressTotalQueries}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full bg-indigo-600 transition-all"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.round(
                          (progressCompletedQueries / progressTotalQueries) * 100
                        )
                      )}%`,
                    }}
                  />
                </div>
                <div className="mt-2 break-all rounded-2xl bg-gray-50 p-3 font-mono text-[11px] text-gray-600">
                  {progress?.currentUrl ?? "Aguardando primeira query"}
                </div>
              </div>
            </div>
          </section>
        ) : null}


        {!selectedCategory ? (
          <section className="rounded-[24px] border border-dashed border-gray-300 bg-white px-6 py-12 text-center shadow-sm">
            <div className="mx-auto flex max-w-xl flex-col items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100 text-gray-500">
                <Search className="h-5 w-5" />
              </div>
              <h2 className="text-2xl font-black text-gray-900">Selecione uma categoria</h2>
              <p className="text-sm text-gray-500">
                Ao escolher uma categoria, carregamos marcas aprovadas, search terms, configurações, estatísticas e o histórico já curado.
              </p>
            </div>
          </section>
        ) : (
          <>
            <section className="rounded-[24px] border border-gray-200 bg-white p-4 shadow-sm md:p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-blue-500" />
                    <span className="text-[10px] font-black uppercase tracking-[0.22em] text-blue-600">
                      Contexto da categoria
                    </span>
                  </div>
                  <h2 className="text-2xl font-black text-gray-900">Marcas, termos e fontes</h2>
                  <p className="mt-1 text-sm text-gray-500">
                    Tudo carrega automaticamente por categoria. Você só ajusta o necessário e executa.
                  </p>
                </div>
                <form action={syncDiscoveryBrandsFromCatalog}>
                  <input type="hidden" name="categoryId" value={selectedCategoryId} />
                  <button
                    type="submit"
                    className="rounded-2xl border border-gray-200 bg-white px-4 py-2 text-[11px] font-black uppercase tracking-[0.24em] text-gray-700 transition hover:border-gray-300"
                  >
                    Buscar marcas do banco
                  </button>
                </form>
              </div>

              <form className="space-y-4">
                <input type="hidden" name="categoryId" value={selectedCategoryId} />
                <input type="hidden" name="defaultSortBy" value={config?.defaultSortBy ?? "featured"} />

                <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
                  <section className="rounded-[22px] border border-gray-200 bg-gray-50 p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <div className="text-[11px] font-black uppercase tracking-[0.22em] text-gray-500">
                          Marcas aprovadas
                        </div>
                        <p className="mt-1 text-xs text-gray-500">
                          Marque, desmarque ou adicione marcas manualmente.
                        </p>
                      </div>
                    </div>
                    <ChipPicker
                      syncKey={selectedCategoryId}
                      name="seedBrands"
                      values={approvedBrands.map((brand) => brand.brandName)}
                      emptyLabel="Nenhuma marca cadastrada."
                      addLabel="+ Adicionar marca"
                      placeholder="Adicionar marca"
                      accent="emerald"
                    />
                  </section>

                  <section className="rounded-[22px] border border-gray-200 bg-gray-50 p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <div className="text-[11px] font-black uppercase tracking-[0.22em] text-gray-500">
                          Search terms
                        </div>
                        <p className="mt-1 text-xs text-gray-500">
                          Adicione aliases, plural, singular e variações com acento manualmente.
                        </p>
                      </div>
                    </div>
                    <ChipPicker
                      syncKey={selectedCategoryId}
                      name="searchTerms"
                      values={sortedSearchTerms}
                      emptyLabel="Nenhum termo cadastrado."
                      addLabel="+ Adicionar termo"
                      placeholder="Adicionar termo"
                      accent="indigo"
                    />
                  </section>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_1.1fr]">
                  <label className="block rounded-[22px] border border-gray-200 bg-gray-50 p-4">
                    <span className="mb-2 block text-[11px] font-black uppercase tracking-[0.22em] text-gray-500">
                      Modo de busca
                    </span>
                    <select
                      name="mode"
                      defaultValue={config?.mode ?? "individual"}
                      className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-indigo-300"
                    >
                      <option value="individual">Um link por marca</option>
                      <option value="multi_brand">Uma busca com todas as marcas</option>
                    </select>
                  </label>

                  <label className="block rounded-[22px] border border-gray-200 bg-gray-50 p-4">
                    <span className="mb-2 block text-[11px] font-black uppercase tracking-[0.22em] text-gray-500">
                      Páginas
                    </span>
                    <label className="mb-2 inline-flex items-center gap-2 text-xs font-semibold text-gray-600">
                      <input type="hidden" name="autoMaxPages" value="false" />
                      <input
                        type="checkbox"
                        name="autoMaxPages"
                        value="true"
                        checked={autoMaxPages}
                        onChange={(event) => setAutoMaxPages(event.target.checked)}
                        className="h-4 w-4 accent-indigo-600"
                      />
                      Automático
                    </label>
                    <input
                      name="maxPages"
                      type="number"
                      min={1}
                      max={10}
                      defaultValue={config?.maxPages ?? 2}
                      disabled={autoMaxPages}
                      className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-indigo-300 disabled:bg-gray-100 disabled:text-gray-400"
                    />
                  </label>

                  <label className="block rounded-[22px] border border-gray-200 bg-gray-50 p-4">
                    <span className="mb-2 block text-[11px] font-black uppercase tracking-[0.22em] text-gray-500">
                      Produtos máx.
                    </span>
                    <label className="mb-2 inline-flex items-center gap-2 text-xs font-semibold text-gray-600">
                      <input type="hidden" name="autoMaxItemsPerQuery" value="false" />
                      <input
                        type="checkbox"
                        name="autoMaxItemsPerQuery"
                        value="true"
                        checked={autoMaxItemsPerQuery}
                        onChange={(event) => setAutoMaxItemsPerQuery(event.target.checked)}
                        className="h-4 w-4 accent-indigo-600"
                      />
                      Automático
                    </label>
                    <input
                      name="maxItemsPerQuery"
                      type="number"
                      min={5}
                      max={100}
                      defaultValue={config?.maxItemsPerQuery ?? 30}
                      disabled={autoMaxItemsPerQuery}
                      className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-indigo-300 disabled:bg-gray-100 disabled:text-gray-400"
                    />
                  </label>

                  <div className="rounded-[22px] border border-gray-200 bg-gray-50 p-4">
                    <div className="mb-2 text-[11px] font-black uppercase tracking-[0.22em] text-gray-500">
                      Fontes de discovery
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {SORT_OPTIONS.map((option) => (
                        <label
                          key={option.value}
                          className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-3 py-2 text-[12px] font-semibold text-gray-700"
                        >
                          <input
                            type="checkbox"
                            name="sortModes"
                            value={option.value}
                            defaultChecked={sortModes.includes(option.value)}
                            className="h-4 w-4 accent-indigo-600"
                          />
                          <span>{option.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="rounded-[22px] border border-gray-200 bg-gray-50 p-4">
                  <div className="mb-2 text-[11px] font-black uppercase tracking-[0.22em] text-gray-500">
                    Toggles
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <InlineToggle
                      name="primeOnlyDefault"
                      label="Prime only"
                      defaultChecked={config?.primeOnlyDefault ?? false}
                    />
                    <InlineToggle
                      name="ignoreInternationalDefault"
                      label="Ignorar compra internacional"
                      defaultChecked={config?.ignoreInternationalDefault ?? true}
                    />
                    <InlineToggle
                      name="broadDiscoveryDefault"
                      label="Detectar novas marcas"
                      defaultChecked={config?.broadDiscoveryDefault ?? false}
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    formAction={saveDiscoveryCategoryConfig}
                    className="rounded-2xl border border-gray-200 bg-white px-5 py-3 text-[11px] font-black uppercase tracking-[0.24em] text-gray-700 transition hover:border-gray-300"
                  >
                    Salvar configuração
                  </button>
                  <button
                    formAction={runDiscoveryForCategory}
                    className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-6 py-4 text-[11px] font-black uppercase tracking-[0.24em] text-white shadow-sm transition hover:bg-indigo-700"
                  >
                    <WandSparkles className="h-4 w-4" />
                    Executar descoberta
                  </button>
                </div>
              </form>
            </section>

            <details className="rounded-[24px] border border-gray-200 bg-white shadow-sm">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-black uppercase tracking-[0.24em] text-gray-900">
                    Debug operacional
                  </span>
                  <span className="rounded-full bg-gray-100 px-3 py-1 text-[11px] font-bold text-gray-600">
                    {debugQueries.length}
                  </span>
                </div>
                <ChevronDown className="h-4 w-4 text-gray-500" />
              </summary>
              <div className="border-t border-gray-200 p-4 md:p-5">
                {debugQueries.length === 0 ? (
                  <EmptyState label="Nenhuma query registrada neste run." />
                ) : (
                  <div className="space-y-4">
                    <div className="grid gap-3 md:grid-cols-4">
                      <MiniStat label="Cards" value={String(debugQueries.reduce((sum, item) => sum + item.cards, 0))} />
                      <MiniStat label="ASINs válidos" value={String(debugQueries.reduce((sum, item) => sum + item.validAsins, 0))} />
                      <MiniStat label="Descobertos" value={String(debugCounts?.discovered ?? 0)} />
                      <MiniStat label="Aprovados finais" value={String(debugFinalCounts?.approved ?? 0)} />
                    </div>

                    <div className="overflow-hidden rounded-2xl border border-gray-200">
                      <table className="w-full border-collapse text-left">
                        <thead className="bg-gray-50 text-[10px] font-black uppercase tracking-[0.22em] text-gray-500">
                          <tr>
                            <th className="p-3">Query</th>
                            <th className="p-3">Página</th>
                            <th className="p-3">Cards</th>
                            <th className="p-3">ASINs</th>
                            <th className="p-3">Renderer</th>
                            <th className="p-3">URL</th>
                          </tr>
                        </thead>
                        <tbody>
                          {debugQueries.map((item, index) => (
                            <tr key={`${item.query}-${item.page}-${index}`} className="border-t border-gray-100 align-top text-[12px] text-gray-700">
                              <td className="p-3 font-semibold text-gray-900">{item.query}</td>
                              <td className="p-3">{item.page}</td>
                              <td className="p-3">{item.cards}</td>
                              <td className="p-3">{item.validAsins}</td>
                              <td className="p-3">{item.renderer}</td>
                              <td className="max-w-[420px] p-3">
                                <div className="break-all rounded-xl bg-gray-50 p-3 font-mono text-[11px] text-gray-600">
                                  {item.url}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </details>

            <div className="grid gap-4">
              <Accordion title="Itens pendentes" count={pendingReviewProducts.length} defaultOpen>
                <ReviewQueueSection rows={pendingReviewProducts} categoryId={selectedCategoryId} />
              </Accordion>

              <Accordion title="Itens aprovados" count={approvedProducts.length}>
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm text-gray-500">
                      Clique no ASIN para abrir a Amazon ou use o x para retirar da lista de aprovados.
                    </p>
                    <button
                      type="button"
                      onClick={copyApprovedAsins}
                      disabled={exportAsins.length === 0}
                      className="rounded-full border border-gray-200 bg-white px-4 py-2 text-[11px] font-black uppercase tracking-[0.24em] text-gray-700 transition hover:border-gray-300 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Copiar ASINs
                    </button>
                  </div>
                  <CompactAsinSection rows={approvedProducts} categoryId={selectedCategoryId} interactive />
                </div>
              </Accordion>

              <Accordion title="Rejeitados" count={rejectedProducts.length}>
                <CompactAsinSection rows={rejectedProducts} categoryId={selectedCategoryId} canReset />
              </Accordion>

              <Accordion title="Existentes" count={existingProducts.length}>
                <CompactAsinSection rows={existingProducts} categoryId={selectedCategoryId} />
              </Accordion>

              <Accordion title="Marcas pendentes" count={pendingBrands.length}>
                <BrandSection rows={pendingBrands} categoryId={selectedCategoryId} compact />
              </Accordion>

              <Accordion title="Marcas rejeitadas" count={rejectedBrands.length}>
                <BrandSection rows={rejectedBrands} categoryId={selectedCategoryId} compact />
              </Accordion>
            </div>

            <details className="rounded-[24px] border border-gray-200 bg-white shadow-sm">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-black uppercase tracking-[0.24em] text-gray-900">
                    Histórico
                  </span>
                  <span className="rounded-full bg-gray-100 px-3 py-1 text-[11px] font-bold text-gray-600">
                    {runHistory.length}
                  </span>
                </div>
                <ChevronDown className="h-4 w-4 text-gray-500" />
              </summary>
              <div className="border-t border-gray-200 p-4 md:p-5">
                {runHistory.length === 0 ? (
                  <EmptyState label="Nenhuma execução registrada ainda." />
                ) : (
                  <div className="overflow-hidden rounded-2xl border border-gray-200">
                    <table className="w-full border-collapse text-left">
                      <thead className="bg-gray-50 text-[10px] font-black uppercase tracking-[0.22em] text-gray-500">
                        <tr>
                          <th className="p-3">Data</th>
                          <th className="p-3">Categoria</th>
                          <th className="p-3">Queries</th>
                          <th className="p-3">Novos</th>
                          <th className="p-3">Duração</th>
                          <th className="p-3">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {runHistory.map((run) => (
                          <tr key={run.id} className="border-t border-gray-100 text-[12px] text-gray-700">
                            <td className="p-3">{formatDate(run.createdAt)}</td>
                            <td className="p-3">{selectedCategory?.name ?? "—"}</td>
                            <td className="p-3">{run.queryCount}</td>
                            <td className="p-3">{run.newCount}</td>
                            <td className="p-3">{formatDuration(run.createdAt, run.updatedAt)}</td>
                            <td className="p-3 font-semibold">{run.status}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </details>
          </>
        )}
      </div>
    </main>
  );
}

function Accordion({
  title,
  count,
  children,
  defaultOpen = false,
}: {
  title: string;
  count: number;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details className="rounded-[24px] border border-gray-200 bg-white shadow-sm" open={defaultOpen}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="text-sm font-black uppercase tracking-[0.24em] text-gray-900">
            {title}
          </span>
          <span className="rounded-full bg-gray-100 px-3 py-1 text-[11px] font-bold text-gray-600">
            {count}
          </span>
        </div>
        <ChevronDown className="h-4 w-4 text-gray-500" />
      </summary>
      <div className="border-t border-gray-200 p-4 md:p-5">{children}</div>
    </details>
  );
}

function StatCard({
  title,
  value,
  description,
}: {
  title: string;
  value: string;
  description: string;
}) {
  return (
    <div className="rounded-[24px] border border-gray-200 bg-white px-5 py-4 shadow-sm">
      <div className="text-[10px] font-black uppercase tracking-[0.24em] text-gray-400">{title}</div>
      <div className="mt-1 text-xl font-black text-gray-900">{value}</div>
      <div className="mt-1 text-xs text-gray-500">{description}</div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
      <div className="text-[10px] font-black uppercase tracking-[0.24em] text-gray-400">{label}</div>
      <div className="mt-1 text-lg font-black text-gray-900">{value}</div>
    </div>
  );
}


function InlineToggle({
  name,
  label,
  defaultChecked,
}: {
  name: string;
  label: string;
  defaultChecked: boolean;
}) {
  return (
    <label className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-2 text-[12px] font-semibold text-gray-700">
      <input type="hidden" name={name} value="false" />
      <input
        type="checkbox"
        name={name}
        value="true"
        defaultChecked={defaultChecked}
        className="h-4 w-4 accent-indigo-600"
      />
      <span>{label}</span>
    </label>
  );
}

function ChipPicker({
  syncKey,
  name,
  values,
  emptyLabel,
  addLabel,
  placeholder,
  accent,
}: {
  syncKey: string;
  name: string;
  values: string[];
  emptyLabel: string;
  addLabel: string;
  placeholder: string;
  accent: "indigo" | "emerald";
}) {
  const [selected, setSelected] = useState<string[]>(values);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    setSelected(sortAlphabetically(values));
    setDraft("");
  }, [syncKey, values]);

  function toggleItem(value: string) {
    setSelected((current) =>
      sortAlphabetically(
        current.includes(value)
          ? current.filter((item) => item !== value)
          : [...current, value]
      )
    );
  }

  function selectAll() {
    setSelected(sortAlphabetically(values));
  }

  function clearAll() {
    setSelected([]);
  }

  function addItems() {
    const next = parseNewCategoryTags(draft);
    if (next.length === 0) return;
    setSelected((current) => sortAlphabetically(Array.from(new Set([...current, ...next]))));
    setDraft("");
  }

  const chipColors =
    accent === "emerald"
      ? {
          active: "border-emerald-600 bg-emerald-600 text-white",
          inactive: "border-emerald-200 bg-white text-emerald-700 hover:border-emerald-300",
        }
      : {
          active: "border-indigo-600 bg-indigo-600 text-white",
          inactive: "border-indigo-200 bg-white text-indigo-700 hover:border-indigo-300",
        };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={selectAll}
          className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-gray-600"
        >
          Selecionar todas
        </button>
        <button
          type="button"
          onClick={clearAll}
          className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-gray-600"
        >
          Desmarcar todas
        </button>
        <div className="ml-auto flex min-w-[240px] flex-1 gap-2">
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                addItems();
              }
            }}
            placeholder={placeholder}
            className="min-w-0 flex-1 rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-indigo-300"
          />
          <button
            type="button"
            onClick={addItems}
            className="inline-flex items-center gap-1 rounded-2xl border border-gray-200 bg-white px-3 py-2 text-[11px] font-black uppercase tracking-[0.2em] text-gray-700"
          >
            <Plus className="h-3.5 w-3.5" />
            {addLabel}
          </button>
        </div>
      </div>

      {selected.length > 0 ? selected.map((value) => <input key={value} type="hidden" name={name} value={value} />) : null}
      {draft.trim() ? <input type="hidden" name={name} value={draft.trim()} /> : null}

      {values.length === 0 && selected.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-4 py-5 text-sm text-gray-500">
          {emptyLabel}
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {(selected.length > 0 ? selected : values).map((value) => {
            const active = selected.includes(value);
            return (
              <button
                key={value}
                type="button"
                onClick={() => toggleItem(value)}
                className={`inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-[12px] font-semibold transition ${active ? chipColors.active : chipColors.inactive}`}
              >
                <span className={`h-2 w-2 rounded-full ${active ? "bg-white" : "bg-gray-300"}`} />
                <span>{value}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CompactAsinSection({
  rows,
  categoryId,
  canReset = false,
  interactive = false,
}: {
  rows: ProductRow[];
  categoryId: string;
  canReset?: boolean;
  interactive?: boolean;
}) {
  if (rows.length === 0) {
    return <EmptyState label="Nenhum item nesta seção." />;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {rows.map((row) =>
        interactive ? (
          <div
            key={row.asin}
            className="group inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-[12px] font-semibold text-emerald-800 transition hover:border-emerald-300 hover:bg-emerald-100"
          >
            <a
              href={`https://www.amazon.com.br/dp/${row.asin}`}
              target="_blank"
              rel="noreferrer"
              className="font-mono text-[11px] font-bold text-emerald-950 hover:underline"
            >
              {row.asin}
            </a>
            <form action={updateDiscoveryProductStatus}>
              <input type="hidden" name="categoryId" value={categoryId} />
              <input type="hidden" name="asin" value={row.asin} />
              <input type="hidden" name="status" value="pending_review" />
              <button
                type="submit"
                className="opacity-0 transition group-hover:opacity-100"
                aria-label={`Remover ${row.asin} dos aprovados`}
              >
                ?
              </button>
            </form>
          </div>
        ) : canReset ? (
          <div
            key={row.asin}
            className="group flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-2 text-[12px] font-semibold text-gray-700 transition hover:border-gray-300"
          >
            <a
              href={`https://www.amazon.com.br/dp/${row.asin}`}
              target="_blank"
              rel="noreferrer"
              className="font-mono text-[11px] font-bold text-gray-900 hover:underline"
            >
              {row.asin}
            </a>
            <form action={updateDiscoveryProductStatus}>
              <input type="hidden" name="categoryId" value={categoryId} />
              <input type="hidden" name="asin" value={row.asin} />
              <input type="hidden" name="status" value="pending_review" />
              <button
                type="submit"
                className="rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[11px] font-black leading-none text-gray-600 transition hover:border-gray-300 hover:bg-white"
                aria-label={`Restaurar ${row.asin}`}
                title="Restaurar para a fila"
              >
                ×
              </button>
            </form>
          </div>
        ) : (
          <a
            key={row.asin}
            href={`https://www.amazon.com.br/dp/${row.asin}`}
            target="_blank"
            rel="noreferrer"
            className="group inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-2 text-[12px] font-semibold text-gray-700 transition hover:border-gray-300"
          >
            <span className="font-mono text-[11px] font-bold text-gray-900">{row.asin}</span>
          </a>
        )
      )}
    </div>
  );
}function ReviewQueueSection({
  rows,
  categoryId,
}: {
  rows: ProductRow[];
  categoryId: string;
}) {
  const [selectedAsins, setSelectedAsins] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<"reviews" | "product" | "brand" | "date">("reviews");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    setSelectedAsins([]);
  }, [categoryId, rows.length]);

  useEffect(() => {
    setSortBy("reviews");
    setSortDirection("desc");
  }, [categoryId]);

  const sortedRows = useMemo(() => {
    const directionFactor = sortDirection === "asc" ? 1 : -1;

    return [...rows].sort((a, b) => {
      if (sortBy === "reviews") {
        const aValue = a.reviewCount ?? -1;
        const bValue = b.reviewCount ?? -1;
        return (aValue - bValue) * directionFactor;
      }

      if (sortBy === "product") {
        return (a.title ?? a.asin).localeCompare(b.title ?? b.asin, "pt-BR") * directionFactor;
      }

      if (sortBy === "brand") {
        return (a.brandName ?? "").localeCompare(b.brandName ?? "", "pt-BR") * directionFactor;
      }

      const aTime = new Date(a.lastSeenAt).getTime();
      const bTime = new Date(b.lastSeenAt).getTime();
      return (aTime - bTime) * directionFactor;
    });
  }, [rows, sortBy, sortDirection]);

  function toggleOne(asin: string) {
    setSelectedAsins((current) =>
      current.includes(asin) ? current.filter((item) => item !== asin) : [...current, asin]
    );
  }

  function toggleAll() {
    setSelectedAsins((current) => (current.length === rows.length ? [] : rows.map((row) => row.asin)));
  }

  function setSort(column: "reviews" | "product" | "brand" | "date") {
    if (sortBy === column) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortBy(column);
    setSortDirection(column === "reviews" ? "desc" : "asc");
  }

  function sortMarker(column: "reviews" | "product" | "brand" | "date") {
    if (sortBy !== column) return "";
    return sortDirection === "asc" ? " ^" : " v";
  }

  return (
    <div className="space-y-3">
      <form action={updateDiscoveryProductStatus} className="space-y-3">
        <input type="hidden" name="categoryId" value={categoryId} />
        {selectedAsins.map((asin) => (
          <input key={asin} type="hidden" name="asin" value={asin} />
        ))}

        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-gray-200 bg-gray-50 px-3 py-2">
          <button
            type="button"
            onClick={toggleAll}
            className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-gray-600"
          >
            {selectedAsins.length === rows.length ? "Desmarcar tudo" : "Selecionar tudo"}
          </button>
          <button
            type="button"
            onClick={() => setSelectedAsins([])}
            className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-gray-600"
          >
            Limpar
          </button>
          <div className="ml-auto text-[12px] font-semibold text-gray-600">
            {selectedAsins.length} selecionados
          </div>
          <button
            type="submit"
            name="status"
            value="approved"
            className="rounded-full bg-emerald-600 px-4 py-2 text-[11px] font-black uppercase tracking-[0.2em] text-white disabled:opacity-40"
            disabled={selectedAsins.length === 0}
          >
            Aprovar
          </button>
          <button
            type="submit"
            name="status"
            value="rejected"
            className="rounded-full bg-red-600 px-4 py-2 text-[11px] font-black uppercase tracking-[0.2em] text-white disabled:opacity-40"
            disabled={selectedAsins.length === 0}
          >
            Rejeitar
          </button>
          <button
            type="submit"
            formAction={clearDiscoveryPendingProducts}
            className="rounded-full border border-gray-200 bg-white px-4 py-2 text-[11px] font-black uppercase tracking-[0.2em] text-gray-700 disabled:opacity-40"
            disabled={rows.length === 0}
          >
            Limpar fila
          </button>
        </div>
      </form>

      <div className="overflow-hidden rounded-2xl border border-gray-200">
        <table className="w-full border-collapse text-left text-[12px]">
          <thead className="bg-gray-50 text-[10px] font-black uppercase tracking-[0.22em] text-gray-500">
            <tr>
              <th className="w-12 p-2.5">
                <input
                  type="checkbox"
                  checked={rows.length > 0 && selectedAsins.length === rows.length}
                  onChange={toggleAll}
                  className="h-4 w-4 accent-indigo-600"
                />
              </th>
              <th className="p-2.5">
                <button type="button" onClick={() => setSort("product")} className="text-left">
                  Produto{sortMarker("product")}
                </button>
              </th>
              <th className="p-2.5">
                <button type="button" onClick={() => setSort("brand")} className="text-left">
                  Marca{sortMarker("brand")}
                </button>
              </th>
              <th className="p-2.5">
                <button type="button" onClick={() => setSort("date")} className="text-left">
                  Data{sortMarker("date")}
                </button>
              </th>
              <th className="p-2.5">Ação</th>
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row) => (
              <tr key={row.asin} className="border-t border-gray-100 align-top">
                <td className="p-2.5">
                  <input
                    type="checkbox"
                    checked={selectedAsins.includes(row.asin)}
                    onChange={() => toggleOne(row.asin)}
                    className="h-4 w-4 accent-indigo-600"
                  />
                </td>
                <td className="p-2.5">
                  <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 font-semibold leading-tight text-gray-900">
                    <span>{row.title ?? `Produto ${row.asin}`}</span>
                    <a
                      href={`https://www.amazon.com.br/dp/${row.asin}`}
                      target="_blank"
                      rel="noreferrer"
                      className="font-mono text-[10px] font-bold text-indigo-700 hover:underline"
                    >
                      {row.asin}
                    </a>
                  </div>
                  <div className="mt-0.5 text-[10px] text-gray-500">
                    {row.ratingAverage ?? "—"} avg · {formatReviewCount(row.reviewCount)} reviews
                  </div>
                  {row.reason ? <div className="mt-0.5 text-[10px] text-gray-500">Motivo: {row.reason}</div> : null}
                </td>
                <td className="p-2.5">
                  <div className="text-[12px] font-semibold leading-tight text-gray-900">{row.brandName ?? "—"}</div>
                  <div className="mt-0.5 text-[10px] text-gray-500">
                    {row.status} · {row.catalogState}
                  </div>
                </td>
                <td className="p-2.5 text-[10px] text-gray-600">
                  <div>{row.sponsored ? "Patrocinado" : "Orgânico"}</div>
                  <div>{row.isPrime ? "Prime" : "Sem Prime"}</div>
                  <div>{row.isInternational ? "Compra internacional" : "Local"}</div>
                  <div className="mt-1 text-gray-400">{formatDate(row.lastSeenAt)}</div>
                </td>
                <td className="p-2.5">
                  <form action={updateDiscoveryProductStatus} className="space-y-1.5">
                    <input type="hidden" name="categoryId" value={categoryId} />
                    <input type="hidden" name="asin" value={row.asin} />
                    <div className="flex items-center gap-2">
                      <select
                        name="status"
                        defaultValue={row.status}
                        className="min-w-0 flex-1 rounded-xl border border-gray-200 bg-white px-2 py-1 text-[10px] font-semibold outline-none"
                      >
                        <option value="pending_review">Pendente</option>
                        <option value="approved">Aprovar</option>
                        <option value="rejected">Rejeitar</option>
                      </select>
                      <button className="rounded-xl bg-gray-900 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-white">
                        OK
                      </button>
                    </div>
                    <details className="group">
                      <summary className="cursor-pointer list-none text-[9px] font-bold uppercase tracking-[0.16em] text-gray-500">
                        Motivo opcional
                      </summary>
                      <div className="pt-1.5">
                        <input
                          name="reason"
                          defaultValue={row.reason ?? ""}
                          placeholder="Motivo"
                          className="w-full rounded-xl border border-gray-200 bg-white px-2 py-1 text-[10px] outline-none"
                        />
                      </div>
                    </details>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BrandSection({
  rows,
  categoryId,
  compact = false,
}: {
  rows: BrandRow[];
  categoryId: string;
  compact?: boolean;
}) {
  if (rows.length === 0) {
    return <EmptyState label="Nenhuma marca nesta seção." />;
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200">
      <table className="w-full border-collapse text-left text-[12px]">
        <thead className="bg-gray-50 text-[10px] font-black uppercase tracking-[0.22em] text-gray-500">
          <tr>
            <th className="p-2.5">Marca</th>
            <th className="p-2.5">Detecções</th>
            <th className="p-2.5">Data</th>
            <th className="p-2.5">Ação</th>
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, compact ? 12 : 20).map((row) => (
            <tr key={row.brandName} className="border-t border-gray-100 align-top">
              <td className="p-2.5">
                <div className="text-[11px] font-bold text-gray-900">{row.brandName}</div>
                <div className="mt-0.5 text-[10px] text-gray-500">{row.status}</div>
              </td>

              <td className="p-2.5 text-[11px] font-semibold text-gray-700">{row.timesDetected}</td>
              <td className="p-2.5 text-[10px] text-gray-500">
                <div>{formatDate(row.firstSeenAt)}</div>
                <div>{formatDate(row.lastSeenAt)}</div>
              </td>
              <td className="p-2.5">
                <form action={updateDiscoveryBrandStatus} className="space-y-1.5">
                  <input type="hidden" name="categoryId" value={categoryId} />
                  <input type="hidden" name="brandName" value={row.brandName} />
                  <select
                    name="status"
                    defaultValue={row.status}
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-[11px] outline-none"
                  >
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                  <button className="w-full rounded-xl bg-gray-900 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-white">
                    Salvar
                  </button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-4 py-5 text-sm text-gray-500">
      {label}
    </div>
  );
}
