import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type ReportRow = {
  id: string;
  productId: string;
  productName: string;
  asin: string;
  reason: string;
  details: string | null;
  pagePath: string | null;
  status: string;
  createdAt: Date;
};

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "medium",
    timeZone: "America/Sao_Paulo",
  }).format(value);
}

function reasonClasses(reason: string) {
  if (reason === "Preço desatualizado") return "bg-orange-50 text-orange-700";
  if (reason === "Produto indisponível") return "bg-red-50 text-red-700";
  if (reason === "Informação incorreta") return "bg-blue-50 text-blue-700";
  return "bg-gray-100 text-gray-700";
}

export default async function AdminDynamicReportsPage() {
  const [reports, openReportsCount, last24hCount] = await Promise.all([
    prisma.$queryRaw<ReportRow[]>`
      SELECT
        r."id",
        r."productId",
        p."name" AS "productName",
        r."asin",
        r."reason",
        r."details",
        r."pagePath",
        r."status",
        r."createdAt"
      FROM "DynamicProductIssueReport" r
      INNER JOIN "DynamicProduct" p ON p."id" = r."productId"
      ORDER BY r."createdAt" DESC
      LIMIT 100
    `,
    prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS "count"
      FROM "DynamicProductIssueReport"
      WHERE "status" = 'open'
    `,
    prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS "count"
      FROM "DynamicProductIssueReport"
      WHERE "createdAt" >= NOW() - INTERVAL '24 hours'
    `,
  ]);

  const openCount = Number(openReportsCount[0]?.count ?? 0);
  const last24h = Number(last24hCount[0]?.count ?? 0);

  return (
    <div className="min-h-screen bg-gray-50/30 p-8 font-sans text-black">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-500">
                Feedback operacional
              </span>
            </div>
            <h1 className="text-4xl font-black tracking-tight text-gray-900">
              PROBLEMAS REPORTADOS
            </h1>
            <p className="mt-1 text-sm font-medium text-gray-500">
              Reports anônimos enviados pelos cards de oferta.
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

        <div className="mb-6 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-gray-100 bg-white px-5 py-4 shadow-sm">
            <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">
              Reports abertos
            </div>
            <div className="mt-1 text-3xl font-black text-amber-600">{openCount}</div>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white px-5 py-4 shadow-sm">
            <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">
              Últimas 24h
            </div>
            <div className="mt-1 text-3xl font-black text-gray-900">{last24h}</div>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white px-5 py-4 shadow-sm">
            <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">
              Total listado
            </div>
            <div className="mt-1 text-3xl font-black text-gray-900">{reports.length}</div>
          </div>
        </div>

        <div className="overflow-hidden rounded-[2rem] border border-gray-100 bg-white shadow-xl shadow-gray-200/50">
          <div className="overflow-x-auto">
            <table className="min-w-[1100px] w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-[10px] font-black uppercase tracking-widest text-gray-400">
                  <th className="p-4 text-black">Produto</th>
                  <th className="w-52 p-4 text-black">Motivo</th>
                  <th className="w-44 p-4 text-black">Quando</th>
                  <th className="w-40 p-4 text-black">Origem</th>
                  <th className="p-4 text-black">Detalhes</th>
                  <th className="w-40 p-4 text-black">Ações</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-50">
                {reports.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="p-10 text-center text-sm font-semibold text-gray-400"
                    >
                      Nenhum report registrado ainda.
                    </td>
                  </tr>
                ) : (
                  reports.map((report) => (
                    <tr key={report.id} className="transition-colors hover:bg-gray-50/50">
                      <td className="p-4">
                        <div className="text-[13px] font-bold text-gray-900">
                          {report.productName}
                        </div>
                        <div className="mt-1 font-mono text-[11px] text-gray-400">
                          {report.asin}
                        </div>
                      </td>

                      <td className="p-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest ${reasonClasses(
                            report.reason
                          )}`}
                        >
                          {report.reason}
                        </span>
                      </td>

                      <td className="p-4 text-[13px] font-semibold text-gray-700">
                        {formatDate(report.createdAt)}
                      </td>

                      <td className="p-4 text-[13px] font-semibold text-gray-700">
                        {report.pagePath || "Não informado"}
                      </td>

                      <td className="p-4 text-[13px] text-gray-600">
                        {report.details || "—"}
                      </td>

                      <td className="p-4">
                        <div className="flex flex-wrap gap-2">
                          <Link
                            href={`/admin/dynamic/produtos/${report.productId}`}
                            className="rounded-full bg-gray-100 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-gray-700"
                          >
                            Admin
                          </Link>
                          <a
                            href={`https://www.amazon.com.br/dp/${report.asin}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-full bg-blue-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-blue-700"
                          >
                            Amazon
                          </a>
                        </div>
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
