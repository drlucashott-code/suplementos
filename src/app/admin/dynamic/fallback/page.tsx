import { prisma } from "@/lib/prisma";
import {
  getDynamicFallbackConfig,
  type DynamicFallbackConfig,
} from "@/lib/dynamicFallback";
import { saveDynamicFallbackConfig } from "./actions";

export const dynamic = "force-dynamic";
export const revalidate = 0;
const BRAZIL_TZ = "America/Sao_Paulo";

const defaultFallbackConfig: DynamicFallbackConfig = {
  fallbackEnabled: false,
  fallbackManualEnabled: false,
  fallbackAutoEnabled: true,
  fallbackAutoFailedProductsThreshold: 20,
  fallbackSource: null,
  fallbackMaxAgeHours: 24,
  fallbackReason: null,
  fallbackActivatedAt: null,
};

function formatDateTime(value?: Date | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "medium",
    timeZone: BRAZIL_TZ,
  }).format(value);
}

function formatPercent(value: number) {
  return `${Math.round(value)}%`;
}

export default async function AdminDynamicFallbackPage() {
  let config: DynamicFallbackConfig = defaultFallbackConfig;
  let metricsUnavailable = false;

  try {
    config = await getDynamicFallbackConfig();
  } catch (error) {
    metricsUnavailable = true;
    console.error("Falha ao carregar configuracao de fallback:", error);
  }

  const cutoffDate = new Date(
    Date.now() - config.fallbackMaxAgeHours * 60 * 60 * 1000
  );

  let totalProducts = 0;
  let withCurrentPrice = 0;
  let withoutCurrentPrice = 0;
  let outOfStock = 0;
  let recoverableWithWindow = 0;
  let recoverableInCrisis = 0;
  let latestRun:
    | {
        status: string;
        startedAt: Date;
        finishedAt: Date | null;
        totalOffers: number;
        updatedOffers: number;
        failedOffers: number;
        maxConsecutiveFailedOffers: number;
        outOfStockOffers: number;
        excludedOffers: number;
        errorMessage: string | null;
      }
    | null = null;

  try {
    [
      totalProducts,
      withCurrentPrice,
      withoutCurrentPrice,
      outOfStock,
      recoverableWithWindow,
      recoverableInCrisis,
      latestRun,
    ] = await Promise.all([
      prisma.dynamicProduct.count(),
      prisma.dynamicProduct.count({
        where: {
          totalPrice: { gt: 0 },
        },
      }),
      prisma.dynamicProduct.count({
        where: {
          totalPrice: { lte: 0 },
        },
      }),
      prisma.dynamicProduct.count({
        where: {
          availabilityStatus: "OUT_OF_STOCK",
        },
      }),
      prisma.dynamicProduct.count({
        where: {
          totalPrice: { lte: 0 },
          availabilityStatus: { not: "OUT_OF_STOCK" },
          lastValidPrice: { gt: 0 },
          lastValidPriceAt: { gte: cutoffDate },
        },
      }),
      prisma.dynamicProduct.count({
        where: {
          totalPrice: { lte: 0 },
          availabilityStatus: { not: "OUT_OF_STOCK" },
          lastValidPrice: { gt: 0 },
        },
      }),
      prisma.globalPriceRefreshRun.findFirst({
        orderBy: { startedAt: "desc" },
        select: {
          status: true,
          startedAt: true,
          finishedAt: true,
          totalOffers: true,
          updatedOffers: true,
          failedOffers: true,
          maxConsecutiveFailedOffers: true,
          outOfStockOffers: true,
          excludedOffers: true,
          errorMessage: true,
        },
      }),
    ]);
  } catch (error) {
    metricsUnavailable = true;
    console.error("Falha ao carregar metricas de fallback:", error);
  }

  const crisisCoverageCount = withCurrentPrice + recoverableInCrisis;
  const crisisCoveragePercent =
    totalProducts > 0 ? (crisisCoverageCount / totalProducts) * 100 : 0;

  const runFailureRate =
    latestRun && latestRun.totalOffers > 0
      ? (latestRun.failedOffers / latestRun.totalOffers) * 100
      : 0;

  return (
    <div className="min-h-screen bg-gray-50 p-8 text-black">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="rounded-3xl border border-gray-200 bg-white p-7 shadow-sm">
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-sky-700">
            Modo de crise
          </p>
          <h1 className="mt-2 text-3xl font-black text-gray-900">Fallback global de catálogo</h1>
          <p className="mt-2 max-w-4xl text-sm text-gray-600">
            Este painel controla o modo de contingência do site. Quando ativado por
            falha geral, ele preserva o último estado válido de preço e mantém
            produtos fora de estoque como fora de estoque, sem ressuscitar cards.
          </p>
        </section>

        {metricsUnavailable ? (
          <div className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Algumas métricas não puderam ser carregadas. Você ainda pode salvar a
            configuração e atualizar a página em seguida.
          </div>
        ) : null}

        <section className="grid gap-4 md:grid-cols-4">
          <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-[11px] font-black uppercase tracking-widest text-gray-400">
              Status atual
            </p>
            <p
              className={`mt-2 text-2xl font-black ${
                config.fallbackEnabled ? "text-amber-600" : "text-emerald-600"
              }`}
            >
              {config.fallbackEnabled ? "Ativado" : "Desligado"}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              Origem: {config.fallbackSource ?? "nenhuma"}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              Ativado em: {formatDateTime(config.fallbackActivatedAt)}
            </p>
          </article>

          <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-[11px] font-black uppercase tracking-widest text-gray-400">
              Cobertura em crise
            </p>
            <p className="mt-2 text-2xl font-black text-gray-900">
              {crisisCoverageCount}/{totalProducts}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              {formatPercent(crisisCoveragePercent)} do catálogo continua operando.
            </p>
          </article>

          <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-[11px] font-black uppercase tracking-widest text-gray-400">
              Preço atual válido
            </p>
            <p className="mt-2 text-2xl font-black text-gray-900">{withCurrentPrice}</p>
            <p className="mt-1 text-xs text-gray-500">
              Produtos com preço atual maior que zero.
            </p>
          </article>

          <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-[11px] font-black uppercase tracking-widest text-gray-400">
              Sem preço no momento
            </p>
            <p className="mt-2 text-2xl font-black text-gray-900">{withoutCurrentPrice}</p>
            <p className="mt-1 text-xs text-gray-500">
              Fora de estoque: {outOfStock} • recuperáveis: {recoverableInCrisis}
            </p>
          </article>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-[11px] font-black uppercase tracking-widest text-gray-400">
              Último update global
            </p>
            {latestRun ? (
              <div className="mt-2 space-y-1 text-sm text-gray-700">
                <p>
                  Status:{" "}
                  <span
                    className={`font-bold ${
                      latestRun.status === "success" ? "text-emerald-700" : "text-rose-700"
                    }`}
                  >
                    {latestRun.status}
                  </span>
                </p>
                <p>Início: {formatDateTime(latestRun.startedAt)}</p>
                <p>Fim: {formatDateTime(latestRun.finishedAt)}</p>
                <p>
                  Atualizados: {latestRun.updatedOffers}/{latestRun.totalOffers}
                </p>
                <p>
                  Falhas: {latestRun.failedOffers} ({formatPercent(runFailureRate)}) •
                  streak máxima: {latestRun.maxConsecutiveFailedOffers}
                </p>
                <p>
                  Sem estoque: {latestRun.outOfStockOffers} • Excluídos:{" "}
                  {latestRun.excludedOffers}
                </p>
                {latestRun.errorMessage ? (
                  <p className="pt-1 text-xs text-rose-700">
                    Erro: {latestRun.errorMessage}
                  </p>
                ) : null}
              </div>
            ) : (
              <p className="mt-2 text-sm text-gray-500">Sem execuções registradas.</p>
            )}
          </article>

          <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-[11px] font-black uppercase tracking-widest text-gray-400">
              Regras de recuperação
            </p>
            <div className="mt-2 space-y-1 text-sm text-gray-700">
              <p>
                Janela manual: {config.fallbackMaxAgeHours}h (recuperáveis agora:{" "}
                <span className="font-bold">{recoverableWithWindow}</span>)
              </p>
              <p>
                Em crise automática: usa último estado válido sem janela de idade.
              </p>
              <p>
                Produtos com <span className="font-semibold">OUT_OF_STOCK</span> não
                são reativados.
              </p>
              <p>
                Alerta por e-mail: enviado ao ativar/desativar fallback automático.
              </p>
            </div>
          </article>
        </section>

        <form
          action={saveDynamicFallbackConfig}
          className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm"
        >
          <div className="mb-6 flex flex-wrap items-start justify-between gap-6">
            <div>
              <h2 className="text-2xl font-black text-gray-900">Configuração operacional</h2>
              <p className="mt-1 max-w-3xl text-sm text-gray-600">
                Use override manual apenas em incidentes controlados. No dia a dia,
                mantenha o modo automático ligado para proteção em crash global.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <label className="inline-flex items-center gap-3 rounded-full border border-gray-300 bg-gray-50 px-4 py-2 text-sm font-semibold text-gray-800">
                <input
                  type="checkbox"
                  name="fallbackManualEnabled"
                  defaultChecked={config.fallbackManualEnabled}
                  className="h-4 w-4 rounded border-gray-300"
                />
                Override manual
              </label>

              <label className="inline-flex items-center gap-3 rounded-full border border-gray-300 bg-gray-50 px-4 py-2 text-sm font-semibold text-gray-800">
                <input
                  type="checkbox"
                  name="fallbackAutoEnabled"
                  defaultChecked={config.fallbackAutoEnabled}
                  className="h-4 w-4 rounded border-gray-300"
                />
                Modo automático
              </label>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-gray-700">
                Janela máxima do último preço válido (horas)
              </span>
              <input
                type="number"
                name="fallbackMaxAgeHours"
                min={1}
                max={720}
                defaultValue={config.fallbackMaxAgeHours}
                className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-gray-700">
                Streak de falhas para ativação automática
              </span>
              <input
                type="number"
                name="fallbackAutoFailedProductsThreshold"
                min={1}
                max={10000}
                defaultValue={config.fallbackAutoFailedProductsThreshold}
                className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500"
              />
            </label>
          </div>

          <div className="mt-6">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-gray-700">
                Motivo (registro operacional)
              </span>
              <input
                type="text"
                name="fallbackReason"
                defaultValue={config.fallbackReason ?? ""}
                placeholder="Ex.: incidente na API da Amazon às 12h"
                className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500"
              />
            </label>
          </div>

          <div className="mt-6 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">
            Dica operacional: após normalizar a API, rode o update global e confira
            no bloco “Último update global” se a taxa de falha voltou ao padrão.
          </div>

          <div className="mt-6 flex justify-end">
            <button
              type="submit"
              className="rounded-2xl bg-gray-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-gray-800"
            >
              Salvar configuração
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
