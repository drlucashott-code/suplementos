import Link from "next/link";
import { prisma } from "@/lib/prisma";
import {
  boostDynamicSchedulerProduct,
  boostTrackedSchedulerProduct,
  forceDynamicSchedulerRefresh,
  forceTrackedSchedulerRefresh,
} from "./actions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type SchedulerRow = {
  id: string;
  source: "dynamic" | "tracked";
  asin: string;
  name: string;
  refreshTier: string | null;
  priorityScore: number | null;
  dataFreshnessScore: number | null;
  nextPriceRefreshAt: Date | null;
  lastSuccessfulRefreshAt: Date | null;
  lastPriceRefreshAt: Date | null;
  lastRefreshAttemptAt: Date | null;
  refreshFailCount: number | null;
  refreshLockUntil: Date | null;
  monitorCount: number;
};

type ActionLogRow = {
  id: string;
  actor: string;
  actionType: string;
  productSource: string;
  asin: string;
  notes: string | null;
  createdAt: Date;
};

function formatDate(value: Date | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("pt-BR");
}

function getRefreshTimingLabel(value: Date | null, now: Date) {
  if (!value) {
    return {
      label: "Sem agenda",
      value: "—",
    };
  }

  if (value.getTime() <= now.getTime()) {
    return {
      label: "Elegível desde",
      value: formatDate(value),
    };
  }

  return {
    label: "Próximo refresh",
    value: formatDate(value),
  };
}

function getLastRefreshLabel(row: Pick<SchedulerRow, "lastSuccessfulRefreshAt" | "lastPriceRefreshAt" | "lastRefreshAttemptAt">) {
  if (row.lastSuccessfulRefreshAt) {
    return {
      label: "Último sucesso",
      value: formatDate(row.lastSuccessfulRefreshAt),
    };
  }

  if (row.lastPriceRefreshAt) {
    return {
      label: "Último refresh",
      value: formatDate(row.lastPriceRefreshAt),
    };
  }

  if (row.lastRefreshAttemptAt) {
    return {
      label: "Última tentativa",
      value: formatDate(row.lastRefreshAttemptAt),
    };
  }

  return {
    label: "Sem histórico",
    value: "—",
  };
}

function formatScore(value: number | null) {
  if (typeof value !== "number" || Number.isNaN(value)) return "0.0";
  return value.toFixed(1);
}

function getTierClasses(tier: string | null) {
  if (tier === "hot") return "bg-red-100 text-red-700";
  if (tier === "warm") return "bg-amber-100 text-amber-700";
  return "bg-sky-100 text-sky-700";
}

function sourceLabel(source: SchedulerRow["source"]) {
  return source === "dynamic" ? "Comparador" : "Amazon interno";
}

export default async function AdminRefreshSchedulerPage() {
  const now = new Date();

  const [
    dynamicProducts,
    trackedProducts,
    dynamicDueCount,
    trackedDueCount,
    hotCount,
    warmCount,
    coldCount,
    recentActions,
  ] = await Promise.all([
    prisma.dynamicProduct.findMany({
      select: {
        id: true,
        asin: true,
        name: true,
        refreshTier: true,
        priorityScore: true,
        dataFreshnessScore: true,
        nextPriceRefreshAt: true,
        lastSuccessfulRefreshAt: true,
        lastPriceRefreshAt: true,
        lastRefreshAttemptAt: true,
        refreshFailCount: true,
        refreshLockUntil: true,
      },
      orderBy: [
        { dataFreshnessScore: "desc" },
        { priorityScore: "desc" },
        { nextPriceRefreshAt: "asc" },
      ],
      take: 40,
    }),
    prisma.siteTrackedAmazonProduct.findMany({
      select: {
        id: true,
        asin: true,
        name: true,
        refreshTier: true,
        priorityScore: true,
        dataFreshnessScore: true,
        nextPriceRefreshAt: true,
        lastSuccessfulRefreshAt: true,
        lastPriceRefreshAt: true,
        lastRefreshAttemptAt: true,
        refreshFailCount: true,
        refreshLockUntil: true,
        monitorCount: true,
      },
      orderBy: [
        { dataFreshnessScore: "desc" },
        { priorityScore: "desc" },
        { nextPriceRefreshAt: "asc" },
      ],
      take: 40,
    }),
    prisma.dynamicProduct.count({
      where: {
        AND: [
          {
            OR: [{ refreshLockUntil: null }, { refreshLockUntil: { lte: now } }],
          },
          {
            OR: [{ nextPriceRefreshAt: null }, { nextPriceRefreshAt: { lte: now } }],
          },
        ],
      },
    }),
    prisma.siteTrackedAmazonProduct.count({
      where: {
        AND: [
          {
            OR: [{ refreshLockUntil: null }, { refreshLockUntil: { lte: now } }],
          },
          {
            OR: [{ nextPriceRefreshAt: null }, { nextPriceRefreshAt: { lte: now } }],
          },
        ],
      },
    }),
    prisma.$transaction([
      prisma.dynamicProduct.count({ where: { refreshTier: "hot" } }),
      prisma.siteTrackedAmazonProduct.count({ where: { refreshTier: "hot" } }),
    ]).then(([dynamic, tracked]) => dynamic + tracked),
    prisma.$transaction([
      prisma.dynamicProduct.count({ where: { refreshTier: "warm" } }),
      prisma.siteTrackedAmazonProduct.count({ where: { refreshTier: "warm" } }),
    ]).then(([dynamic, tracked]) => dynamic + tracked),
    prisma.$transaction([
      prisma.dynamicProduct.count({ where: { refreshTier: "cold" } }),
      prisma.siteTrackedAmazonProduct.count({ where: { refreshTier: "cold" } }),
    ]).then(([dynamic, tracked]) => dynamic + tracked),
    prisma.$queryRaw<ActionLogRow[]>`
      SELECT
        "id",
        "actor",
        "actionType",
        "productSource",
        "asin",
        "notes",
        "createdAt"
      FROM "AdminSchedulerActionLog"
      ORDER BY "createdAt" DESC
      LIMIT 12
    `,
  ]);

  const rows: SchedulerRow[] = [
    ...dynamicProducts.map((product: Omit<SchedulerRow, "source" | "monitorCount">) => ({
      ...product,
      source: "dynamic" as const,
      monitorCount: 0,
    })),
    ...trackedProducts.map((product: Omit<SchedulerRow, "source">) => ({
      ...product,
      source: "tracked" as const,
    })),
  ]
    .sort((a, b) => {
      const freshness = (b.dataFreshnessScore ?? 0) - (a.dataFreshnessScore ?? 0);
      if (Math.abs(freshness) > 0.001) return freshness;
      const priority = (b.priorityScore ?? 0) - (a.priorityScore ?? 0);
      if (Math.abs(priority) > 0.001) return priority;
      return (a.nextPriceRefreshAt?.getTime() ?? 0) - (b.nextPriceRefreshAt?.getTime() ?? 0);
    })
    .slice(0, 60);

  return (
    <div className="min-h-screen bg-gray-50/30 p-8 text-black">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">
                Observabilidade
              </span>
            </div>
            <h1 className="text-4xl font-black tracking-tight text-gray-900">
              REFRESH SCHEDULER
            </h1>
            <p className="mt-1 text-sm font-medium text-gray-500">
              Leitura operacional da fila inteligente: urgencia, score, tier e travas.
            </p>
          </div>

          <div className="flex gap-3">
            <Link
              href="/admin/dynamic"
              className="rounded-2xl border border-gray-200 bg-white px-5 py-3 text-[10px] font-black uppercase tracking-widest text-gray-500 shadow-sm transition-all hover:text-black"
            >
              ← Painel dinâmico
            </Link>
          </div>
        </div>

        <div className="mb-6 grid gap-3 md:grid-cols-5">
          <div className="rounded-2xl border border-gray-100 bg-white px-5 py-4 shadow-sm">
            <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">
              Vencidos agora
            </div>
            <div className="mt-1 text-3xl font-black text-gray-900">
              {dynamicDueCount + trackedDueCount}
            </div>
            <div className="mt-2 text-xs font-semibold text-gray-500">
              Comparador {dynamicDueCount} • Amazon interno {trackedDueCount}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white px-5 py-4 shadow-sm">
            <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">
              Tier hot
            </div>
            <div className="mt-1 text-3xl font-black text-red-600">{hotCount}</div>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white px-5 py-4 shadow-sm">
            <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">
              Tier warm
            </div>
            <div className="mt-1 text-3xl font-black text-amber-600">{warmCount}</div>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white px-5 py-4 shadow-sm">
            <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">
              Tier cold
            </div>
            <div className="mt-1 text-3xl font-black text-sky-600">{coldCount}</div>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white px-5 py-4 shadow-sm">
            <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">
              Linhas exibidas
            </div>
            <div className="mt-1 text-3xl font-black text-gray-900">{rows.length}</div>
          </div>
        </div>

        <div className="overflow-hidden rounded-[2rem] border border-gray-100 bg-white shadow-xl shadow-gray-200/50">
          <div className="overflow-x-auto">
            <table className="min-w-[1260px] w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-[10px] font-black uppercase tracking-widest text-gray-400">
                  <th className="p-4 text-black">Produto</th>
                  <th className="p-4 text-center text-black">Origem</th>
                  <th className="p-4 text-center text-black">Tier</th>
                  <th className="p-4 text-center text-black">Priority</th>
                  <th className="p-4 text-center text-black">Urgência</th>
                  <th className="p-4 text-center text-black">Janela de refresh</th>
                  <th className="p-4 text-center text-black">Último refresh</th>
                  <th className="p-4 text-center text-black">Falhas</th>
                  <th className="p-4 text-center text-black">Lock</th>
                  <th className="p-4 text-center text-black">Monitores</th>
                  <th className="p-4 text-center text-black">Ações</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-50">
                {rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={11}
                      className="p-10 text-center text-sm font-semibold text-gray-400"
                    >
                      Nenhum item encontrado no scheduler.
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => {
                    const lockActive =
                      row.refreshLockUntil && row.refreshLockUntil.getTime() > now.getTime();
                    const refreshTiming = getRefreshTimingLabel(row.nextPriceRefreshAt, now);
                    const lastRefresh = getLastRefreshLabel(row);

                    return (
                      <tr key={`${row.source}:${row.id}`} className="transition-colors hover:bg-gray-50/50">
                        <td className="p-4">
                          <div className="max-w-[360px] text-[13px] font-bold text-gray-900">
                            {row.name}
                          </div>
                          <div className="mt-1 text-[10px] font-bold uppercase tracking-wide text-gray-400">
                            {row.asin}
                          </div>
                        </td>
                        <td className="p-4 text-center text-[12px] font-black text-gray-700">
                          {sourceLabel(row.source)}
                        </td>
                        <td className="p-4 text-center">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest ${getTierClasses(
                              row.refreshTier
                            )}`}
                          >
                            {row.refreshTier ?? "cold"}
                          </span>
                        </td>
                        <td className="p-4 text-center text-lg font-black text-gray-900">
                          {formatScore(row.priorityScore)}
                        </td>
                        <td className="p-4 text-center text-lg font-black text-gray-900">
                          {formatScore(row.dataFreshnessScore)}
                        </td>
                        <td className="p-4 text-center">
                          <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                            {refreshTiming.label}
                          </div>
                          <div className="mt-1 text-[12px] font-black text-gray-700">
                            {refreshTiming.value}
                          </div>
                        </td>
                        <td className="p-4 text-center">
                          <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                            {lastRefresh.label}
                          </div>
                          <div className="mt-1 text-[12px] font-black text-gray-700">
                            {lastRefresh.value}
                          </div>
                        </td>
                        <td className="p-4 text-center text-lg font-black text-red-600">
                          {row.refreshFailCount ?? 0}
                        </td>
                        <td className="p-4 text-center">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest ${
                              lockActive
                                ? "bg-orange-100 text-orange-700"
                                : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {lockActive ? "Ativo" : "Livre"}
                          </span>
                        </td>
                        <td className="p-4 text-center text-lg font-black text-gray-900">
                          {row.monitorCount}
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex flex-col items-center gap-2">
                            <form
                              action={
                                row.source === "dynamic"
                                  ? forceDynamicSchedulerRefresh
                                  : forceTrackedSchedulerRefresh
                              }
                            >
                              {row.source === "dynamic" ? (
                                <input type="hidden" name="productId" value={row.id} />
                              ) : (
                                <input type="hidden" name="trackedProductId" value={row.id} />
                              )}
                              <button
                                type="submit"
                                className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-blue-700 transition-all hover:bg-blue-100"
                              >
                                Forçar agora
                              </button>
                            </form>
                            <form
                              action={
                                row.source === "dynamic"
                                  ? boostDynamicSchedulerProduct
                                  : boostTrackedSchedulerProduct
                              }
                            >
                              {row.source === "dynamic" ? (
                                <input type="hidden" name="productId" value={row.id} />
                              ) : (
                                <input type="hidden" name="trackedProductId" value={row.id} />
                              )}
                              <button
                                type="submit"
                                className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-700 transition-all hover:bg-emerald-100"
                              >
                                Boost manual
                              </button>
                            </form>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-8 overflow-hidden rounded-[2rem] border border-gray-100 bg-white shadow-xl shadow-gray-200/50">
          <div className="border-b border-gray-100 bg-gray-50 px-6 py-4">
            <h2 className="text-lg font-black text-gray-900">Últimas ações manuais</h2>
            <p className="mt-1 text-sm font-medium text-gray-500">
              Auditoria rápida de boost e forçar refresh disparados no admin.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-[840px] w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-gray-100 bg-white text-[10px] font-black uppercase tracking-widest text-gray-400">
                  <th className="p-4 text-black">Quando</th>
                  <th className="p-4 text-black">Ação</th>
                  <th className="p-4 text-black">Origem</th>
                  <th className="p-4 text-black">ASIN</th>
                  <th className="p-4 text-black">Actor</th>
                  <th className="p-4 text-black">Notas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recentActions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-sm font-semibold text-gray-400">
                      Nenhuma ação manual registrada ainda.
                    </td>
                  </tr>
                ) : (
                  recentActions.map((action: ActionLogRow) => (
                    <tr key={action.id} className="transition-colors hover:bg-gray-50/50">
                      <td className="p-4 text-[12px] font-black text-gray-700">
                        {formatDate(action.createdAt)}
                      </td>
                      <td className="p-4">
                        <span className="inline-flex rounded-full bg-gray-100 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-gray-700">
                          {action.actionType === "force_refresh_now" ? "Forçar agora" : "Boost manual"}
                        </span>
                      </td>
                      <td className="p-4 text-[12px] font-black text-gray-700">
                        {action.productSource === "dynamic" ? "Comparador" : "Amazon interno"}
                      </td>
                      <td className="p-4 text-[12px] font-black text-gray-900">{action.asin}</td>
                      <td className="p-4 text-[12px] font-black text-gray-700">{action.actor}</td>
                      <td className="p-4 text-sm font-medium text-gray-500">{action.notes ?? "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
