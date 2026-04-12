import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getDynamicClickAlertConfig } from "@/lib/dynamicClickAlerts";
import { normalizeAttributionSource } from "@/lib/attributionSource";
import { saveClickAlertConfig } from "./actions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const CLICK_TIMEZONE = "America/Sao_Paulo";

type SourceSummaryRow = {
  source: string;
  clickCount: number;
};

type CategorySummaryRow = {
  category: string;
  clickCount: number;
};

type DailyProductOriginRow = {
  day: string;
  dayLabel: string;
  productId: string;
  asin: string;
  productName: string;
  source: string;
  clickCount: number;
  uniqueVisitors: number;
};

type DailyProductSource = {
  source: string;
  clickCount: number;
};

type DailyProductItem = {
  productId: string;
  asin: string;
  productName: string;
  clickCount: number;
  uniqueVisitors: number;
  sources: DailyProductSource[];
};

type DailyProductBreakdown = {
  day: string;
  dayLabel: string;
  clickCount: number;
  uniqueProducts: number;
  uniqueVisitors: number;
  products: DailyProductItem[];
};

type MonthlyProductBreakdown = {
  monthKey: string;
  monthLabel: string;
  clickCount: number;
  uniqueVisitors: number;
  sourceTotals: Array<{ source: string; clickCount: number }>;
  days: DailyProductBreakdown[];
};

type VisitorSummary = {
  uniqueVisitors: number;
  uniqueSessions: number;
  avgClicksPerVisitor: number;
};

function getSourceLabel(value: string | null) {
  const normalized = normalizeAttributionSource(value);

  if (!normalized || normalized === "direto") {
    return "Direto";
  }

  return normalized;
}

async function getSourceSummary(): Promise<SourceSummaryRow[]> {
  const rows = await prisma.$queryRaw<SourceSummaryRow[]>`
    SELECT
      COALESCE(
        NULLIF("utmSource", ''),
        NULLIF("inferredSource", ''),
        'direto'
      ) AS "source",
      COUNT(*) AS "clickCount"
    FROM "DynamicProductClickEvent"
    GROUP BY 1
    ORDER BY "clickCount" DESC, "source" ASC
    LIMIT 8
  `;

  return rows.map((row) => ({
    source: getSourceLabel(row.source),
    clickCount: Number(row.clickCount) || 0,
  }));
}

async function getCategorySummary(): Promise<CategorySummaryRow[]> {
  const rows = await prisma.$queryRaw<CategorySummaryRow[]>`
    SELECT
      c."name" AS "category",
      COUNT(*) AS "clickCount"
    FROM "DynamicProductClickEvent" e
    INNER JOIN "DynamicProduct" p ON p."id" = e."productId"
    INNER JOIN "DynamicCategory" c ON c."id" = p."categoryId"
    GROUP BY c."name"
    ORDER BY "clickCount" DESC, c."name" ASC
    LIMIT 6
  `;

  return rows.map((row) => ({
    category: row.category,
    clickCount: Number(row.clickCount) || 0,
  }));
}

async function getDailyProductBreakdown(): Promise<DailyProductBreakdown[]> {
  const rows = await prisma.$queryRaw<DailyProductOriginRow[]>`
    WITH recent_days AS (
      SELECT
        DATE_TRUNC(
          'day',
          (e."createdAt" AT TIME ZONE 'UTC') AT TIME ZONE ${CLICK_TIMEZONE}
        ) AS "localDay"
      FROM "DynamicProductClickEvent" e
      GROUP BY 1
      ORDER BY 1 DESC
      LIMIT 120
    )
    SELECT
      TO_CHAR(d."localDay", 'YYYY-MM-DD') AS "day",
      TO_CHAR(d."localDay", 'DD/MM/YYYY') AS "dayLabel",
      p."id" AS "productId",
      p."asin" AS "asin",
      p."name" AS "productName",
      COALESCE(
        NULLIF(e."utmSource", ''),
        NULLIF(e."inferredSource", ''),
        'direto'
      ) AS "source",
      COUNT(*)::int AS "clickCount",
      COUNT(
        DISTINCT COALESCE(NULLIF(e."visitorId", ''), NULLIF(e."sessionId", ''), e."id")
      )::int AS "uniqueVisitors"
    FROM "DynamicProductClickEvent" e
    INNER JOIN recent_days d ON
      DATE_TRUNC(
        'day',
        (e."createdAt" AT TIME ZONE 'UTC') AT TIME ZONE ${CLICK_TIMEZONE}
      ) = d."localDay"
    INNER JOIN "DynamicProduct" p ON p."id" = e."productId"
    GROUP BY
      d."localDay",
      p."id",
      p."asin",
      p."name",
      6
    ORDER BY
      d."localDay" DESC,
      p."name" ASC,
      6 ASC
  `;
  const dayVisitorRows = await prisma.$queryRaw<
    Array<{ day: string; uniqueVisitors: number }>
  >`
    WITH recent_days AS (
      SELECT
        DATE_TRUNC(
          'day',
          (e."createdAt" AT TIME ZONE 'UTC') AT TIME ZONE ${CLICK_TIMEZONE}
        ) AS "localDay"
      FROM "DynamicProductClickEvent" e
      GROUP BY 1
      ORDER BY 1 DESC
      LIMIT 120
    )
    SELECT
      TO_CHAR(d."localDay", 'YYYY-MM-DD') AS "day",
      COUNT(
        DISTINCT COALESCE(NULLIF(e."visitorId", ''), NULLIF(e."sessionId", ''), e."id")
      )::int AS "uniqueVisitors"
    FROM recent_days d
    INNER JOIN "DynamicProductClickEvent" e ON
      DATE_TRUNC(
        'day',
        (e."createdAt" AT TIME ZONE 'UTC') AT TIME ZONE ${CLICK_TIMEZONE}
      ) = d."localDay"
    GROUP BY 1
  `;
  const dayVisitorsMap = new Map(
    dayVisitorRows.map((row) => [row.day, Number(row.uniqueVisitors) || 0])
  );

  const dayMap = new Map<string, DailyProductBreakdown>();

  for (const row of rows) {
    const dayKey = row.day;
    const normalizedSource = getSourceLabel(row.source);

    if (!dayMap.has(dayKey)) {
      dayMap.set(dayKey, {
        day: row.day,
        dayLabel: row.dayLabel,
        clickCount: 0,
        uniqueProducts: 0,
        uniqueVisitors: 0,
        products: [],
      });
    }

    const dayEntry = dayMap.get(dayKey)!;
    dayEntry.clickCount += Number(row.clickCount) || 0;

    let productEntry = dayEntry.products.find(
      (product) => product.productId === row.productId
    );

    if (!productEntry) {
      productEntry = {
        productId: row.productId,
        asin: row.asin,
        productName: row.productName,
        clickCount: 0,
        uniqueVisitors: 0,
        sources: [],
      };
      dayEntry.products.push(productEntry);
    }

    const clicks = Number(row.clickCount) || 0;
    productEntry.clickCount += clicks;
    productEntry.uniqueVisitors += Number(row.uniqueVisitors) || 0;
    productEntry.sources.push({
      source: normalizedSource,
      clickCount: clicks,
    });
  }

  const breakdown = Array.from(dayMap.values()).map((dayEntry) => {
    dayEntry.products.sort((a, b) => b.clickCount - a.clickCount);
    dayEntry.uniqueProducts = dayEntry.products.length;
    dayEntry.uniqueVisitors = dayVisitorsMap.get(dayEntry.day) ?? 0;
    return dayEntry;
  });

  breakdown.sort((a, b) => b.day.localeCompare(a.day));

  return breakdown;
}

async function getVisitorSummary(): Promise<VisitorSummary> {
  const rows = await prisma.$queryRaw<
    Array<{ uniqueVisitors: number; uniqueSessions: number; totalClicks: number }>
  >`
    SELECT
      COUNT(DISTINCT NULLIF(e."visitorId", ''))::int AS "uniqueVisitors",
      COUNT(DISTINCT NULLIF(e."sessionId", ''))::int AS "uniqueSessions",
      COUNT(*)::int AS "totalClicks"
    FROM "DynamicProductClickEvent" e
  `;

  const row = rows[0] ?? { uniqueVisitors: 0, uniqueSessions: 0, totalClicks: 0 };
  const uniqueVisitors = Number(row.uniqueVisitors) || 0;
  const totalClicks = Number(row.totalClicks) || 0;

  return {
    uniqueVisitors,
    uniqueSessions: Number(row.uniqueSessions) || 0,
    avgClicksPerVisitor:
      uniqueVisitors > 0 ? Number((totalClicks / uniqueVisitors).toFixed(2)) : 0,
  };
}

export default async function AdminDynamicClicksPage() {
  const [
    sourceSummary,
    categorySummary,
    dailyProductBreakdown,
    clickAlertConfig,
    visitorSummary,
  ] = await Promise.all([
    getSourceSummary(),
    getCategorySummary(),
    getDailyProductBreakdown(),
    getDynamicClickAlertConfig(),
    getVisitorSummary(),
  ]);

  const monthFormatter = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: CLICK_TIMEZONE,
  });

  const monthlyBreakdownMap = new Map<
    string,
    {
      monthKey: string;
      monthLabel: string;
      clickCount: number;
      uniqueVisitors: number;
      sourceCounts: Map<string, number>;
      days: DailyProductBreakdown[];
    }
  >();

  for (const day of dailyProductBreakdown) {
    const dayDate = new Date(`${day.day}T00:00:00`);
    const monthKey = day.day.slice(0, 7);
    const monthLabel = monthFormatter.format(dayDate);

    if (!monthlyBreakdownMap.has(monthKey)) {
      monthlyBreakdownMap.set(monthKey, {
        monthKey,
        monthLabel,
        clickCount: 0,
        uniqueVisitors: 0,
        sourceCounts: new Map<string, number>(),
        days: [],
      });
    }

    const monthEntry = monthlyBreakdownMap.get(monthKey)!;
    monthEntry.clickCount += day.clickCount;
    monthEntry.uniqueVisitors += day.uniqueVisitors;
    monthEntry.days.push(day);

    for (const product of day.products) {
      for (const source of product.sources) {
        monthEntry.sourceCounts.set(
          source.source,
          (monthEntry.sourceCounts.get(source.source) ?? 0) + source.clickCount
        );
      }
    }
  }

  const monthlyBreakdown: MonthlyProductBreakdown[] = Array.from(
    monthlyBreakdownMap.values()
  )
    .map((month) => ({
      monthKey: month.monthKey,
      monthLabel:
        month.monthLabel.charAt(0).toUpperCase() + month.monthLabel.slice(1),
      clickCount: month.clickCount,
      uniqueVisitors: month.uniqueVisitors,
      sourceTotals: Array.from(month.sourceCounts.entries())
        .map(([source, clickCount]) => ({ source, clickCount }))
        .sort((a, b) => b.clickCount - a.clickCount),
      days: month.days.sort((a, b) => b.day.localeCompare(a.day)),
    }))
    .sort((a, b) => b.monthKey.localeCompare(a.monthKey));

  const totalClicks = monthlyBreakdown.reduce(
    (total, month) => total + month.clickCount,
    0
  );
  const topSource = sourceSummary[0] ?? null;
  const topCategory = categorySummary[0] ?? null;
  const latestClickDay = dailyProductBreakdown[0]?.dayLabel ?? "Sem dados";

  return (
    <div className="min-h-screen bg-gray-50/30 p-8 font-sans text-black">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-blue-600" />
              <span className="text-[10px] font-black uppercase tracking-widest text-blue-600">
                Inteligencia de cliques
              </span>
            </div>
            <h1 className="text-4xl font-black tracking-tight text-gray-900">
              CLIQUES DE PRODUTOS
            </h1>
            <p className="mt-1 text-sm font-medium text-gray-500">
              Visao mensal com detalhamento diario por ASIN, origem, visitantes e sessoes.
            </p>
          </div>

          <div className="flex gap-3">
            <Link
              href="/admin/dynamic"
              className="rounded-2xl border border-gray-200 bg-white px-5 py-3 text-[10px] font-black uppercase tracking-widest text-gray-500 shadow-sm transition-all hover:text-black"
            >
              {"<-"} Painel dinamico
            </Link>
            <Link
              href="/admin/dynamic/produtos"
              className="rounded-2xl border border-gray-200 bg-white px-5 py-3 text-[10px] font-black uppercase tracking-widest text-gray-500 shadow-sm transition-all hover:text-black"
            >
              Ver produtos
            </Link>
          </div>
        </div>

        <div className="mb-6 grid gap-3 md:grid-cols-7">
          <div className="rounded-2xl border border-gray-100 bg-white px-5 py-4 shadow-sm">
            <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">
              Cliques totais
            </div>
            <div className="mt-1 text-3xl font-black text-gray-900">{totalClicks}</div>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white px-5 py-4 shadow-sm">
            <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">
              Visitantes unicos
            </div>
            <div className="mt-1 text-3xl font-black text-gray-900">
              {visitorSummary.uniqueVisitors}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white px-5 py-4 shadow-sm">
            <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">
              Sessoes unicas
            </div>
            <div className="mt-1 text-3xl font-black text-gray-900">
              {visitorSummary.uniqueSessions}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white px-5 py-4 shadow-sm">
            <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">
              Cliques por visitante
            </div>
            <div className="mt-1 text-3xl font-black text-gray-900">
              {visitorSummary.avgClicksPerVisitor}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white px-5 py-4 shadow-sm">
            <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">
              Ultimo dia com clique
            </div>
            <div className="mt-2 text-sm font-black text-gray-900">{latestClickDay}</div>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white px-5 py-4 shadow-sm">
            <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">
              Origem principal
            </div>
            <div className="mt-1 text-lg font-black text-gray-900">
              {topSource ? topSource.source : "Sem dados"}
            </div>
            <div className="mt-1 text-[11px] font-bold text-gray-500">
              {topSource ? `${topSource.clickCount} cliques` : "Nenhum clique"}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white px-5 py-4 shadow-sm">
            <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">
              Categoria mais clicada
            </div>
            <div className="mt-1 text-lg font-black text-gray-900">
              {topCategory ? topCategory.category : "Sem dados"}
            </div>
            <div className="mt-1 text-[11px] font-bold text-gray-500">
              {topCategory ? `${topCategory.clickCount} cliques` : "Nenhum clique"}
            </div>
          </div>
        </div>

        <div className="mb-6 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                Notificacao por email
              </div>
              <p className="mt-1 text-sm font-medium text-gray-500">
                Envia resumo por sessao com visitante anonimo, origens e produtos clicados.
              </p>
            </div>

            <form action={saveClickAlertConfig} className="flex items-center gap-3">
              <label
                className={`inline-flex items-center gap-3 rounded-full border px-4 py-2 text-sm font-semibold ${
                  clickAlertConfig.clickEmailAlertsEnabled
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-gray-200 bg-gray-50 text-gray-600"
                }`}
              >
                <input
                  type="checkbox"
                  name="clickEmailAlertsEnabled"
                  defaultChecked={clickAlertConfig.clickEmailAlertsEnabled}
                  className="h-4 w-4 rounded border-gray-300"
                />
                {clickAlertConfig.clickEmailAlertsEnabled ? "Ativada" : "Desativada"}
              </label>

              <button
                type="submit"
                className="rounded-2xl bg-gray-900 px-4 py-2 text-[12px] font-bold uppercase tracking-wide text-white transition hover:bg-gray-800"
              >
                Salvar
              </button>
            </form>
          </div>
        </div>

        <div className="mb-6 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">
              Ranking de categorias
            </div>
            <div className="text-[11px] font-bold text-gray-500">Top 6 categorias</div>
          </div>

          {categorySummary.length === 0 ? (
            <div className="py-4 text-sm font-semibold text-gray-400">
              Nenhum clique registrado ainda.
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {categorySummary.map((category) => (
                <span
                  key={category.category}
                  className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-[12px] font-bold text-gray-700"
                >
                  {category.category}: {category.clickCount}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="mb-6 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">
              Visao mensal (expansivel)
            </div>
            <div className="text-[11px] font-bold text-gray-500">
              Clique no mes para ver o detalhe diario
            </div>
          </div>

          {monthlyBreakdown.length === 0 ? (
            <div className="py-4 text-sm font-semibold text-gray-400">
              Nenhum clique registrado ainda.
            </div>
          ) : (
            <div className="space-y-3">
              {monthlyBreakdown.map((month) => (
                <details
                  key={month.monthKey}
                  className="overflow-hidden rounded-2xl border border-gray-100 bg-white"
                >
                  <summary className="cursor-pointer list-none px-4 py-3">
                    <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                      <div className="text-sm font-black text-gray-900">
                        {month.monthLabel} - {month.clickCount} cliques
                      </div>
                      <div className="text-[12px] font-bold text-gray-500">
                        {month.uniqueVisitors} visitantes •{" "}
                        {month.sourceTotals
                          .slice(0, 5)
                          .map((source) => `${source.clickCount} ${source.source}`)
                          .join(" / ")}
                      </div>
                    </div>
                  </summary>

                  <div className="space-y-3 border-t border-gray-100 bg-gray-50/40 p-3">
                    {month.days.map((day) => (
                      <div
                        key={day.day}
                        className="overflow-hidden rounded-xl border border-gray-100 bg-white"
                      >
                        <div className="flex flex-col gap-1 border-b border-gray-100 bg-gray-50 px-4 py-3 md:flex-row md:items-center md:justify-between">
                          <div className="text-sm font-black text-gray-900">
                            {day.dayLabel}
                          </div>
                          <div className="text-[12px] font-bold text-gray-500">
                            {day.clickCount} cliques • {day.uniqueProducts} produtos •{" "}
                            {day.uniqueVisitors} visitantes
                          </div>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="min-w-[940px] w-full border-collapse text-left">
                            <thead>
                              <tr className="border-b border-gray-100 bg-white text-[10px] font-black uppercase tracking-widest text-gray-400">
                                <th className="p-3 text-black">Produto</th>
                                <th className="w-36 p-3 text-center text-black">ASIN</th>
                                <th className="w-24 p-3 text-center text-black">Cliques</th>
                                <th className="w-24 p-3 text-center text-black">Visitantes</th>
                                <th className="w-[360px] p-3 text-black">Origens</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 bg-white">
                              {day.products.map((product) => (
                                <tr key={`${day.day}-${product.productId}`}>
                                  <td className="p-3 text-[12px] font-bold text-gray-900">
                                    {product.productName}
                                  </td>
                                  <td className="p-3 text-center font-mono text-[11px] font-black text-gray-600">
                                    {product.asin}
                                  </td>
                                  <td className="p-3 text-center text-sm font-black text-gray-900">
                                    {product.clickCount}
                                  </td>
                                  <td className="p-3 text-center text-sm font-black text-gray-900">
                                    {product.uniqueVisitors}
                                  </td>
                                  <td className="p-3 text-[12px] font-semibold text-gray-700">
                                    {product.sources
                                      .sort((a, b) => b.clickCount - a.clickCount)
                                      .map((source) => `${source.clickCount} ${source.source}`)
                                      .join(" / ")}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                  </div>
                </details>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
