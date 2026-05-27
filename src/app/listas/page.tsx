import type { Metadata } from "next";
import Link from "next/link";
import { Prisma } from "@prisma/client";
import { AmazonHeader } from "@/components/dynamic/AmazonHeader";
import { prisma } from "@/lib/prisma";
import { buildPublicListPath } from "@/lib/siteSocial";
import { buildAbsoluteUrl } from "@/lib/siteUrl";
import Image from "next/image";
import { ChevronRight, LayoutList } from "lucide-react";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Listas públicas | amazonpicks",
  description:
    "Explore listas públicas criadas por usuários, com prévias visuais dos produtos e ordenação por recentes ou mais salvamentos.",
  alternates: {
    canonical: buildAbsoluteUrl("/listas"),
  },
  openGraph: {
    title: "Listas públicas | amazonpicks",
    description:
      "Explore listas públicas criadas por usuários, com prévias visuais dos produtos e ordenação por recentes ou mais salvamentos.",
    url: buildAbsoluteUrl("/listas"),
    type: "website",
  },
};

type PublicListRow = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  createdAt: Date;
  ownerDisplayName: string;
  ownerUsername: string | null;
  itemsCount: number;
  savesCount: number;
  previewImages: string[] | null;
};

function formatListDate(value: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(value);
}

export default async function PublicListsPage({
  searchParams,
}: {
  searchParams?: Promise<{ order?: string }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const order = resolvedSearchParams?.order === "saved" ? "saved" : "recent";

  const rows = await prisma.$queryRaw<PublicListRow[]>(Prisma.sql`
    SELECT
      l."id",
      l."slug",
      l."title",
      l."description",
      l."createdAt",
      u."displayName" AS "ownerDisplayName",
      u."username" AS "ownerUsername",
      COUNT(DISTINCT i."id")::int AS "itemsCount",
      COUNT(DISTINCT s."id")::int AS "savesCount",
      ARRAY(
        SELECT COALESCE(p2."imageUrl", mp2."imageUrl", tp2."imageUrl", c2."imageUrl")
        FROM "SiteUserListItem" i2
        LEFT JOIN "DynamicProduct" p2 ON p2."id" = i2."productId"
        LEFT JOIN "SiteUserMonitoredProduct" mp2 ON mp2."id" = i2."monitoredProductId"
        LEFT JOIN "SiteTrackedAmazonProduct" tp2 ON tp2."id" = i2."trackedAmazonProductId"
        LEFT JOIN "DynamicCategory" c2 ON c2."id" = p2."categoryId"
        WHERE i2."listId" = l."id"
          AND COALESCE(p2."imageUrl", mp2."imageUrl", tp2."imageUrl", c2."imageUrl") IS NOT NULL
        ORDER BY i2."sortOrder" ASC, i2."createdAt" DESC
        LIMIT 3
      ) AS "previewImages"
    FROM "SiteUserList" l
    INNER JOIN "SiteUser" u ON u."id" = l."userId"
    LEFT JOIN "SiteUserListItem" i ON i."listId" = l."id"
    LEFT JOIN "SiteUserSavedList" s ON s."listId" = l."id"
    WHERE l."isPublic" = true
    GROUP BY l."id", u."displayName", u."username"
    ORDER BY
      ${order === "saved"
        ? Prisma.sql`COUNT(DISTINCT s."id") DESC, l."createdAt" DESC`
        : Prisma.sql`l."createdAt" DESC, COUNT(DISTINCT s."id") DESC`}
    LIMIT 120
  `);

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Listas públicas",
    url: buildAbsoluteUrl("/listas"),
    description:
      "Explore listas públicas criadas por usuários, com prévias visuais dos produtos e ordenação por recentes ou mais salvamentos.",
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: rows.length,
      itemListElement: rows.slice(0, 20).map((list, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: list.ownerUsername
          ? buildAbsoluteUrl(buildPublicListPath(list.ownerUsername, list.slug))
          : buildAbsoluteUrl(`/listas/${list.slug}`),
        name: list.title,
      })),
    },
  };

  return (
    <main className="min-h-screen bg-[#E3E6E6] pb-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <AmazonHeader />

      <div className="mx-auto max-w-[1500px] px-3 py-4 md:px-5">
        <section className="rounded-2xl border border-[#d5d9d9] bg-white p-4 shadow-sm md:p-5">
          <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-[24px] font-bold text-[#0F1111]">Listas públicas de usuários</h1>
              <p className="mt-1 text-[13px] text-[#565959]">
                Descubra listas criadas pela comunidade e acompanhe as mais recentes ou mais salvas.
              </p>
            </div>

            <div className="flex rounded-full border border-[#D5D9D9] bg-[#F8FAFA] p-1">
              <Link
                href="/listas"
                className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                  order === "recent" ? "bg-white text-[#0F1111] shadow-sm" : "text-[#565959]"
                }`}
              >
                Mais recentes
              </Link>
              <Link
                href="/listas?order=saved"
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
              Ainda não existem listas públicas.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {rows.map((list) => (
                <Link
                  key={list.id}
                  href={list.ownerUsername ? buildPublicListPath(list.ownerUsername, list.slug) : `/listas/${list.slug}`}
                  className="group rounded-[24px] border border-[#E5EBF0] bg-[#FCFDFE] p-4 transition duration-200 hover:-translate-y-0.5 hover:border-[#D1DAE3] hover:bg-white hover:shadow-[0_12px_28px_rgba(15,17,17,0.06)]"
                >
                  <div className="flex h-[94px] items-center justify-center gap-2 overflow-hidden rounded-[20px] border border-[#EEF2F6] bg-[#F8FAFC] px-3">
                    {(list.previewImages ?? []).length > 0 ? (
                      (list.previewImages ?? []).slice(0, 3).map((imageSrc, index) => (
                        <div
                          key={`${list.slug}-preview-${index}`}
                          className="relative h-16 w-16 overflow-hidden rounded-[16px] border border-[#EDF2F7] bg-white"
                        >
                          <Image
                            src={imageSrc}
                            alt={`${list.title} preview ${index + 1}`}
                            fill
                            sizes="64px"
                            className="object-contain p-1.5"
                            unoptimized
                          />
                        </div>
                      ))
                    ) : (
                      <div className="flex flex-col items-center text-center">
                        <LayoutList className="h-5 w-5 text-[#98A2B3]" />
                        <span className="mt-2 text-[11px] font-semibold text-[#667085]">
                          Prévia dos produtos
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[16px] font-bold leading-tight text-[#0F1111]">
                        {list.title}
                      </p>
                      <p className="mt-1 text-[12px] leading-5 text-[#667085]">
                        por {list.ownerDisplayName}
                        {list.ownerUsername ? ` @${list.ownerUsername}` : ""}
                      </p>
                    </div>
                    <span className="rounded-full bg-[#EEF6F7] px-2.5 py-1 text-[11px] font-bold text-[#007185]">
                      {list.itemsCount} itens
                    </span>
                  </div>

                  {list.description ? (
                    <p className="mt-3 line-clamp-3 text-[13px] leading-6 text-[#344054]">
                      {list.description}
                    </p>
                  ) : null}

                  <div className="mt-4 flex items-center justify-between border-t border-[#EEF2F6] pt-3 text-[12px] text-[#667085]">
                    <span>{formatListDate(list.createdAt)}</span>
                    <span className="inline-flex items-center gap-1 font-semibold text-[#0F1111]">
                      Abrir lista
                      <ChevronRight className="h-4 w-4 text-[#007185]" />
                    </span>
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
