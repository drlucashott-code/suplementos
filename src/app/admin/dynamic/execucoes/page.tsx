import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type ExecutionRow = {
  id: string;
  status: string;
  source: string;
  startedAt: Date;
  finishedAt: Date | null;
  processedMessages: number;
  uniqueAsins: number;
  updatedProducts: number;
  skippedProducts: number;
  errorMessage: string | null;
  updatedAsins: unknown;
};

function getDurationInSeconds(startedAt: Date, finishedAt: Date | null) {
  if (!finishedAt) return null;
  return Math.max(
    0,
    Math.round((finishedAt.getTime() - startedAt.getTime()) / 1000)
  );
}

function formatStatus(status: string) {
  if (status === "success") return "Sucesso";
  if (status === "error") return "Erro";
  if (status === "running") return "Executando";
  return status;
}

function getStatusClasses(status: string) {
  if (status === "success") {
    return "bg-green-100 text-green-700";
  }

  if (status === "error") {
    return "bg-red-100 text-red-700";
  }

  return "bg-yellow-100 text-yellow-700";
}

export default async function AdminDynamicExecutionsPage() {
  const runs = await prisma.$queryRaw<ExecutionRow[]>`
    SELECT
      "id",
      "status",
      "source",
      "startedAt",
      "finishedAt",
      "processedMessages",
      "uniqueAsins",
      "updatedProducts",
      "skippedProducts",
      "errorMessage",
      "updatedAsins"
    FROM "PriorityRefreshRun"
    ORDER BY "startedAt" DESC
    LIMIT 30
  `;

  const totalRuns = runs.length;
  const successRuns = runs.filter((run: ExecutionRow) => run.status === "success").length;
  const failedRuns = runs.filter((run: ExecutionRow) => run.status === "error").length;
  const lastRun = runs[0] ?? null;

  return (
    <div className="min-h-screen bg-gray-50/30 p-8 font-sans text-black">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-red-500" />
              <span className="text-[10px] font-black uppercase tracking-widest text-red-500">
                Observabilidade
              </span>
            </div>
            <h1 className="text-4xl font-black tracking-tight text-gray-900">
              EXECUÇÕES AUTOMÁTICAS
            </h1>
            <p className="mt-1 text-sm font-medium text-gray-500">
              Histórico da rotina prioritária de atualização via fila SQS.
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

        <div className="mb-6 grid gap-3 md:grid-cols-4">
          <div className="rounded-2xl border border-gray-100 bg-white px-5 py-4 shadow-sm">
            <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">
              Execuções
            </div>
            <div className="mt-1 text-3xl font-black text-gray-900">{totalRuns}</div>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white px-5 py-4 shadow-sm">
            <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">
              Sucesso
            </div>
            <div className="mt-1 text-3xl font-black text-green-600">{successRuns}</div>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white px-5 py-4 shadow-sm">
            <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">
              Erros
            </div>
            <div className="mt-1 text-3xl font-black text-red-600">{failedRuns}</div>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white px-5 py-4 shadow-sm">
            <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">
              Última execução
            </div>
            <div className="mt-2 text-sm font-black text-gray-900">
              {lastRun
                ? new Date(lastRun.startedAt).toLocaleString("pt-BR")
                : "Nenhuma"}
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-[2rem] border border-gray-100 bg-white shadow-xl shadow-gray-200/50">
          <div className="overflow-x-auto">
            <table className="min-w-[900px] w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-[10px] font-black uppercase tracking-widest text-gray-400">
                  <th className="w-44 p-4 text-black">Início</th>
                  <th className="w-28 p-4 text-center text-black">Status</th>
                  <th className="w-32 p-4 text-center text-black">Duração</th>
                  <th className="w-28 p-4 text-center text-black">Mensagens</th>
                  <th className="w-28 p-4 text-center text-black">ASINs</th>
                  <th className="w-32 p-4 text-center text-black">Atualizados</th>
                  <th className="w-28 p-4 text-center text-black">Pulados</th>
                  <th className="w-36 p-4 text-center text-black">Detalhes</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-50">
                {runs.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="p-10 text-center text-sm font-semibold text-gray-400"
                    >
                      Nenhuma execução registrada ainda.
                    </td>
                  </tr>
                ) : (
                  runs.map((run: ExecutionRow) => {
                    const duration = getDurationInSeconds(run.startedAt, run.finishedAt);
                    const updatedAsins = Array.isArray(run.updatedAsins)
                      ? Array.from(
                          new Set(
                            run.updatedAsins
                              .map((asin) => String(asin).trim().toUpperCase())
                              .filter((asin) => /^[A-Z0-9]{10}$/.test(asin))
                          )
                        )
                      : [];

                    return (
                      <tr key={run.id} className="transition-colors hover:bg-gray-50/50">
                        <td className="p-4">
                          <div className="text-[13px] font-bold text-gray-900">
                            {new Date(run.startedAt).toLocaleString("pt-BR")}
                          </div>
                          <div className="mt-1 text-[10px] font-bold uppercase tracking-wide text-gray-400">
                            {run.source}
                          </div>
                        </td>

                        <td className="p-4 text-center">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest ${getStatusClasses(run.status)}`}
                          >
                            {formatStatus(run.status)}
                          </span>
                        </td>

                        <td className="p-4 text-center text-[12px] font-black text-gray-700">
                          {duration !== null ? `${duration}s` : "—"}
                        </td>

                        <td className="p-4 text-center text-lg font-black text-gray-900">
                          {run.processedMessages}
                        </td>

                        <td className="p-4 text-center text-lg font-black text-gray-900">
                          {run.uniqueAsins}
                        </td>

                        <td className="p-4 text-center text-lg font-black text-green-600">
                          {run.updatedProducts}
                        </td>

                        <td className="p-4 text-center text-lg font-black text-gray-600">
                          {run.skippedProducts}
                        </td>

                        <td className="p-4 text-center">
                          {updatedAsins.length > 0 || run.errorMessage ? (
                            <details className="group inline-block text-left">
                              <summary className="cursor-pointer rounded-full border border-gray-200 bg-white px-3 py-1 text-[10px] font-black uppercase tracking-widest text-gray-500 transition-all hover:text-black">
                                Ver detalhes
                              </summary>
                              <div className="mt-3 w-[320px] rounded-2xl border border-gray-100 bg-white p-4 shadow-lg">
                                {run.errorMessage ? (
                                  <div className="text-[11px] font-semibold text-red-600">
                                    {run.errorMessage}
                                  </div>
                                ) : null}
                                {updatedAsins.length > 0 ? (
                                  <div className="mt-3 flex flex-wrap gap-2">
                                    {updatedAsins.slice(0, 12).map((asin, index) => (
                                      <a
                                        key={`${String(asin)}-${index}`}
                                        href={`https://www.amazon.com.br/dp/${asin}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="rounded-full bg-blue-50 px-2 py-1 font-mono text-[10px] font-black uppercase text-blue-600"
                                      >
                                        {String(asin)}
                                      </a>
                                    ))}
                                    {updatedAsins.length > 12 ? (
                                      <span className="rounded-full bg-gray-100 px-2 py-1 text-[10px] font-black uppercase text-gray-500">
                                        +{updatedAsins.length - 12}
                                      </span>
                                    ) : null}
                                  </div>
                                ) : (
                                  <div className="mt-2 text-[11px] font-semibold text-gray-400">
                                    Nenhum ASIN atualizado
                                  </div>
                                )}
                              </div>
                            </details>
                          ) : (
                            <span className="text-[11px] font-semibold text-gray-400">
                              —
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
