import Link from "next/link";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { deleteSiteUser, toggleUserCommentsBlock } from "./actions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type UserAdminRow = {
  id: string;
  displayName: string;
  username: string | null;
  email: string;
  role: string;
  commentsBlocked: boolean;
  createdAt: Date;
  commentsCount: number;
  latestComment: string | null;
};

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(value);
}

export default async function AdminDynamicAccountsPage() {
  const rows = await prisma.$queryRaw<UserAdminRow[]>(Prisma.sql`
    SELECT
      u."id",
      u."displayName",
      u."username",
      u."email",
      u."role",
      u."commentsBlocked",
      u."createdAt",
      (
        SELECT COUNT(*)::int
        FROM "SiteProductComment" c
        WHERE c."userId" = u."id"
      ) AS "commentsCount",
      (
        SELECT c2."body"
        FROM "SiteProductComment" c2
        WHERE c2."userId" = u."id"
        ORDER BY c2."createdAt" DESC
        LIMIT 1
      ) AS "latestComment"
    FROM "SiteUser" u
    ORDER BY u."createdAt" DESC
    LIMIT 300
  `);

  return (
    <div className="min-h-screen bg-gray-50/30 p-8 text-black">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-blue-500" />
              <span className="text-[10px] font-black uppercase tracking-widest text-blue-500">
                Comunidade
              </span>
            </div>
            <h1 className="text-4xl font-black tracking-tight text-gray-900">CONTAS</h1>
            <p className="mt-1 text-sm font-medium text-gray-500">
              Usuarios cadastrados, emails, historico de comentarios e bloqueio silencioso.
            </p>
          </div>

          <Link
            href="/admin/dynamic"
            className="rounded-2xl border border-gray-200 bg-white px-5 py-3 text-[10px] font-black uppercase tracking-widest text-gray-500 shadow-sm transition-all hover:text-black"
          >
            ← Painel dinamico
          </Link>
        </div>

        <div className="overflow-hidden rounded-[2rem] border border-gray-100 bg-white shadow-xl shadow-gray-200/50">
          <div className="overflow-x-auto">
            <table className="min-w-[1320px] w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-[10px] font-black uppercase tracking-widest text-gray-400">
                  <th className="p-4 text-black">Usuario</th>
                  <th className="p-4 text-black">Email</th>
                  <th className="p-4 text-black">Comentarios</th>
                  <th className="p-4 text-black">Ultimo comentario</th>
                  <th className="p-4 text-black">Criado em</th>
                  <th className="p-4 text-black">Acoes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {rows.map((row) => (
                  <tr key={row.id} className="align-top transition-colors hover:bg-gray-50/50">
                    <td className="p-4">
                      <div className="text-[13px] font-bold text-gray-900">{row.displayName}</div>
                      <div className="mt-1 text-[12px] text-gray-500">
                        {row.username ? `@${row.username}` : "sem username"}
                      </div>
                      <div className="mt-2 inline-flex rounded-full bg-gray-100 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-gray-700">
                        {row.role}
                      </div>
                      {row.commentsBlocked ? (
                        <div className="mt-2 inline-flex rounded-full bg-red-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-red-700">
                          Comentarios bloqueados
                        </div>
                      ) : null}
                    </td>
                    <td className="p-4 text-[13px] text-gray-700">{row.email}</td>
                    <td className="p-4 text-[13px] font-bold text-gray-700">{row.commentsCount}</td>
                    <td className="p-4 text-[13px] text-gray-700">
                      <div className="max-w-[360px] whitespace-pre-line">
                        {row.latestComment ?? "Sem comentarios"}
                      </div>
                    </td>
                    <td className="p-4 text-[13px] font-semibold text-gray-700">{formatDate(row.createdAt)}</td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-2">
                        <form action={toggleUserCommentsBlock}>
                          <input type="hidden" name="userId" value={row.id} />
                          <input type="hidden" name="blocked" value={row.commentsBlocked ? "false" : "true"} />
                          <button
                            type="submit"
                            className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest ${
                              row.commentsBlocked
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-yellow-50 text-yellow-700"
                            }`}
                          >
                            {row.commentsBlocked ? "Desbloquear comentarios" : "Bloquear comentarios"}
                          </button>
                        </form>

                        <form action={deleteSiteUser}>
                          <input type="hidden" name="userId" value={row.id} />
                          <button
                            type="submit"
                            className="rounded-full bg-red-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-red-700"
                          >
                            Excluir conta
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
