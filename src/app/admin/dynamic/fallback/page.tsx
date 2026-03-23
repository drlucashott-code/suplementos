import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  getDynamicFallbackConfig,
  type DynamicFallbackConfig,
} from "@/lib/dynamicFallback";
import { saveDynamicFallbackConfig } from "./actions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type FallbackEligibleRow = {
  count: bigint;
};

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

  let zeroPriceCount = 0;
  let eligibleCount = 0;

  try {
    const [zeroPriceResult, eligibleRows] = await Promise.all([
      prisma.dynamicProduct.count({
        where: {
          totalPrice: {
            lte: 0,
          },
        },
      }),
      prisma.$queryRaw<FallbackEligibleRow[]>(Prisma.sql`
        SELECT COUNT(*)::bigint AS "count"
        FROM "DynamicProduct"
        WHERE
          "totalPrice" <= 0
          AND COALESCE("availabilityStatus", 'UNKNOWN') <> 'OUT_OF_STOCK'
          AND "lastValidPrice" > 0
          AND "lastValidPriceAt" >= ${cutoffDate}
      `),
    ]);

    zeroPriceCount = zeroPriceResult;
    eligibleCount = Number(eligibleRows[0]?.count ?? 0);
  } catch (error) {
    metricsUnavailable = true;
    console.error("Falha ao carregar metricas de fallback:", error);
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8 text-black">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-black text-gray-900">Fallback de Precos</h1>
          <p className="mt-2 text-sm text-gray-600">
            Controle global do fallback no site dinamico. Ele so usa o ultimo preco
            valido recente e nunca reativa produto marcado como fora de estoque.
          </p>
        </div>

        {metricsUnavailable ? (
          <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Algumas metricas nao puderam ser carregadas agora. A pagina continua
            acessivel e voce pode tentar atualizar em instantes.
          </div>
        ) : null}

        <div className="mb-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-[11px] font-black uppercase tracking-widest text-gray-400">
              Status
            </p>
            <p
              className={`mt-2 text-xl font-black ${
                config.fallbackEnabled ? "text-amber-600" : "text-emerald-600"
              }`}
            >
              {config.fallbackEnabled ? "Ativo" : "Desligado"}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              {config.fallbackActivatedAt
                ? `Ativado em ${config.fallbackActivatedAt.toLocaleString("pt-BR")}`
                : "Sem ativacao registrada"}
            </p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Origem: {config.fallbackSource ?? "nenhuma"}
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-[11px] font-black uppercase tracking-widest text-gray-400">
              Produtos zerados
            </p>
            <p className="mt-2 text-xl font-black text-gray-900">{zeroPriceCount}</p>
            <p className="mt-1 text-xs text-gray-500">
              Total com preco atual menor ou igual a zero.
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-[11px] font-black uppercase tracking-widest text-gray-400">
              Elegiveis no fallback
            </p>
            <p className="mt-2 text-xl font-black text-gray-900">{eligibleCount}</p>
            <p className="mt-1 text-xs text-gray-500">
              Com ultimo preco valido dentro da janela de {config.fallbackMaxAgeHours}h.
            </p>
          </div>
        </div>

        <form action={saveDynamicFallbackConfig} className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
          <div className="mb-6 flex items-start justify-between gap-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Configuracao</h2>
              <p className="mt-1 text-sm text-gray-500">
                O fallback pode ser ligado manualmente ou automaticamente quando a
                rotina tiver falha geral consecutiva.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <label className="inline-flex items-center gap-3 rounded-full border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-semibold text-gray-700">
                <input
                  type="checkbox"
                  name="fallbackManualEnabled"
                  defaultChecked={config.fallbackManualEnabled}
                  className="h-4 w-4 rounded border-gray-300"
                />
                Override manual
              </label>

              <label className="inline-flex items-center gap-3 rounded-full border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-semibold text-gray-700">
                <input
                  type="checkbox"
                  name="fallbackAutoEnabled"
                  defaultChecked={config.fallbackAutoEnabled}
                  className="h-4 w-4 rounded border-gray-300"
                />
                Modo automatico
              </label>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-gray-700">
                Janela maxima do ultimo preco valido (horas)
              </span>
              <input
                type="number"
                name="fallbackMaxAgeHours"
                min={1}
                max={168}
                defaultValue={config.fallbackMaxAgeHours}
                className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-gray-700">
                Falhas consecutivas no update global para ativacao automatica
              </span>
              <input
                type="number"
                name="fallbackAutoFailedProductsThreshold"
                min={1}
                max={5000}
                defaultValue={config.fallbackAutoFailedProductsThreshold}
                className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500"
              />
            </label>
          </div>

          <div className="mt-6">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-gray-700">
                Motivo
              </span>
              <input
                type="text"
                name="fallbackReason"
                defaultValue={config.fallbackReason ?? ""}
                placeholder="Ex.: falha geral na atualizacao das 12h"
                className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500"
              />
            </label>
          </div>

          <div className="mt-6 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">
            Regra atual: o modo automatico ativa quando o ultimo update global
            registrar pelo menos{" "}
            {config.fallbackAutoFailedProductsThreshold} produtos com falha.
            Quando o update global voltar saudavel, ele desativa. Emails de alerta
            sao enviados sempre que o fallback ativar ou desativar.
          </div>

          <div className="mt-6 flex justify-end">
            <button
              type="submit"
              className="rounded-2xl bg-gray-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-gray-800"
            >
              Salvar configuracao
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
