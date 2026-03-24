import Image from "next/image";
import Link from "next/link";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getDynamicClickAlertConfig } from "@/lib/dynamicClickAlerts";
import { saveClickAlertConfig } from "./actions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const CLICK_TIMEZONE = "America/Sao_Paulo";
const SORTABLE_COLUMNS = ["clicks", "lastClick"] as const;

type SortKey = (typeof SORTABLE_COLUMNS)[number];
type SortDirection = "asc" | "desc";

type ClickedProductRow = {
  id: string;
  name: string;
  imageUrl: string | null;
  asin: string;
  clickCount: number;
  lastClickedAt: Date | null;
  lastClickedAtLabel: string | null;
  lastSource: string | null;
  lastMedium: string | null;
  lastCampaign: string | null;
  lastPagePath: string | null;
  topSource: string | null;
  topSourceCount: number | null;
};

type SourceSummaryRow = {
  source: string;
  clickCount: number;
};

type DailyClickRow = {
  day: string;
  dayLabel: string;
  clickCount: number;
  uniqueProducts: number;
};

function getSourceLabel(value: string | null) {
  if (!value) {
    return "Direto";
  }

  return value;
}

function getSortConfig(
  sort: string | undefined,
  direction: string | undefined
): { sortKey: SortKey; sortDirection: SortDirection } {
  const sortKey = SORTABLE_COLUMNS.includes(sort as SortKey)
    ? (sort as SortKey)
    : "lastClick";
  const sortDirection = direction === "asc" ? "asc" : "desc";

  return { sortKey, sortDirection };
}

function getNextDirection(
  activeSortKey: SortKey,
  activeDirection: SortDirection,
  nextSortKey: SortKey
) {
  if (activeSortKey !== nextSortKey) {
    return "desc";
  }

  return activeDirection === "desc" ? "asc" : "desc";
}

async function getClickedProducts(
  sortKey: SortKey,
  sortDirection: SortDirection
): Promise<ClickedProductRow[]> {
  const orderByClause =
    sortKey === "lastClick"
      ? sortDirection === "asc"
        ? Prisma.sql`ORDER BY s."lastClickedAt" ASC NULLS LAST, s."clickCount" DESC`
        : Prisma.sql`ORDER BY s."lastClickedAt" DESC NULLS LAST, s."clickCount" DESC`
      : sortDirection === "asc"
        ? Prisma.sql`ORDER BY s."clickCount" ASC, s."lastClickedAt" DESC NULLS LAST`
        : Prisma.sql`ORDER BY s."clickCount" DESC, s."lastClickedAt" DESC NULLS LAST`;

  const rows = await prisma.$queryRaw<ClickedProductRow[]>`
    SELECT
      p."id",
      p."name",
      p."imageUrl",
      p."asin",
      s."clickCount",
      s."lastClickedAt",
      TO_CHAR(
        (s."lastClickedAt" AT TIME ZONE 'UTC') AT TIME ZONE ${CLICK_TIMEZONE},
        'DD/MM/YYYY HH24:MI:SS'
      ) AS "lastClickedAtLabel",
      (
        SELECT COALESCE(
          NULLIF(e."utmSource", ''),
          NULLIF(e."inferredSource", ''),
          'direto'
        )
        FROM "DynamicProductClickEvent" e
        WHERE e."productId" = p."id"
        ORDER BY e."createdAt" DESC
        LIMIT 1
      ) AS "lastSource",
      (
        SELECT NULLIF(e."utmMedium", '')
        FROM "DynamicProductClickEvent" e
        WHERE e."productId" = p."id"
        ORDER BY e."createdAt" DESC
        LIMIT 1
      ) AS "lastMedium",
      (
        SELECT NULLIF(e."utmCampaign", '')
        FROM "DynamicProductClickEvent" e
        WHERE e."productId" = p."id"
        ORDER BY e."createdAt" DESC
        LIMIT 1
      ) AS "lastCampaign",
      (
        SELECT NULLIF(e."pagePath", '')
        FROM "DynamicProductClickEvent" e
        WHERE e."productId" = p."id"
        ORDER BY e."createdAt" DESC
        LIMIT 1
      ) AS "lastPagePath",
      (
        SELECT src."source"
        FROM (
          SELECT
            COALESCE(
              NULLIF(e."utmSource", ''),
              NULLIF(e."inferredSource", ''),
              'direto'
            ) AS "source",
            COUNT(*) AS "count"
          FROM "DynamicProductClickEvent" e
          WHERE e."productId" = p."id"
          GROUP BY 1
          ORDER BY "count" DESC, "source" ASC
          LIMIT 1
        ) src
      ) AS "topSource",
      (
        SELECT src."count"
        FROM (
          SELECT
            COALESCE(
              NULLIF(e."utmSource", ''),
              NULLIF(e."inferredSource", ''),
              'direto'
            ) AS "source",
            COUNT(*) AS "count"
          FROM "DynamicProductClickEvent" e
          WHERE e."productId" = p."id"
          GROUP BY 1
          ORDER BY "count" DESC, "source" ASC
          LIMIT 1
        ) src
      ) AS "topSourceCount"
    FROM "DynamicProductClickStats" s
    INNER JOIN "DynamicProduct" p ON p."id" = s."productId"
    ${orderByClause}
  `;

  return rows.map((row) => ({
    ...row,
    clickCount: Number(row.clickCount) || 0,
    topSourceCount: Number(row.topSourceCount) || 0,
  }));
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
    LIMIT 5
  `;

  return rows.map((row) => ({
    source: row.source,
    clickCount: Number(row.clickCount) || 0,
  }));
}

async function getDailyClickSummary(): Promise<DailyClickRow[]> {
  const rows = await prisma.$queryRaw<DailyClickRow[]>`
    SELECT
      TO_CHAR(base."localDay", 'YYYY-MM-DD') AS "day",
      TO_CHAR(base."localDay", 'DD/MM/YYYY') AS "dayLabel",
      base."clickCount",
      base."uniqueProducts"
    FROM (
      SELECT
        DATE_TRUNC(
          'day',
          ("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE ${CLICK_TIMEZONE}
        ) AS "localDay",
        COUNT(*)::int AS "clickCount",
        COUNT(DISTINCT "productId")::int AS "uniqueProducts"
      FROM "DynamicProductClickEvent"
      GROUP BY 1
    ) base
    ORDER BY base."localDay" DESC
    LIMIT 14
  `;

  return rows.map((row) => ({
    day: row.day,
    dayLabel: row.dayLabel,
    clickCount: Number(row.clickCount) || 0,
    uniqueProducts: Number(row.uniqueProducts) || 0,
  }));
}

function SortLink({
  label,
  sortKey,
  activeSortKey,
  activeDirection,
}: {
  label: string;
  sortKey: SortKey;
  activeSortKey: SortKey;
  activeDirection: SortDirection;
}) {
  const nextDirection = getNextDirection(activeSortKey, activeDirection, sortKey);
  const isActive = activeSortKey === sortKey;
  const arrow = !isActive ? "" : activeDirection === "desc" ? " ↓" : " ↑";

  return (
    <Link
      href={`/admin/dynamic/cliques?sort=${sortKey}&direction=${nextDirection}`}
      className={`rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-wide transition ${
        isActive
          ? "border-blue-200 bg-blue-50 text-blue-700"
          : "border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:text-black"
      }`}
    >
      {label}
      {arrow}
    </Link>
  );
}

export default async function AdminDynamicClicksPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; direction?: string }>;
}) {
  const params = await searchParams;
  const { sortKey, sortDirection } = getSortConfig(params.sort, params.direction);
  const [clickedProducts, sourceSummary, dailySummary, clickAlertConfig] = await Promise.all([
    getClickedProducts(sortKey, sortDirection),
    getSourceSummary(),
    getDailyClickSummary(),
    getDynamicClickAlertConfig(),
  ]);

  const totalClicks = clickedProducts.reduce(
    (total, product) => total + product.clickCount,
    0
  );

  const lastClick = clickedProducts[0]?.lastClickedAt ?? null;
  const topSource = sourceSummary[0] ?? null;

  return (
    <div className="min-h-screen bg-gray-50/30 p-8 font-sans text-black">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-blue-600" />
              <span className="text-[10px] font-black uppercase tracking-widest text-blue-600">
                Prioridade por clique
              </span>
            </div>
            <h1 className="text-4xl font-black tracking-tight text-gray-900">
              CLIQUES DE PRODUTOS
            </h1>
            <p className="mt-1 text-sm font-medium text-gray-500">
              Veja quantos cliques cada produto recebeu e de onde eles vieram.
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

        <div className="mb-6 grid gap-3 md:grid-cols-4">
          <div className="rounded-2xl border border-gray-100 bg-white px-5 py-4 shadow-sm">
            <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">
              Produtos clicados
            </div>
            <div className="mt-1 text-3xl font-black text-gray-900">
              {clickedProducts.length}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white px-5 py-4 shadow-sm">
            <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">
              Cliques acumulados
            </div>
            <div className="mt-1 text-3xl font-black text-gray-900">
              {totalClicks}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white px-5 py-4 shadow-sm">
            <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">
              Ultimo clique
            </div>
            <div className="mt-2 text-sm font-black text-gray-900">
              {clickedProducts[0]?.lastClickedAtLabel || "Sem cliques"}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white px-5 py-4 shadow-sm">
            <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">
              Origem principal
            </div>
            <div className="mt-1 text-lg font-black text-gray-900">
              {topSource ? getSourceLabel(topSource.source) : "Sem dados"}
            </div>
            <div className="mt-1 text-[11px] font-bold text-gray-500">
              {topSource ? `${topSource.clickCount} cliques` : "Nenhum clique"}
            </div>
          </div>
        </div>

        <div className="mb-6 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                Notificação por email
              </div>
              <p className="mt-1 text-sm font-medium text-gray-500">
                Envia um email a cada clique com o nome do produto e o ASIN.
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
              Cliques por dia
            </div>
            <div className="text-[11px] font-bold text-gray-500">
              Ultimos 14 dias
            </div>
          </div>

          {dailySummary.length === 0 ? (
            <div className="py-4 text-sm font-semibold text-gray-400">
              Nenhum clique registrado ainda.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[520px] w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-gray-100 text-[10px] font-black uppercase tracking-widest text-gray-400">
                    <th className="px-2 py-3 text-black">Data</th>
                    <th className="px-2 py-3 text-center text-black">Cliques</th>
                    <th className="px-2 py-3 text-center text-black">
                      Produtos unicos
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {dailySummary.map((day) => (
                    <tr key={day.day}>
                      <td className="px-2 py-3 text-sm font-bold text-gray-900">
                        {day.dayLabel}
                      </td>
                      <td className="px-2 py-3 text-center text-sm font-black text-gray-900">
                        {day.clickCount}
                      </td>
                      <td className="px-2 py-3 text-center text-sm font-bold text-gray-500">
                        {day.uniqueProducts}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          <SortLink
            label="Ordenar por cliques"
            sortKey="clicks"
            activeSortKey={sortKey}
            activeDirection={sortDirection}
          />
          <SortLink
            label="Ordenar por ultimo clique"
            sortKey="lastClick"
            activeSortKey={sortKey}
            activeDirection={sortDirection}
          />
        </div>

        <div className="overflow-hidden rounded-[2rem] border border-gray-100 bg-white shadow-xl shadow-gray-200/50">
          <div className="overflow-x-auto">
            <table className="min-w-[1300px] w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-[10px] font-black uppercase tracking-widest text-gray-400">
                  <th className="w-24 p-4 text-center text-black">Foto</th>
                  <th className="p-4 text-black">Produto</th>
                  <th className="w-40 p-4 text-center text-black">ASIN</th>
                  <th className="w-24 p-4 text-center text-black">Cliques</th>
                  <th className="w-44 p-4 text-center text-black">Ultimo clique</th>
                  <th className="w-48 p-4 text-center text-black">Ultima origem</th>
                  <th className="w-48 p-4 text-center text-black">Origem principal</th>
                  <th className="w-56 p-4 text-center text-black">Ultima campanha</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-50">
                {clickedProducts.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="p-10 text-center text-sm font-semibold text-gray-400"
                    >
                      Nenhum clique registrado ainda.
                    </td>
                  </tr>
                ) : (
                  clickedProducts.map((product) => (
                    <tr key={product.id} className="transition-colors hover:bg-gray-50/50">
                      <td className="p-4 text-center">
                        <div className="relative mx-auto h-14 w-14 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
                          {product.imageUrl ? (
                            <Image
                              src={product.imageUrl}
                              alt={product.name}
                              fill
                              className="object-contain p-1"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center text-[10px] font-bold text-gray-300">
                              sem imagem
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="p-4">
                        <div className="text-[13px] font-bold leading-tight text-gray-900">
                          {product.name}
                        </div>
                        {product.lastPagePath && (
                          <div className="mt-1 text-[11px] font-medium text-gray-500">
                            {product.lastPagePath}
                          </div>
                        )}
                      </td>

                      <td className="p-4 text-center">
                        <a
                          href={`https://www.amazon.com.br/dp/${product.asin}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block rounded bg-blue-50 px-2 py-1 font-mono text-[10px] font-black uppercase text-blue-600 transition hover:bg-blue-600 hover:text-white"
                        >
                          {product.asin} {"->"}
                        </a>
                      </td>

                      <td className="p-4 text-center text-xl font-black text-gray-900">
                        {product.clickCount}
                      </td>

                      <td className="p-4 text-center text-[12px] font-bold text-gray-500">
                        {product.lastClickedAtLabel || "Nunca"}
                      </td>

                      <td className="p-4 text-center">
                        <div className="text-[12px] font-black text-gray-900">
                          {getSourceLabel(product.lastSource)}
                        </div>
                        {product.lastMedium && (
                          <div className="mt-1 text-[11px] font-bold text-gray-500">
                            {product.lastMedium}
                          </div>
                        )}
                      </td>

                      <td className="p-4 text-center">
                        <div className="text-[12px] font-black text-gray-900">
                          {getSourceLabel(product.topSource)}
                        </div>
                        <div className="mt-1 text-[11px] font-bold text-gray-500">
                          {product.topSourceCount || 0} cliques
                        </div>
                      </td>

                      <td className="p-4 text-center text-[12px] font-bold text-gray-500">
                        {product.lastCampaign || "-"}
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
