import Link from "next/link";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { moderateProductComment } from "./actions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type CommentAdminRow = {
  id: string;
  body: string;
  status: string;
  createdAt: Date;
  productId: string;
  productName: string;
  asin: string;
  userDisplayName: string;
  userEmail: string;
  parentId: string | null;
  likeCount: number;
};

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(value);
}

function statusClasses(status: string) {
  if (status === "hidden") return "bg-red-50 text-red-700";
  if (status === "deleted") return "bg-gray-100 text-gray-600";
  return "bg-emerald-50 text-emerald-700";
}

export default async function AdminDynamicCommentsPage() {
  const [rows, publishedCount] = await Promise.all([
    prisma.$queryRaw<CommentAdminRow[]>(Prisma.sql`
      SELECT
        c."id",
        c."body",
        c."status",
        c."createdAt",
        c."productId",
        p."name" AS "productName",
        p."asin",
        u."displayName" AS "userDisplayName",
        u."email" AS "userEmail",
        c."parentId",
        COALESCE((
          SELECT COUNT(*)::int
          FROM "SiteProductCommentReaction" r
          WHERE r."commentId" = c."id"
            AND r."reaction" = 'like'
        ), 0) AS "likeCount"
      FROM "SiteProductComment" c
      INNER JOIN "DynamicProduct" p ON p."id" = c."productId"
      INNER JOIN "SiteUser" u ON u."id" = c."userId"
      ORDER BY c."createdAt" DESC
      LIMIT 300
    `),
    prisma.$queryRaw<Array<{ count: bigint }>>(Prisma.sql`
      SELECT COUNT(*)::bigint AS "count"
      FROM "SiteProductComment"
      WHERE "status" = 'published'
    `),
  ]);

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
            <h1 className="text-4xl font-black tracking-tight text-gray-900">COMENTÁRIOS</h1>
            <p className="mt-1 text-sm font-medium text-gray-500">
              Moderação dos comentários públicos dos produtos.
            </p>
          </div>

          <div className="flex gap-3">
            <div className="rounded-2xl border border-gray-100 bg-white px-5 py-4 shadow-sm">
              <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                Publicados
              </div>
              <div className="mt-1 text-3xl font-black text-blue-600">
                {Number(publishedCount[0]?.count ?? 0)}
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
            <table className="min-w-[1320px] w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-[10px] font-black uppercase tracking-widest text-gray-400">
                  <th className="p-4 text-black">Autor</th>
                  <th className="p-4 text-black">Comentário</th>
                  <th className="p-4 text-black">Produto</th>
                  <th className="w-28 p-4 text-black">Curtidas</th>
                  <th className="w-32 p-4 text-black">Status</th>
                  <th className="w-36 p-4 text-black">Quando</th>
                  <th className="w-52 p-4 text-black">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {rows.map((row) => (
                  <tr key={row.id} className="align-top transition-colors hover:bg-gray-50/50">
                    <td className="p-4">
                      <div className="text-[13px] font-bold text-gray-900">{row.userDisplayName}</div>
                      <div className="mt-1 text-[12px] text-gray-500">{row.userEmail}</div>
                    </td>
                    <td className="p-4 text-[13px] text-gray-700">
                      {row.parentId ? (
                        <div className="mb-2 text-[10px] font-black uppercase tracking-widest text-blue-500">
                          Resposta
                        </div>
                      ) : null}
                      <div className="whitespace-pre-line">{row.body}</div>
                    </td>
                    <td className="p-4">
                      <div className="text-[13px] font-bold text-gray-900">{row.productName}</div>
                      <div className="mt-1 font-mono text-[11px] text-gray-400">{row.asin}</div>
                    </td>
                    <td className="p-4 text-[13px] font-bold text-gray-700">+ {row.likeCount}</td>
                    <td className="p-4">
                      <span className={`inline-flex rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest ${statusClasses(row.status)}`}>
                        {row.status}
                      </span>
                    </td>
                    <td className="p-4 text-[13px] font-semibold text-gray-700">{formatDate(row.createdAt)}</td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-2">
                        <Link
                          href={`/admin/dynamic/produtos/${row.productId}`}
                          className="rounded-full bg-gray-100 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-gray-700"
                        >
                          Produto
                        </Link>
                        <form action={moderateProductComment}>
                          <input type="hidden" name="commentId" value={row.id} />
                          <input type="hidden" name="status" value="hidden" />
                          <button type="submit" className="rounded-full bg-red-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-red-700">
                            Ocultar
                          </button>
                        </form>
                        <form action={moderateProductComment}>
                          <input type="hidden" name="commentId" value={row.id} />
                          <input type="hidden" name="status" value="published" />
                          <button type="submit" className="rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-700">
                            Publicar
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
