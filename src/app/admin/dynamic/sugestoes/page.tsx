import Link from "next/link";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { updateProductSuggestionStatus } from "./actions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type SuggestionRow = {
  id: string;
  status: string;
  asin: string | null;
  amazonUrl: string | null;
  title: string | null;
  notes: string | null;
  reviewNotes: string | null;
  createdAt: Date;
  displayName: string;
  email: string;
};

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(value);
}

function statusClasses(status: string) {
  if (status === "approved") return "bg-emerald-50 text-emerald-700";
  if (status === "rejected") return "bg-red-50 text-red-700";
  return "bg-amber-50 text-amber-700";
}

export default async function AdminDynamicSuggestionsPage() {
  const [rows, pendingCount] = await Promise.all([
    prisma.$queryRaw<SuggestionRow[]>(Prisma.sql`
      SELECT
        s."id",
        s."status",
        s."asin",
        s."amazonUrl",
        s."title",
        s."notes",
        s."reviewNotes",
        s."createdAt",
        u."displayName",
        u."email"
      FROM "SiteProductSuggestion" s
      INNER JOIN "SiteUser" u ON u."id" = s."userId"
      ORDER BY s."createdAt" DESC
      LIMIT 200
    `),
    prisma.$queryRaw<Array<{ count: bigint }>>(Prisma.sql`
      SELECT COUNT(*)::bigint AS "count"
      FROM "SiteProductSuggestion"
      WHERE "status" = 'pending'
    `),
  ]);

  return (
    <div className="min-h-screen bg-gray-50/30 p-8 text-black">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-500">
                Comunidade
              </span>
            </div>
            <h1 className="text-4xl font-black tracking-tight text-gray-900">SUGESTÕES DE PRODUTO</h1>
            <p className="mt-1 text-sm font-medium text-gray-500">
              Ideias enviadas pelos usuários para ampliar o catálogo com moderação.
            </p>
          </div>

          <div className="flex gap-3">
            <div className="rounded-2xl border border-gray-100 bg-white px-5 py-4 shadow-sm">
              <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                Pendentes
              </div>
              <div className="mt-1 text-3xl font-black text-amber-600">
                {Number(pendingCount[0]?.count ?? 0)}
              </div>
            </div>
            <Link
              href="/admin/dynamic"
              className="rounded-2xl border border-gray-200 bg-white px-5 py-3 text-[10px] font-black uppercase tracking-widest text-gray-500 shadow-sm transition-all hover:text-black"
            >
              ← Painel dinâmico
            </Link>
          </div>
        </div>

        <div className="overflow-hidden rounded-[2rem] border border-gray-100 bg-white shadow-xl shadow-gray-200/50">
          <div className="overflow-x-auto">
            <table className="min-w-[1240px] w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-[10px] font-black uppercase tracking-widest text-gray-400">
                  <th className="p-4 text-black">Usuário</th>
                  <th className="p-4 text-black">Sugestão</th>
                  <th className="w-32 p-4 text-black">Status</th>
                  <th className="w-40 p-4 text-black">Quando</th>
                  <th className="w-64 p-4 text-black">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {rows.map((row) => (
                  <tr key={row.id} className="align-top transition-colors hover:bg-gray-50/50">
                    <td className="p-4">
                      <div className="text-[13px] font-bold text-gray-900">{row.displayName}</div>
                      <div className="mt-1 text-[12px] text-gray-500">{row.email}</div>
                    </td>
                    <td className="p-4 text-[13px] text-gray-700">
                      <div className="space-y-1">
                        {row.title ? <div><b>Título:</b> {row.title}</div> : null}
                        {row.asin ? <div><b>ASIN:</b> {row.asin}</div> : null}
                        {row.amazonUrl ? (
                          <div>
                            <a href={row.amazonUrl} target="_blank" rel="noreferrer" className="text-blue-700 underline">
                              Abrir link enviado
                            </a>
                          </div>
                        ) : null}
                        {row.notes ? <div className="whitespace-pre-line">{row.notes}</div> : null}
                        {row.reviewNotes ? (
                          <div className="rounded-xl bg-gray-50 px-3 py-2 text-[12px] text-gray-600">
                            <b>Revisão:</b> {row.reviewNotes}
                          </div>
                        ) : null}
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest ${statusClasses(row.status)}`}>
                        {row.status}
                      </span>
                    </td>
                    <td className="p-4 text-[13px] font-semibold text-gray-700">{formatDate(row.createdAt)}</td>
                    <td className="p-4">
                      <div className="flex flex-col gap-2">
                        <form action={updateProductSuggestionStatus} className="flex gap-2">
                          <input type="hidden" name="suggestionId" value={row.id} />
                          <input type="hidden" name="status" value="approved" />
                          <button type="submit" className="rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-700">
                            Aprovar
                          </button>
                        </form>
                        <form action={updateProductSuggestionStatus} className="flex gap-2">
                          <input type="hidden" name="suggestionId" value={row.id} />
                          <input type="hidden" name="status" value="rejected" />
                          <button type="submit" className="rounded-full bg-red-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-red-700">
                            Rejeitar
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
