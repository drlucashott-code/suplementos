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
  updatesLast24h: number;
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

type SchedulerSort = "priority" | "updated";

function formatDate(value: Date | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "medium",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

function formatScore(value: number | null) {
  if (typeof value !== "number" || Number.isNaN(value)) return "0.0";
  return value.toFixed(1);
}

function getRefreshTimingLabel(value: Date | null, now: Date) {
  if (!value) {
    return {
      label: "Sem agenda",
      value: "-",
    };
  }

  if (value.getTime() <= now.getTime()) {
    return {
      label: "Elegivel desde",
      value: formatDate(value),
    };
  }

  return {
    label: "Proximo refresh",
    value: formatDate(value),
  };
}

function getLastRefreshLabel(
  row: Pick<
    SchedulerRow,
    "lastSuccessfulRefreshAt" | "lastPriceRefreshAt" | "lastRefreshAttemptAt"
  >
) {
  if (row.lastSuccessfulRefreshAt) {
    return {
      label: "Ultimo sucesso",
      value: formatDate(row.lastSuccessfulRefreshAt),
    };
  }

  if (row.lastPriceRefreshAt) {
    return {
      label: "Ultimo refresh",
      value: formatDate(row.lastPriceRefreshAt),
    };
  }

  if (row.lastRefreshAttemptAt) {
    return {
      label: "Ultima tentativa",
      value: formatDate(row.lastRefreshAttemptAt),
    };
  }

  return {
    label: "Sem historico",
    value: "-",
  };
}

function isMandatoryDue(
  row: Pick<SchedulerRow, "lastSuccessfulRefreshAt">,
  mandatoryCutoff: Date
) {
  return (
    !row.lastSuccessfulRefreshAt ||
    row.lastSuccessfulRefreshAt.getTime() <= mandatoryCutoff.getTime()
  );
}

function isPriorityDue(
  row: Pick<SchedulerRow, "nextPriceRefreshAt" | "lastSuccessfulRefreshAt">,
  now: Date,
  mandatoryCutoff: Date
) {
  if (isMandatoryDue(row, mandatoryCutoff)) return false;
  return !row.nextPriceRefreshAt || row.nextPriceRefreshAt.getTime() <= now.getTime();
}

function getTierClasses(tier: string | null) {
  if (tier === "hot") return "bg-red-100 text-red-700";
  if (tier === "warm") return "bg-amber-100 text-amber-700";
  return "bg-sky-100 text-sky-700";
}

function getTierRank(tier: string | null) {
  if (tier === "hot") return 3;
  if (tier === "warm") return 2;
  return 1;
}

function sourceLabel(source: SchedulerRow["source"]) {
  return source === "dynamic" ? "Comparador" : "Amazon interno";
}

function getUpdatedAtTimestamp(row: Pick<
  SchedulerRow,
  "lastPriceRefreshAt" | "lastSuccessfulRefreshAt"
>) {
  return (
    row.lastPriceRefreshAt?.getTime() ??
    row.lastSuccessfulRefreshAt?.getTime() ??
    0
  );
}

function parseSearchParam(
  value: string | string[] | undefined,
  fallback = ""
) {
  return typeof value === "string" ? value : fallback;
}

function resolveSchedulerSort(value: string): SchedulerSort {
  return value === "updated" ? "updated" : "priority";
}

export default async function AdminRefreshSchedulerPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = await searchParams;
  const now = new Date();
  const mandatoryCutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const historyCutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const asinQuery = parseSearchParam(resolvedSearchParams?.q).trim().toUpperCase();
  const sort = resolveSchedulerSort(
    parseSearchParam(resolvedSearchParams?.sort, "priority")
  );

  const dynamicWhere =
    asinQuery.length > 0
      ? {
          asin: {
            contains: asinQuery,
            mode: "insensitive" as const,
          },
        }
      : undefined;

  const trackedWhere =
    asinQuery.length > 0
      ? {
          asin: {
            contains: asinQuery,
            mode: "insensitive" as const,
          },
        }
      : undefined;

  const dynamicOrderBy =
    sort === "updated"
      ? [
          { lastPriceRefreshAt: "desc" as const },
          { lastSuccessfulRefreshAt: "desc" as const },
          { priorityScore: "desc" as const },
        ]
      : [
          { priorityScore: "desc" as const },
          { dataFreshnessScore: "desc" as const },
          { nextPriceRefreshAt: "asc" as const },
        ];

  const trackedOrderBy =
    sort === "updated"
      ? [
          { lastPriceRefreshAt: "desc" as const },
          { lastSuccessfulRefreshAt: "desc" as const },
          { priorityScore: "desc" as const },
        ]
      : [
          { priorityScore: "desc" as const },
          { dataFreshnessScore: "desc" as const },
          { nextPriceRefreshAt: "asc" as const },
        ];

  const [
    dynamicProducts,
    trackedProducts,
    dynamicDueCount,
    trackedDueCount,
    dynamicPriorityDueCount,
    trackedPriorityDueCount,
    dynamicMandatoryDueCount,
    trackedMandatoryDueCount,
    hotCount,
    warmCount,
    coldCount,
    recentActions,
  ] = await Promise.all([
    prisma.dynamicProduct.findMany({
      where: dynamicWhere,
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
      orderBy: dynamicOrderBy,
      take: 80,
    }),
    prisma.siteTrackedAmazonProduct.findMany({
      where: trackedWhere,
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
      orderBy: trackedOrderBy,
      take: 80,
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
    prisma.dynamicProduct.count({
      where: {
        AND: [
          {
            OR: [{ refreshLockUntil: null }, { refreshLockUntil: { lte: now } }],
          },
          {
            OR: [{ nextPriceRefreshAt: null }, { nextPriceRefreshAt: { lte: now } }],
          },
          {
            lastSuccessfulRefreshAt: { gt: mandatoryCutoff },
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
          {
            lastSuccessfulRefreshAt: { gt: mandatoryCutoff },
          },
        ],
      },
    }),
    prisma.dynamicProduct.count({
      where: {
        AND: [
          {
            OR: [{ refreshLockUntil: null }, { refreshLockUntil: { lte: now } }],
          },
          {
            OR: [
              { lastSuccessfulRefreshAt: null },
              { lastSuccessfulRefreshAt: { lte: mandatoryCutoff } },
            ],
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
            OR: [
              { lastSuccessfulRefreshAt: null },
              { lastSuccessfulRefreshAt: { lte: mandatoryCutoff } },
            ],
          },
        ],
      },
    }),
    prisma
      .$transaction([
        prisma.dynamicProduct.count({ where: { refreshTier: "hot" } }),
        prisma.siteTrackedAmazonProduct.count({ where: { refreshTier: "hot" } }),
      ])
      .then(([dynamic, tracked]) => dynamic + tracked),
    prisma
      .$transaction([
        prisma.dynamicProduct.count({ where: { refreshTier: "warm" } }),
        prisma.siteTrackedAmazonProduct.count({ where: { refreshTier: "warm" } }),
      ])
      .then(([dynamic, tracked]) => dynamic + tracked),
    prisma
      .$transaction([
        prisma.dynamicProduct.count({ where: { refreshTier: "cold" } }),
        prisma.siteTrackedAmazonProduct.count({ where: { refreshTier: "cold" } }),
      ])
      .then(([dynamic, tracked]) => dynamic + tracked),
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

  const dynamicHistoryRows =
    dynamicProducts.length === 0
      ? []
      : await prisma.dynamicPriceHistory.findMany({
          where: {
            productId: { in: dynamicProducts.map((product) => product.id) },
            date: { gte: historyCutoff },
          },
          select: {
            productId: true,
            updateCount: true,
          },
        });

  const trackedHistoryRows =
    trackedProducts.length === 0
      ? []
      : await prisma.siteTrackedAmazonProductPriceHistory.findMany({
          where: {
            trackedProductId: { in: trackedProducts.map((product) => product.id) },
            date: { gte: historyCutoff },
          },
          select: {
            trackedProductId: true,
            updateCount: true,
          },
        });

  const dynamicUpdateCountMap = new Map<string, number>();
  for (const row of dynamicHistoryRows) {
    dynamicUpdateCountMap.set(
      row.productId,
      (dynamicUpdateCountMap.get(row.productId) ?? 0) + row.updateCount
    );
  }

  const trackedUpdateCountMap = new Map<string, number>();
  for (const row of trackedHistoryRows) {
    trackedUpdateCountMap.set(
      row.trackedProductId,
      (trackedUpdateCountMap.get(row.trackedProductId) ?? 0) + row.updateCount
    );
  }

  const rows: SchedulerRow[] = [
    ...dynamicProducts.map(
      (product): SchedulerRow => ({
        ...product,
        source: "dynamic",
        monitorCount: 0,
        updatesLast24h: Math.max(
          dynamicUpdateCountMap.get(product.id) ?? 0,
          product.lastPriceRefreshAt &&
            product.lastPriceRefreshAt.getTime() >= historyCutoff.getTime()
            ? 1
            : 0
        ),
      })
    ),
    ...trackedProducts.map(
      (product): SchedulerRow => ({
        ...product,
        source: "tracked",
        updatesLast24h: Math.max(
          trackedUpdateCountMap.get(product.id) ?? 0,
          product.lastPriceRefreshAt &&
            product.lastPriceRefreshAt.getTime() >= historyCutoff.getTime()
            ? 1
            : 0
        ),
      })
    ),
  ]
    .sort((a, b) => {
      if (sort === "updated") {
        const updatedDiff = getUpdatedAtTimestamp(b) - getUpdatedAtTimestamp(a);
        if (updatedDiff !== 0) return updatedDiff;

        const updatesDiff = b.updatesLast24h - a.updatesLast24h;
        if (updatesDiff !== 0) return updatesDiff;

        const priorityDiff = (b.priorityScore ?? 0) - (a.priorityScore ?? 0);
        if (Math.abs(priorityDiff) > 0.001) return priorityDiff;

        return a.asin.localeCompare(b.asin);
      }

      const aMandatoryDue = isMandatoryDue(a, mandatoryCutoff);
      const bMandatoryDue = isMandatoryDue(b, mandatoryCutoff);
      if (aMandatoryDue !== bMandatoryDue) return aMandatoryDue ? -1 : 1;

      const aPriorityDue = isPriorityDue(a, now, mandatoryCutoff);
      const bPriorityDue = isPriorityDue(b, now, mandatoryCutoff);
      if (aPriorityDue !== bPriorityDue) return aPriorityDue ? -1 : 1;

      const priorityDiff = (b.priorityScore ?? 0) - (a.priorityScore ?? 0);
      if (Math.abs(priorityDiff) > 0.001) return priorityDiff;

      const tierDiff = getTierRank(b.refreshTier) - getTierRank(a.refreshTier);
      if (tierDiff !== 0) return tierDiff;

      const freshnessDiff =
        (b.dataFreshnessScore ?? 0) - (a.dataFreshnessScore ?? 0);
      if (Math.abs(freshnessDiff) > 0.001) return freshnessDiff;

      const nextRefresh =
        (a.nextPriceRefreshAt?.getTime() ?? 0) -
        (b.nextPriceRefreshAt?.getTime() ?? 0);
      if (nextRefresh !== 0) return nextRefresh;

      return a.asin.localeCompare(b.asin);
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
              Leitura operacional da fila inteligente: urgencia, score, tier,
              travas e atividade recente.
            </p>
          </div>

          <div className="flex flex-col gap-3 md:items-end">
            <form
              action="/admin/dynamic/refresh-scheduler"
              className="flex flex-col gap-2 md:flex-row"
            >
              <input
                type="text"
                name="q"
                defaultValue={asinQuery}
                placeholder="Buscar por ASIN"
                className="h-11 min-w-[220px] rounded-2xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-800 shadow-sm outline-none transition-all focus:border-blue-300"
              />
              <select
                name="sort"
                defaultValue={sort}
                className="h-11 rounded-2xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-800 shadow-sm outline-none transition-all focus:border-blue-300"
              >
                <option value="priority">Ranking de prioridade</option>
                <option value="updated">Ultimos atualizados</option>
              </select>
              <button
                type="submit"
                className="h-11 rounded-2xl bg-gray-900 px-5 text-[11px] font-black uppercase tracking-widest text-white shadow-sm transition-all hover:bg-black"
              >
                Aplicar
              </button>
              {(asinQuery || sort !== "priority") && (
                <Link
                  href="/admin/dynamic/refresh-scheduler"
                  className="inline-flex h-11 items-center justify-center rounded-2xl border border-gray-200 bg-white px-5 text-[11px] font-black uppercase tracking-widest text-gray-600 shadow-sm transition-all hover:text-black"
                >
                  Limpar
                </Link>
              )}
            </form>

            <Link
              href="/admin/dynamic"
              className="rounded-2xl border border-gray-200 bg-white px-5 py-3 text-[10px] font-black uppercase tracking-widest text-gray-500 shadow-sm transition-all hover:text-black"
            >
              ← Painel dinamico
            </Link>
          </div>
        </div>

        <div className="mb-6 grid gap-3 md:grid-cols-6">
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
              Cobertura diaria
            </div>
            <div className="mt-1 text-3xl font-black text-amber-600">
              {dynamicMandatoryDueCount + trackedMandatoryDueCount}
            </div>
            <div className="mt-2 text-xs font-semibold text-gray-500">
              Comparador {dynamicMandatoryDueCount} • Amazon interno{" "}
              {trackedMandatoryDueCount}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white px-5 py-4 shadow-sm">
            <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">
              Urgencia prioritaria
            </div>
            <div className="mt-1 text-3xl font-black text-blue-600">
              {dynamicPriorityDueCount + trackedPriorityDueCount}
            </div>
            <div className="mt-2 text-xs font-semibold text-gray-500">
              Comparador {dynamicPriorityDueCount} • Amazon interno{" "}
              {trackedPriorityDueCount}
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
            <table className="min-w-[1380px] w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-[10px] font-black uppercase tracking-widest text-gray-400">
                  <th className="p-4 text-black">Produto</th>
                  <th className="p-4 text-center text-black">Origem</th>
                  <th className="p-4 text-center text-black">Tier</th>
                  <th className="p-4 text-center text-black">Priority</th>
                  <th className="p-4 text-center text-black">Urgencia</th>
                  <th className="p-4 text-center text-black">Janela de refresh</th>
                  <th className="p-4 text-center text-black">Ultimo refresh</th>
                  <th className="p-4 text-center text-black">Atualizacoes 24h</th>
                  <th className="p-4 text-center text-black">Falhas</th>
                  <th className="p-4 text-center text-black">Lock</th>
                  <th className="p-4 text-center text-black">Monitores</th>
                  <th className="p-4 text-center text-black">Acoes</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-50">
                {rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={12}
                      className="p-10 text-center text-sm font-semibold text-gray-400"
                    >
                      Nenhum item encontrado no scheduler.
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => {
                    const lockActive =
                      row.refreshLockUntil &&
                      row.refreshLockUntil.getTime() > now.getTime();
                    const mandatoryDue = isMandatoryDue(row, mandatoryCutoff);
                    const priorityDue = isPriorityDue(row, now, mandatoryCutoff);
                    const refreshTiming = getRefreshTimingLabel(
                      row.nextPriceRefreshAt,
                      now
                    );
                    const lastRefresh = getLastRefreshLabel(row);

                    return (
                      <tr
                        key={`${row.source}:${row.id}`}
                        className="transition-colors hover:bg-gray-50/50"
                      >
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
                          <div className="flex flex-col items-center gap-2">
                            <span
                              className={`inline-flex rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest ${
                                mandatoryDue
                                  ? "bg-amber-100 text-amber-700"
                                  : priorityDue
                                    ? "bg-blue-100 text-blue-700"
                                    : "bg-gray-100 text-gray-600"
                              }`}
                            >
                              {mandatoryDue
                                ? "Cobertura diaria"
                                : priorityDue
                                  ? "Urgencia prioritaria"
                                  : refreshTiming.label}
                            </span>
                            <div className="text-[12px] font-black text-gray-700">
                              {mandatoryDue ? lastRefresh.value : refreshTiming.value}
                            </div>
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
                        <td className="p-4 text-center text-lg font-black text-gray-900">
                          {row.updatesLast24h}
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
                                <input
                                  type="hidden"
                                  name="productId"
                                  value={row.id}
                                />
                              ) : (
                                <input
                                  type="hidden"
                                  name="trackedProductId"
                                  value={row.id}
                                />
                              )}
                              <button
                                type="submit"
                                className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-blue-700 transition-all hover:bg-blue-100"
                              >
                                Forcar agora
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
                                <input
                                  type="hidden"
                                  name="productId"
                                  value={row.id}
                                />
                              ) : (
                                <input
                                  type="hidden"
                                  name="trackedProductId"
                                  value={row.id}
                                />
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
            <h2 className="text-lg font-black text-gray-900">
              Ultimas acoes manuais
            </h2>
            <p className="mt-1 text-sm font-medium text-gray-500">
              Auditoria rapida de boost e forcar refresh disparados no admin.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-[840px] w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-gray-100 bg-white text-[10px] font-black uppercase tracking-widest text-gray-400">
                  <th className="p-4 text-black">Quando</th>
                  <th className="p-4 text-black">Acao</th>
                  <th className="p-4 text-black">Origem</th>
                  <th className="p-4 text-black">ASIN</th>
                  <th className="p-4 text-black">Actor</th>
                  <th className="p-4 text-black">Notas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recentActions.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="p-8 text-center text-sm font-semibold text-gray-400"
                    >
                      Nenhuma acao manual registrada ainda.
                    </td>
                  </tr>
                ) : (
                  recentActions.map((action: ActionLogRow) => (
                    <tr
                      key={action.id}
                      className="transition-colors hover:bg-gray-50/50"
                    >
                      <td className="p-4 text-[12px] font-black text-gray-700">
                        {formatDate(action.createdAt)}
                      </td>
                      <td className="p-4">
                        <span className="inline-flex rounded-full bg-gray-100 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-gray-700">
                          {action.actionType === "force_refresh_now"
                            ? "Forcar agora"
                            : "Boost manual"}
                        </span>
                      </td>
                      <td className="p-4 text-[12px] font-black text-gray-700">
                        {action.productSource === "dynamic"
                          ? "Comparador"
                          : "Amazon interno"}
                      </td>
                      <td className="p-4 text-[12px] font-black text-gray-900">
                        {action.asin}
                      </td>
                      <td className="p-4 text-[12px] font-black text-gray-700">
                        {action.actor}
                      </td>
                      <td className="p-4 text-sm font-medium text-gray-500">
                        {action.notes ?? "-"}
                      </td>
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
