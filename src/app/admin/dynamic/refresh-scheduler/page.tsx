import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { schedulerConfig } from "@/lib/scheduler/scheduler.config";
import {
  forceDynamicSchedulerRefresh,
  forceTrackedSchedulerRefresh,
} from "./actions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type SchedulerSort = "next" | "recent" | "failures";

type ActionLogRow = {
  id: string;
  actionType: string;
  productSource: string;
  asin: string;
  notes: string | null;
  createdAt: Date;
};

type SchedulerTelemetryRow = {
  baseAttempts: number;
  baseSuccessful: number;
  baseChanged: number;
  baseFailed: number;
  baseBatchErrors: number;
  urgentAttempts: number;
  urgentSuccessful: number;
  urgentChanged: number;
  urgentFailed: number;
  uniqueBaseProducts: number;
};

function formatDate(value: Date | null | undefined) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(value);
}

function formatHours(minutes: number | null) {
  if (!minutes) return "Sem intervalo";
  return `${Math.round(minutes / 60)}h`;
}

function formatRate(rate: number | null) {
  return `${((rate ?? 0) * 100).toFixed(1)}%`;
}

function formatPercent(numerator: number, denominator: number) {
  if (denominator === 0) return "-";
  return `${((numerator / denominator) * 100).toFixed(1)}%`;
}

function resolveSort(value: string): SchedulerSort {
  return value === "recent" || value === "failures" ? value : "next";
}

function getStatus(params: {
  nextPriceRefreshAt: Date | null;
  refreshLockUntil: Date | null;
  refreshFailCount: number;
  now: Date;
}) {
  if (params.refreshLockUntil && params.refreshLockUntil > params.now) {
    return { label: "Em execução", classes: "bg-amber-100 text-amber-800" };
  }
  if (params.refreshFailCount > 0) {
    return { label: "Em retentativa", classes: "bg-rose-100 text-rose-800" };
  }
  if (!params.nextPriceRefreshAt || params.nextPriceRefreshAt <= params.now) {
    return { label: "Vencido", classes: "bg-orange-100 text-orange-800" };
  }
  return { label: "Agendado", classes: "bg-emerald-100 text-emerald-800" };
}

function decisionLabel(params: {
  intervalMinutes: number | null;
  validObservations: number;
  firstObservationAt: Date | null;
  changeRate30d: number | null;
  lastDecisionReason: string | null;
}) {
  const decisions: Record<string, string> = {
    bootstrap_collecting_observations: "Bootstrap: coleta de observações",
    bootstrap_stable_after_first_threshold: "Bootstrap estável: 48h",
    bootstrap_stable_after_second_threshold: "Bootstrap estável: 72h",
    bootstrap_price_changed: "Bootstrap: manteve 24h após mudança",
    change_rate_high: "Taxa de mudança alta",
    change_rate_medium: "Taxa de mudança intermediária",
    change_rate_low: "Taxa de mudança baixa",
    business_priority_supplements: "Prioridade comercial: suplementos (24h)",
  };
  if (params.lastDecisionReason && decisions[params.lastDecisionReason]) {
    return decisions[params.lastDecisionReason];
  }
  if (!params.firstObservationAt) return "Bootstrap pendente";
  if (params.validObservations < schedulerConfig.base.bootstrap.requiredValidObservations) {
    return `Bootstrap: ${params.validObservations}/${schedulerConfig.base.bootstrap.requiredValidObservations} observações`;
  }
  return `Taxa de mudança em 30d: ${formatRate(params.changeRate30d)}`;
}

function parseSearchParam(value: string | string[] | undefined) {
  return typeof value === "string" ? value : "";
}

export default async function AdminRefreshSchedulerPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const now = new Date();
  const observationCutoff = new Date(
    now.getTime() - schedulerConfig.observability.dashboardWindowHours * 60 * 60 * 1000
  );
  const learningCoverageCutoff = new Date(
    now.getTime() - schedulerConfig.observability.learningCoverageWindowDays * 24 * 60 * 60 * 1000
  );
  const fullV2HistoryCutoff = new Date(
    now.getTime() - schedulerConfig.base.historyWindowDays * 24 * 60 * 60 * 1000
  );
  const asinQuery = parseSearchParam(params?.q).trim().toUpperCase();
  const sort = resolveSort(parseSearchParam(params?.sort));
  const productWhere = {
    schedulerVersion: schedulerConfig.policyVersion,
    ...(asinQuery
      ? { asin: { contains: asinQuery, mode: "insensitive" as const } }
      : {}),
  };

  const dynamicOrderBy =
    sort === "recent"
      ? [{ lastBaseRefreshAt: "desc" as const }, { nextPriceRefreshAt: "asc" as const }]
      : sort === "failures"
        ? [{ refreshFailCount: "desc" as const }, { nextPriceRefreshAt: "asc" as const }]
        : [{ nextPriceRefreshAt: "asc" as const }, { refreshFailCount: "desc" as const }];

  const [
    products,
    totalProducts,
    dueProducts,
    lockedProducts,
    retryingProducts,
    intervalGroups,
    schedulerTelemetryRows,
    learningCoverageProducts,
    productsWithFullV2History,
    trackedProducts,
    legacyDynamicProducts,
    recentActions,
  ] = await Promise.all([
    prisma.dynamicProduct.findMany({
      where: productWhere,
      select: {
        id: true,
        asin: true,
        name: true,
        nextPriceRefreshAt: true,
        refreshLockUntil: true,
        refreshFailCount: true,
        schedulerBaseIntervalMinutes: true,
        schedulerBootstrapObservationCount: true,
        schedulerFirstBaseObservationAt: true,
        basePriceChangeRate30d: true,
        lastBaseRefreshAt: true,
        lastBaseSuccessfulRefreshAt: true,
        refreshObservations: {
          where: { reason: "base" },
          orderBy: { startedAt: "desc" },
          take: 1,
          select: { decisionReason: true, result: true, errorCode: true, finishedAt: true },
        },
      },
      orderBy: dynamicOrderBy,
      take: 80,
    }),
    prisma.dynamicProduct.count({ where: { schedulerVersion: schedulerConfig.policyVersion } }),
    prisma.dynamicProduct.count({
      where: {
        schedulerVersion: schedulerConfig.policyVersion,
        nextPriceRefreshAt: { lte: now },
        OR: [{ refreshLockUntil: null }, { refreshLockUntil: { lte: now } }],
      },
    }),
    prisma.dynamicProduct.count({
      where: { schedulerVersion: schedulerConfig.policyVersion, refreshLockUntil: { gt: now } },
    }),
    prisma.dynamicProduct.count({
      where: { schedulerVersion: schedulerConfig.policyVersion, refreshFailCount: { gt: 0 } },
    }),
    prisma.dynamicProduct.groupBy({
      by: ["schedulerBaseIntervalMinutes"],
      where: { schedulerVersion: schedulerConfig.policyVersion },
      _count: { _all: true },
    }),
    prisma.$queryRaw<SchedulerTelemetryRow[]>`
      SELECT
        COUNT(*) FILTER (WHERE "reason" = 'base')::int AS "baseAttempts",
        COUNT(*) FILTER (WHERE "reason" = 'base' AND "result" = 'success')::int AS "baseSuccessful",
        COUNT(*) FILTER (WHERE "reason" = 'base' AND "result" = 'success' AND "priceChanged" = true)::int AS "baseChanged",
        COUNT(*) FILTER (WHERE "reason" = 'base' AND "result" = 'failure')::int AS "baseFailed",
        COUNT(*) FILTER (WHERE "reason" = 'base' AND "result" = 'batch_error')::int AS "baseBatchErrors",
        COUNT(*) FILTER (WHERE "reason" = 'urgent')::int AS "urgentAttempts",
        COUNT(*) FILTER (WHERE "reason" = 'urgent' AND "result" = 'success')::int AS "urgentSuccessful",
        COUNT(*) FILTER (WHERE "reason" = 'urgent' AND "result" = 'success' AND "priceChanged" = true)::int AS "urgentChanged",
        COUNT(*) FILTER (WHERE "reason" = 'urgent' AND "result" = 'failure')::int AS "urgentFailed",
        COUNT(DISTINCT "productId") FILTER (WHERE "reason" = 'base' AND "result" = 'success')::int AS "uniqueBaseProducts"
      FROM "PriceRefreshObservation"
      WHERE "schedulerVersion" = ${schedulerConfig.policyVersion}
        AND "startedAt" >= ${observationCutoff}
    `,
    prisma.$queryRaw<Array<{ count: number }>>`
      SELECT COUNT(DISTINCT "productId")::int AS "count"
      FROM "PriceRefreshObservation"
      WHERE "schedulerVersion" = ${schedulerConfig.policyVersion}
        AND "reason" = 'base'
        AND "result" = 'success'
        AND "startedAt" >= ${learningCoverageCutoff}
    `.then((rows) => rows[0]?.count ?? 0),
    prisma.dynamicProduct.count({
      where: {
        schedulerVersion: schedulerConfig.policyVersion,
        schedulerFirstBaseObservationAt: { lte: fullV2HistoryCutoff },
      },
    }),
    prisma.siteTrackedAmazonProduct.findMany({
      where: asinQuery ? { asin: { contains: asinQuery, mode: "insensitive" } } : undefined,
      select: {
        id: true,
        asin: true,
        name: true,
        nextPriceRefreshAt: true,
        lastSuccessfulRefreshAt: true,
        refreshFailCount: true,
        refreshLockUntil: true,
      },
      orderBy: { nextPriceRefreshAt: "asc" },
      take: 20,
    }),
    prisma.dynamicProduct.count({ where: { schedulerVersion: { not: schedulerConfig.policyVersion } } }),
    prisma.$queryRaw<ActionLogRow[]>`
      SELECT "id", "actionType", "productSource", "asin", "notes", "createdAt"
      FROM "AdminSchedulerActionLog"
      ORDER BY "createdAt" DESC
      LIMIT 12
    `,
  ]);

  const intervalCounts = new Map(
    intervalGroups.map((group) => [group.schedulerBaseIntervalMinutes ?? 0, group._count._all])
  );
  const telemetry: SchedulerTelemetryRow = schedulerTelemetryRows[0] ?? {
    baseAttempts: 0,
    baseSuccessful: 0,
    baseChanged: 0,
    baseFailed: 0,
    baseBatchErrors: 0,
    urgentAttempts: 0,
    urgentSuccessful: 0,
    urgentChanged: 0,
    urgentFailed: 0,
    uniqueBaseProducts: 0,
  };
  const failedObservations = telemetry.baseFailed + telemetry.baseBatchErrors + telemetry.urgentFailed;

  return (
    <div className="min-h-screen bg-[#f6f7f2] p-5 text-slate-950 md:p-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-7 border-b-4 border-slate-950 pb-6">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-700">
                Operação · Scheduler V2 ativo
              </p>
              <h1 className="mt-2 font-serif text-4xl font-black tracking-tight text-slate-950 md:text-5xl">
                Agenda de preços
              </h1>
              <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-600">
                A página mostra a decisão real do comparador: intervalo, próximo vencimento,
                bootstrap, falhas e execução. Não há score ou tier artificial na V2.
              </p>
            </div>
            <Link
              href="/admin/dynamic"
              className="inline-flex items-center justify-center border-2 border-slate-950 bg-white px-4 py-2 text-[10px] font-black uppercase tracking-widest transition hover:bg-slate-950 hover:text-white"
            >
              Voltar ao painel
            </Link>
          </div>
        </header>

        <section className="mb-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Metric label="Produtos V2" value={totalProducts} detail={`${legacyDynamicProducts} fora da V2`} tone="slate" />
          <Metric label="Vencidos" value={dueProducts} detail="base, sem lock ativo" tone="orange" />
          <Metric label="Em execução" value={lockedProducts} detail="locks válidos agora" tone="amber" />
          <Metric label="Em retentativa" value={retryingProducts} detail="falha individual / sem estoque" tone="rose" />
          <Metric label={`Observações ${schedulerConfig.observability.dashboardWindowHours}h`} value={telemetry.baseAttempts + telemetry.urgentAttempts} detail={`${telemetry.baseAttempts} base · ${telemetry.urgentAttempts} urgentes`} tone="emerald" />
        </section>

        <section className="mb-7 grid gap-3 md:grid-cols-4">
          <IntervalCard label="Agenda 24h" count={intervalCounts.get(schedulerConfig.base.intervals.dailyMinutes) ?? 0} accent="border-emerald-500" />
          <IntervalCard label="Agenda 48h" count={intervalCounts.get(schedulerConfig.base.intervals.everyTwoDaysMinutes) ?? 0} accent="border-sky-500" />
          <IntervalCard label="Agenda 72h" count={intervalCounts.get(schedulerConfig.base.intervals.everyThreeDaysMinutes) ?? 0} accent="border-slate-500" />
          <IntervalCard label={`Falhas ${schedulerConfig.observability.dashboardWindowHours}h`} count={failedObservations} accent="border-rose-500" />
        </section>

        <section className="mb-7 overflow-hidden border border-slate-200 bg-white shadow-[6px_6px_0_#0f172a]">
          <div className="border-b border-slate-200 bg-[#e6eadc] px-5 py-4">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-700">Ledger de observações</p>
            <h2 className="mt-1 font-serif text-2xl font-black">O que o scheduler está aprendendo</h2>
            <p className="mt-1 text-xs font-medium text-slate-600">
              Indicadores calculados somente a partir das tentativas reais. A agenda continua inalterada.
            </p>
          </div>
          <div className="grid divide-y divide-slate-200 sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-5">
            <LedgerMetric label="Sucesso base" value={formatPercent(telemetry.baseSuccessful, telemetry.baseAttempts)} detail={`${telemetry.baseSuccessful}/${telemetry.baseAttempts} tentativas concluídas`} tone="emerald" />
            <LedgerMetric label="Mudou de preço" value={formatPercent(telemetry.baseChanged, telemetry.baseSuccessful)} detail={`${telemetry.baseChanged} alterações entre refreshes-base`} tone="sky" />
            <LedgerMetric label="Cobertura recente" value={formatPercent(learningCoverageProducts, totalProducts)} detail={`${learningCoverageProducts}/${totalProducts} produtos com base em ${schedulerConfig.observability.learningCoverageWindowDays}d`} tone="slate" />
            <LedgerMetric label="Janela V2 completa" value={formatPercent(productsWithFullV2History, totalProducts)} detail={`${productsWithFullV2History}/${totalProducts} com ${schedulerConfig.base.historyWindowDays}d de dados V2`} tone="amber" />
            <LedgerMetric label="Fila urgente" value={String(telemetry.urgentAttempts)} detail={`${telemetry.urgentChanged} mudanças · ${telemetry.urgentFailed} falhas`} tone="rose" />
          </div>
          {(telemetry.baseBatchErrors > 0 || telemetry.baseFailed > 0) && (
            <div className="border-t border-rose-200 bg-rose-50 px-5 py-3 text-xs font-semibold text-rose-800">
              Falhas-base na janela: {telemetry.baseFailed} individuais · {telemetry.baseBatchErrors} de lote. Falha de lote não aumenta o backoff dos produtos.
            </div>
          )}
        </section>

        <section className="mb-5 flex flex-col gap-3 border border-slate-200 bg-white p-4 shadow-[4px_4px_0_#0f172a] md:flex-row md:items-center md:justify-between">
          <form action="/admin/dynamic/refresh-scheduler" className="flex flex-col gap-2 sm:flex-row">
            <input
              name="q"
              defaultValue={asinQuery}
              placeholder="Buscar ASIN"
              className="h-10 min-w-56 border border-slate-300 bg-slate-50 px-3 text-sm font-semibold outline-none focus:border-slate-950"
            />
            <select name="sort" defaultValue={sort} className="h-10 border border-slate-300 bg-white px-3 text-sm font-bold">
              <option value="next">Próximos vencimentos</option>
              <option value="recent">Últimas execuções</option>
              <option value="failures">Falhas primeiro</option>
            </select>
            <button className="h-10 bg-slate-950 px-4 text-[10px] font-black uppercase tracking-widest text-white hover:bg-slate-700">
              Aplicar
            </button>
          </form>
          <p className="text-xs font-semibold text-slate-500">
            “Solicitar agora” usa a fila urgente e preserva a próxima agenda-base.
          </p>
        </section>

        <section className="overflow-hidden border border-slate-200 bg-white shadow-[6px_6px_0_#0f172a]">
          <div className="border-b border-slate-200 bg-slate-950 px-5 py-4 text-white">
            <h2 className="font-serif text-xl font-black">Comparador · scheduler V2</h2>
            <p className="mt-1 text-xs font-medium text-slate-300">{products.length} produtos exibidos</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-[1180px] w-full text-left text-sm">
              <thead className="bg-[#e6eadc] text-[10px] font-black uppercase tracking-widest text-slate-600">
                <tr>
                  <th className="p-4">Produto</th><th className="p-4">Estado</th><th className="p-4">Regra</th><th className="p-4">Próximo refresh</th><th className="p-4">Última base</th><th className="p-4">Mudanças 30d</th><th className="p-4">Falhas</th><th className="p-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.length === 0 ? (
                  <tr><td colSpan={8} className="p-10 text-center font-semibold text-slate-400">Nenhum produto V2 encontrado.</td></tr>
                ) : products.map((product) => {
                  const observation = product.refreshObservations[0];
                  const status = getStatus({ ...product, refreshFailCount: product.refreshFailCount ?? 0, now });
                  return (
                    <tr key={product.id} className="hover:bg-[#fbfcf8]">
                      <td className="p-4"><div className="max-w-72 font-bold text-slate-950">{product.name}</div><div className="mt-1 font-mono text-[11px] text-slate-500">{product.asin}</div></td>
                      <td className="p-4"><span className={`inline-flex px-2 py-1 text-[10px] font-black uppercase tracking-wider ${status.classes}`}>{status.label}</span>{observation?.errorCode && <div className="mt-2 max-w-36 text-[10px] font-bold text-rose-700">{observation.errorCode}</div>}</td>
                      <td className="p-4"><div className="font-black text-slate-900">{(product.refreshFailCount ?? 0) > 0 ? "Backoff" : formatHours(product.schedulerBaseIntervalMinutes)}</div><div className="mt-1 max-w-60 text-xs font-medium leading-4 text-slate-500">{(product.refreshFailCount ?? 0) > 0 ? `${product.refreshFailCount} falhas consecutivas. Base após sucesso: ${formatHours(product.schedulerBaseIntervalMinutes)}.` : decisionLabel({ intervalMinutes: product.schedulerBaseIntervalMinutes, validObservations: product.schedulerBootstrapObservationCount, firstObservationAt: product.schedulerFirstBaseObservationAt, changeRate30d: product.basePriceChangeRate30d, lastDecisionReason: observation?.decisionReason ?? null })}</div></td>
                      <td className="p-4 font-bold text-slate-800">{formatDate(product.nextPriceRefreshAt)}</td>
                      <td className="p-4 text-xs font-semibold text-slate-600">{formatDate(product.lastBaseSuccessfulRefreshAt ?? product.lastBaseRefreshAt)}</td>
                      <td className="p-4 font-black text-slate-800">{formatRate(product.basePriceChangeRate30d)}</td>
                      <td className="p-4 font-black text-rose-700">{product.refreshFailCount ?? 0}</td>
                      <td className="p-4 text-right"><form action={forceDynamicSchedulerRefresh}><input type="hidden" name="productId" value={product.id} /><button className="border border-emerald-700 bg-emerald-50 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-emerald-800 hover:bg-emerald-100">Solicitar agora</button></form></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <LegacyTrackedTable products={trackedProducts} now={now} />
          <RecentActions actions={recentActions} />
        </section>
      </div>
    </div>
  );
}

function Metric({ label, value, detail, tone }: { label: string; value: number; detail: string; tone: "slate" | "orange" | "amber" | "rose" | "emerald" }) {
  const colors = { slate: "text-slate-950", orange: "text-orange-700", amber: "text-amber-700", rose: "text-rose-700", emerald: "text-emerald-700" };
  return <div className="border border-slate-200 bg-white p-4"><div className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</div><div className={`mt-1 text-3xl font-black ${colors[tone]}`}>{value.toLocaleString("pt-BR")}</div><div className="mt-2 text-xs font-semibold text-slate-500">{detail}</div></div>;
}

function IntervalCard({ label, count, accent }: { label: string; count: number; accent: string }) {
  return <div className={`border-l-4 ${accent} bg-white p-4 shadow-sm`}><div className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</div><div className="mt-1 text-2xl font-black text-slate-950">{count.toLocaleString("pt-BR")}</div></div>;
}

function LedgerMetric({ label, value, detail, tone }: { label: string; value: string; detail: string; tone: "emerald" | "sky" | "slate" | "amber" | "rose" }) {
  const colors = { emerald: "text-emerald-700", sky: "text-sky-700", slate: "text-slate-950", amber: "text-amber-700", rose: "text-rose-700" };
  return <div className="min-h-32 p-5"><div className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</div><div className={`mt-2 text-3xl font-black ${colors[tone]}`}>{value}</div><div className="mt-2 text-xs font-semibold leading-5 text-slate-500">{detail}</div></div>;
}

function LegacyTrackedTable({ products, now }: { products: Array<{ id: string; asin: string; name: string; nextPriceRefreshAt: Date | null; lastSuccessfulRefreshAt: Date | null; refreshFailCount: number | null; refreshLockUntil: Date | null }>; now: Date }) {
  return <div className="overflow-hidden border border-slate-200 bg-white"><div className="border-b border-slate-200 bg-slate-100 px-5 py-4"><h2 className="font-serif text-xl font-black">Amazon interno · legado</h2><p className="mt-1 text-xs font-medium text-slate-500">Mantido separado; ainda não usa a política V2.</p></div><div className="max-h-[430px] overflow-auto"><table className="min-w-[620px] w-full text-left text-xs"><thead className="sticky top-0 bg-white text-[10px] font-black uppercase tracking-widest text-slate-500"><tr><th className="p-3">Produto</th><th className="p-3">Próximo</th><th className="p-3">Falhas</th><th className="p-3" /></tr></thead><tbody className="divide-y divide-slate-100">{products.map((product) => <tr key={product.id}><td className="p-3"><div className="max-w-52 font-bold">{product.name}</div><div className="font-mono text-[10px] text-slate-400">{product.asin}</div></td><td className="p-3 font-semibold">{formatDate(product.nextPriceRefreshAt)}</td><td className="p-3 font-black text-rose-700">{product.refreshFailCount ?? 0}</td><td className="p-3 text-right"><form action={forceTrackedSchedulerRefresh}><input type="hidden" name="trackedProductId" value={product.id} /><button className="border border-slate-400 px-2 py-1 text-[9px] font-black uppercase tracking-wider hover:bg-slate-100">Forçar ciclo</button></form></td></tr>)}</tbody></table></div></div>;
}

function RecentActions({ actions }: { actions: ActionLogRow[] }) {
  return <div className="overflow-hidden border border-slate-200 bg-white"><div className="border-b border-slate-200 bg-slate-100 px-5 py-4"><h2 className="font-serif text-xl font-black">Auditoria manual</h2><p className="mt-1 text-xs font-medium text-slate-500">Últimas solicitações feitas no painel.</p></div><div className="max-h-[430px] overflow-auto divide-y divide-slate-100">{actions.length === 0 ? <p className="p-8 text-center text-sm font-semibold text-slate-400">Nenhuma ação registrada.</p> : actions.map((action) => <div key={action.id} className="p-4"><div className="flex items-center justify-between gap-3"><span className="text-[10px] font-black uppercase tracking-wider text-slate-700">{action.actionType === "request_refresh_now" ? "Solicitação urgente" : action.actionType === "force_refresh_now" ? "Forçar refresh" : "Ação manual"}</span><span className="text-[10px] font-semibold text-slate-400">{formatDate(action.createdAt)}</span></div><div className="mt-1 font-mono text-xs font-bold text-slate-900">{action.asin}</div><div className="mt-1 text-xs text-slate-500">{action.notes ?? "-"}</div></div>)}</div></div>;
}
