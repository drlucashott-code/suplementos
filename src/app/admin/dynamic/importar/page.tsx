'use client';

import { useEffect, useState } from 'react';
import { getHomeCategories } from '../nova-categoria/actions';
import {
  cancelDynamicDiscovery,
  cancelDynamicImport,
  getDynamicDiscoveryRun,
  getLatestDynamicDiscoveryRun,
  getDynamicImportRun,
  getLatestDynamicImportRun,
  startDynamicDiscovery,
  startDynamicImportViaAPI,
} from './actions';

interface Category {
  id: string;
  name: string;
}

interface ImportRunState {
  id: string;
  status: string;
  totalItems: number;
  processedItems: number;
  importedItems: number;
  skippedItems: number;
  errorItems: number;
  cancelRequested: boolean;
  logs: string[];
}

interface DiscoveryItem {
  asin: string;
  title: string;
  brand: string;
  imageUrl: string;
  displayPrice: string;
}

interface DiscoveryRunState {
  id: string;
  status: string;
  totalSearches: number;
  processedSearches: number;
  foundItems: number;
  cancelRequested: boolean;
  logs: string[];
  items: DiscoveryItem[];
}

function parseFilterTerms(value: string) {
  return value
    .split(/[,\n;]+/)
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

function matchesTitleFilters(
  title: string,
  requiredTerms: string[],
  forbiddenTerms: string[]
) {
  const normalizedTitle = title.toLowerCase();

  const matchesRequired =
    requiredTerms.length === 0 ||
    requiredTerms.every((term) => normalizedTitle.includes(term));

  const matchesForbidden =
    forbiddenTerms.length === 0 ||
    !forbiddenTerms.some((term) => normalizedTitle.includes(term));

  return matchesRequired && matchesForbidden;
}

export default function ImportadorDynamicAPI() {
  const DISCOVERY_PAGE_SIZE = 12;
  const [asins, setAsins] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCat, setSelectedCat] = useState('');
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [requiredTitleRaw, setRequiredTitleRaw] = useState('');
  const [forbiddenTitleRaw, setForbiddenTitleRaw] = useState('');
  const [enableImportValidation, setEnableImportValidation] = useState(true);
  const [discoveryKeywordsRaw, setDiscoveryKeywordsRaw] = useState('');
  const [discoveryBrandsRaw, setDiscoveryBrandsRaw] = useState('');
  const [discovering, setDiscovering] = useState(false);
  const [discoveryLogs, setDiscoveryLogs] = useState<string[]>([]);
  const [discoveredItems, setDiscoveredItems] = useState<DiscoveryItem[]>([]);
  const [discoveryPage, setDiscoveryPage] = useState(1);
  const [activeDiscoveryRunId, setActiveDiscoveryRunId] = useState<string | null>(null);
  const [activeDiscoveryRun, setActiveDiscoveryRun] = useState<DiscoveryRunState | null>(null);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [activeRun, setActiveRun] = useState<ImportRunState | null>(null);

  useEffect(() => {
    getHomeCategories().then((data) => setCategories(data as unknown as Category[]));
  }, []);

  useEffect(() => {
    getLatestDynamicDiscoveryRun().then((run) => {
      if (!run) return;
      setActiveDiscoveryRun(run as DiscoveryRunState);
      setActiveDiscoveryRunId(run.id);
      setDiscoveryLogs(run.logs);
      setDiscoveredItems(run.items ?? []);
    });
  }, []);

  useEffect(() => {
    getLatestDynamicImportRun().then((run) => {
      if (!run) return;
      setActiveRun(run as ImportRunState);
      setActiveRunId(run.id);
      setLogs(run.logs);
    });
  }, []);

  useEffect(() => {
    if (!activeDiscoveryRunId) return;

    const poll = async () => {
      const run = await getDynamicDiscoveryRun(activeDiscoveryRunId);
      if (!run) return;
      setActiveDiscoveryRun(run as DiscoveryRunState);
      setDiscoveryLogs(run.logs);
      setDiscoveredItems(run.items ?? []);
      setDiscovering(run.status === 'running');
    };

    poll();
    const interval = setInterval(poll, 2500);
    return () => clearInterval(interval);
  }, [activeDiscoveryRunId]);

  useEffect(() => {
    if (!activeRunId) return;

    const poll = async () => {
      const run = await getDynamicImportRun(activeRunId);
      if (!run) return;
      setActiveRun(run as ImportRunState);
      setLogs(run.logs);
    };

    poll();
    const interval = setInterval(poll, 2500);
    return () => clearInterval(interval);
  }, [activeRunId]);

  const handleImport = async () => {
    if (!asins || !selectedCat) {
      alert('Selecione a categoria e cole os ASINs');
      return;
    }

    setLoading(true);
    setLogs(['Preparando importaÃ§Ã£o...']);

    const res = await startDynamicImportViaAPI({
      asinsRaw: asins,
      categoryId: selectedCat,
      requiredTitleRaw,
      forbiddenTitleRaw,
      enableImportValidation,
    });

    if (res.error) {
      alert(res.error);
      setLogs([res.error]);
      setLoading(false);
      return;
    }

    if (res.runId) {
      setActiveRunId(res.runId);
    }

    setLoading(false);
    setAsins('');
  };

  const handleCancel = async () => {
    if (!activeRunId) return;
    const res = await cancelDynamicImport(activeRunId);
    if (res.error) {
      alert(res.error);
    }
  };

  const handleDiscover = async () => {
    if (!discoveryKeywordsRaw.trim()) {
      alert('Informe ao menos uma palavra-chave da busca.');
      return;
    }

    setDiscovering(true);
    setDiscoveryLogs(['Preparando descoberta de ASINs...']);
    setDiscoveredItems([]);
    setDiscoveryPage(1);

    const res = await startDynamicDiscovery({
      keywordsRaw: discoveryKeywordsRaw,
      brandsRaw: discoveryBrandsRaw,
      maxPages: 6,
    });

    if (res.error) {
      setDiscovering(false);
      alert(res.error);
      setDiscoveryLogs([res.error]);
      return;
    }

    if (res.runId) {
      setActiveDiscoveryRunId(res.runId);
    }
  };

  const handleCancelDiscovery = async () => {
    if (!activeDiscoveryRunId) return;
    const res = await cancelDynamicDiscovery(activeDiscoveryRunId);
    if (res.error) {
      alert(res.error);
    }
  };

  const handleUseDiscoveredAsins = () => {
    const requiredTerms = parseFilterTerms(requiredTitleRaw);
    const forbiddenTerms = parseFilterTerms(forbiddenTitleRaw);

    const filteredItems = discoveredItems.filter((item) => {
      return matchesTitleFilters(item.title, requiredTerms, forbiddenTerms);
    });

    if (filteredItems.length === 0) {
      alert('Nenhum ASIN encontrado bate com os filtros de titulo da etapa 2.');
      return;
    }

    setAsins(filteredItems.map((item) => item.asin).join(', '));
  };

  const running = activeRun?.status === 'running';
  const discoveryRunning = activeDiscoveryRun?.status === 'running';
  const requiredTerms = parseFilterTerms(requiredTitleRaw);
  const forbiddenTerms = parseFilterTerms(forbiddenTitleRaw);
  const filteredDiscoveredItems = discoveredItems.filter((item) =>
    matchesTitleFilters(item.title, requiredTerms, forbiddenTerms)
  );
  const remainingDiscoveredItems = discoveredItems.filter(
    (item) => !matchesTitleFilters(item.title, requiredTerms, forbiddenTerms)
  );
  const totalDiscoveryPages = Math.max(
    1,
    Math.ceil(remainingDiscoveredItems.length / DISCOVERY_PAGE_SIZE)
  );
  const safeDiscoveryPage = Math.min(discoveryPage, totalDiscoveryPages);
  const paginatedDiscoveredItems = remainingDiscoveredItems.slice(
    (safeDiscoveryPage - 1) * DISCOVERY_PAGE_SIZE,
    safeDiscoveryPage * DISCOVERY_PAGE_SIZE
  );

  return (
    <div className="min-h-screen bg-white p-8 font-sans text-black">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex items-center justify-between border-b pb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Importador de Catalogo</h1>
            <p className="text-sm text-gray-500">
              Puxe produtos de qualquer nicho com preco real e link de afiliado.
            </p>
          </div>
          <span className="rounded-full border border-green-200 bg-green-100 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-green-700">
            Official PA-API v5
          </span>
        </div>

        <div className="grid grid-cols-1 gap-8 xl:grid-cols-2">
          <div className="space-y-6">
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
              <div className="mb-4">
                <h2 className="text-lg font-black text-gray-900">Etapa 1: Descobrir ASINs</h2>
                <p className="text-sm text-gray-500">
                  Busque por palavra-chave e marca para montar a lista inicial de ASINs.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-[1.2fr_1fr_auto]">
                <input
                  value={discoveryKeywordsRaw}
                  onChange={(e) => setDiscoveryKeywordsRaw(e.target.value)}
                  placeholder="Palavras-chave ex: condicionador infantil, brilho, hidratacao"
                  className="w-full rounded-xl border border-gray-200 bg-white p-3.5 font-semibold outline-none transition-all focus:ring-2 focus:ring-yellow-400"
                />
                <input
                  value={discoveryBrandsRaw}
                  onChange={(e) => setDiscoveryBrandsRaw(e.target.value)}
                  placeholder="Marcas ex: seda, pantene, elseve"
                  className="w-full rounded-xl border border-gray-200 bg-white p-3.5 font-semibold outline-none transition-all focus:ring-2 focus:ring-yellow-400"
                />
                <button
                  onClick={handleDiscover}
                  disabled={discovering}
                  className="rounded-xl bg-black px-5 py-3 font-black text-white transition-all hover:bg-gray-800 disabled:opacity-50"
                >
                  {discovering ? 'Buscando...' : 'Buscar ASINs'}
                </button>
              </div>

              {discoveryRunning && (
                <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
                  <div className="text-xs font-semibold text-blue-700">
                    {activeDiscoveryRun?.processedSearches ?? 0}/{activeDiscoveryRun?.totalSearches ?? 0} buscas processadas
                    {' '}| {activeDiscoveryRun?.foundItems ?? 0} ASINs unicos encontrados
                  </div>
                  <button
                    onClick={handleCancelDiscovery}
                    className="rounded-lg bg-red-600 px-3 py-2 text-[11px] font-black text-white transition-all hover:bg-red-700"
                  >
                    Cancelar descoberta
                  </button>
                </div>
              )}

              {discoveredItems.length > 0 && (
                <div className="mt-5 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="text-sm font-bold text-gray-700">
                        {discoveredItems.length} ASINs encontrados
                      </div>
                      <div className="text-[11px] font-semibold text-gray-500">
                        {filteredDiscoveredItems.length} passam pelos filtros da etapa 2
                      </div>
                      <div className="text-[11px] font-semibold text-gray-500">
                        {remainingDiscoveredItems.length} sobrando fora da importacao
                      </div>
                    </div>
                    <button
                      onClick={handleUseDiscoveredAsins}
                      className="rounded-xl bg-[#FFD814] px-4 py-2 text-xs font-black text-black transition-all hover:bg-[#F7CA00]"
                    >
                      Usar {filteredDiscoveredItems.length} ASINs na importacao
                    </button>
                  </div>

                  {remainingDiscoveredItems.length > 0 ? (
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      {paginatedDiscoveredItems.map((item) => (
                        <div
                          key={item.asin}
                          className="rounded-xl border border-gray-200 bg-white p-3"
                        >
                          <div className="text-[11px] font-black text-blue-700">{item.asin}</div>
                          <div className="mt-1 text-xs font-bold text-gray-900">{item.title}</div>
                          <div className="mt-1 text-[11px] font-semibold text-gray-500">
                            {item.brand} | {item.displayPrice}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm font-semibold text-green-700">
                      Todos os ASINs encontrados estao passando pelos filtros da etapa 2.
                    </div>
                  )}

                  {remainingDiscoveredItems.length > DISCOVERY_PAGE_SIZE && (
                    <div className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3">
                      <div className="text-[11px] font-semibold text-gray-500">
                        Pagina {safeDiscoveryPage} de {totalDiscoveryPages} • exibindo{' '}
                        {paginatedDiscoveredItems.length} de {remainingDiscoveredItems.length}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() =>
                            setDiscoveryPage((current) => Math.max(1, current - 1))
                          }
                          disabled={safeDiscoveryPage === 1}
                          className="rounded-lg border border-gray-200 px-3 py-2 text-[11px] font-black text-gray-700 transition-all hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Anterior
                        </button>
                        <button
                          onClick={() =>
                            setDiscoveryPage((current) =>
                              Math.min(totalDiscoveryPages, current + 1)
                            )
                          }
                          disabled={safeDiscoveryPage === totalDiscoveryPages}
                          className="rounded-lg border border-gray-200 px-3 py-2 text-[11px] font-black text-gray-700 transition-all hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Proxima
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>

          <div className="space-y-6">
            <div>
              <label className="mb-2 block text-xs font-black uppercase tracking-tighter text-gray-400">
                Etapa 2: Categoria destino
              </label>
              <select
                className="w-full rounded-xl border border-gray-200 bg-gray-50 p-3.5 font-semibold outline-none transition-all focus:ring-2 focus:ring-yellow-400"
                onChange={(e) => setSelectedCat(e.target.value)}
                value={selectedCat}
              >
                <option value="">Selecione a categoria dinamica...</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <label className="mb-2 block text-xs font-black uppercase tracking-tighter text-gray-400">
                  2. Palavras obrigatorias no titulo
                </label>
                <input
                  value={requiredTitleRaw}
                  onChange={(e) => setRequiredTitleRaw(e.target.value)}
                  placeholder="Ex: condicionador, infantil"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 p-3.5 font-semibold outline-none transition-all focus:ring-2 focus:ring-yellow-400"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-black uppercase tracking-tighter text-gray-400">
                  3. Palavras proibidas no titulo
                </label>
                <input
                  value={forbiddenTitleRaw}
                  onChange={(e) => setForbiddenTitleRaw(e.target.value)}
                  placeholder="Ex: shampoo, creme para pentear, mascara"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 p-3.5 font-semibold outline-none transition-all focus:ring-2 focus:ring-yellow-400"
                />
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-black text-gray-900">
                    Checagem final na importacao
                  </div>
                  <div className="text-xs font-semibold text-gray-500">
                    Quando ligada, o backend valida novamente as palavras obrigatorias e proibidas antes de salvar.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEnableImportValidation((current) => !current)}
                  className={`rounded-xl px-4 py-2 text-xs font-black transition-all ${
                    enableImportValidation
                      ? 'bg-green-100 text-green-700 hover:bg-green-200'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {enableImportValidation ? 'Ativada' : 'Desativada'}
                </button>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-xs font-black uppercase tracking-tighter text-gray-400">
                4. Lista de ASINs (Amazon IDs)
              </label>
              <textarea
                className="h-72 w-full resize-none rounded-xl border border-gray-200 p-4 font-mono text-sm text-black shadow-inner outline-none transition-all focus:ring-2 focus:ring-yellow-400"
                placeholder="Ex: B0CFYRC6M7, B07XYZ..."
                value={asins}
                onChange={(e) => setAsins(e.target.value)}
              />
            </div>

            {activeRun && (
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-sm font-bold text-gray-700">
                    Status: <span className="uppercase">{activeRun.status}</span>
                  </div>
                  <div className="text-xs font-semibold text-gray-500">
                    {activeRun.processedItems}/{activeRun.totalItems} processados |{' '}
                    {activeRun.importedItems} importados | {activeRun.skippedItems} ignorados |{' '}
                    {activeRun.errorItems} erros
                  </div>
                  {running && (
                    <button
                      onClick={handleCancel}
                      className="rounded-xl bg-red-600 px-4 py-2 text-xs font-black text-white transition-all hover:bg-red-700"
                    >
                      Cancelar importacao
                    </button>
                  )}
                </div>
                {running && (
                  <p className="mt-2 text-[11px] font-semibold text-gray-500">
                    O cancelamento e avaliado a cada 50 itens processados.
                  </p>
                )}
              </div>
            )}

            <button
              onClick={handleImport}
              disabled={loading || running}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#FFD814] py-4 font-black text-black shadow-lg transition-all hover:bg-[#F7CA00] active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-black border-t-transparent" />
                  Iniciando...
                </>
              ) : running ? (
                'Importacao em andamento'
              ) : (
                `Importar ${asins.split(/[\s,]+/).filter(Boolean).length} Produtos`
              )}
            </button>
          </div>

        </div>

        <div className="mt-8 h-[360px] overflow-auto rounded-2xl border border-gray-800 bg-[#131921] p-6 shadow-2xl">
          <div className="mb-6 flex items-center justify-between border-b border-gray-700 pb-3">
            <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-white">
              <span className="h-2 w-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]" />
              Console de saida
            </h2>
          </div>
          <div className="space-y-5 font-mono text-[10px]">
            {discoveryLogs.length > 0 && (
              <div className="space-y-3">
                <div className="text-[11px] font-black uppercase tracking-widest text-blue-300">
                  Descoberta de ASINs
                </div>
                {discoveryLogs.map((log, i) => (
                  <div
                    key={`discovery-${i}-${log}`}
                    className="flex gap-3 leading-relaxed text-cyan-300"
                  >
                    <span className="shrink-0 text-gray-600">
                      [{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}]
                    </span>
                    <span className="break-all">{log}</span>
                  </div>
                ))}
              </div>
            )}

            {logs.length > 0 && (
              <div className="space-y-3">
                <div className="text-[11px] font-black uppercase tracking-widest text-yellow-300">
                  Importacao
                </div>
                {logs.map((log, i) => (
                  <div
                    key={`import-${i}-${log}`}
                    className={`flex gap-3 leading-relaxed ${
                      log.includes('âœ…')
                        ? 'text-green-400'
                        : log.includes('âŒ') || log.includes('ðŸš«')
                          ? 'text-red-400'
                          : 'text-yellow-400'
                    }`}
                  >
                    <span className="shrink-0 text-gray-600">
                      [{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}]
                    </span>
                    <span className="break-all">{log}</span>
                  </div>
                ))}
              </div>
            )}

            {discoveryLogs.length === 0 && logs.length === 0 && (
              <div className="italic text-gray-600">Aguardando comando do sistema...</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
