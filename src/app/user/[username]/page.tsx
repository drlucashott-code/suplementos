import Link from "next/link";
import { notFound } from "next/navigation";
import { Prisma } from "@prisma/client";
import { AmazonHeader } from "@/components/dynamic/AmazonHeader";
import { prisma } from "@/lib/prisma";
import { buildPublicListPath } from "@/lib/siteSocial";

export const revalidate = 300;

type PublicUserListRow = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  createdAt: Date;
  ownerDisplayName: string;
  ownerUsername: string;
  itemsCount: number;
  savesCount: number;
};

export default async function PublicUserListsPage({
  params,
  searchParams,
}: {
  params: Promise<{ username: string }>;
  searchParams?: Promise<{ order?: string }>;
}) {
  const { username } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const order = resolvedSearchParams?.order === "saved" ? "saved" : "recent";

  const rows = await prisma.$queryRaw<PublicUserListRow[]>(Prisma.sql`
    SELECT
      l."id",
      l."slug",
      l."title",
      l."description",
      l."createdAt",
      u."displayName" AS "ownerDisplayName",
      u."username" AS "ownerUsername",
      COUNT(DISTINCT i."id")::int AS "itemsCount",
      COUNT(DISTINCT s."id")::int AS "savesCount"
    FROM "SiteUserList" l
    INNER JOIN "SiteUser" u ON u."id" = l."userId"
    LEFT JOIN "SiteUserListItem" i ON i."listId" = l."id"
    LEFT JOIN "SiteUserSavedList" s ON s."listId" = l."id"
    WHERE l."isPublic" = true
      AND u."username" = ${username}
    GROUP BY l."id", u."displayName", u."username"
    ORDER BY
      ${order === "saved"
        ? Prisma.sql`COUNT(DISTINCT s."id") DESC, l."createdAt" DESC`
        : Prisma.sql`l."createdAt" DESC, COUNT(DISTINCT s."id") DESC`}
    LIMIT 120
  `);

  if (rows.length === 0) return notFound();

  const owner = rows[0]!;

  return (
    <main className="min-h-screen bg-[#E3E6E6] pb-10">
      <AmazonHeader />

      <div className="mx-auto max-w-[1500px] px-3 py-4 md:px-5">
        <section className="rounded-2xl border border-[#d5d9d9] bg-white p-4 shadow-sm md:p-5">
          <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-[24px] font-bold text-[#0F1111]">
                Listas públicas de {owner.ownerDisplayName}
              </h1>
              <p className="mt-1 text-[13px] text-[#565959]">
                @{owner.ownerUsername} • acompanhe as listas mais recentes ou mais salvas.
              </p>
            </div>

            <div className="flex rounded-full border border-[#D5D9D9] bg-[#F8FAFA] p-1">
              <Link
                href={`/user/${username}`}
                className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                  order === "recent" ? "bg-white text-[#0F1111] shadow-sm" : "text-[#565959]"
                }`}
              >
                Mais recentes
              </Link>
              <Link
                href={`/user/${username}?order=saved`}
                className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                  order === "saved" ? "bg-white text-[#0F1111] shadow-sm" : "text-[#565959]"
                }`}
              >
                Mais salvamentos
              </Link>
            </div>
          </div>

          {rows.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#d5d9d9] bg-[#F8FAFA] px-4 py-12 text-center text-sm text-[#565959]">
              Nenhuma lista pública encontrada para este usuário.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {rows.map((list) => (
                <Link
                  key={list.id}
                  href={buildPublicListPath(list.ownerUsername, list.slug)}
                  className="rounded-2xl border border-[#d5d9d9] bg-[#FCFCFD] p-5 transition hover:border-[#b8c3c4] hover:bg-white hover:shadow-sm"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-[18px] font-bold text-[#0F1111]">{list.title}</h2>
                      <p className="mt-1 text-[13px] text-[#565959]">
                        por {list.ownerDisplayName} @{list.ownerUsername} em{" "}
                        {new Intl.DateTimeFormat("pt-BR", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        }).format(list.createdAt)}
                      </p>
                    </div>
                    <span className="rounded-full bg-[#EEF2FF] px-3 py-1 text-[11px] font-bold text-[#374151]">
                      {list.itemsCount} itens
                    </span>
                  </div>

                  {list.description ? (
                    <p className="mt-3 line-clamp-3 text-[13px] leading-6 text-[#344054]">
                      {list.description}
                    </p>
                  ) : null}

                  <div className="mt-4 flex items-center gap-3 text-[12px] text-[#667085]">
                    <span>{list.savesCount} salvamentos</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
