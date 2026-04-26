import Header from "@/app/Header";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getOptimizedAmazonUrl } from "@/lib/utils";

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export default async function PublicListPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const rows = await prisma.$queryRaw<
    Array<{
      title: string;
      description: string | null;
      ownerDisplayName: string;
      itemId: string | null;
      note: string | null;
      productId: string | null;
      productName: string | null;
      productImageUrl: string | null;
      productTotalPrice: number | null;
      productUrl: string | null;
      categoryName: string | null;
      sortOrder: number | null;
      itemCreatedAt: Date | null;
    }>
  >(Prisma.sql`
    SELECT
      l."title",
      l."description",
      u."displayName" AS "ownerDisplayName",
      i."id" AS "itemId",
      i."note",
      p."id" AS "productId",
      p."name" AS "productName",
      p."imageUrl" AS "productImageUrl",
      p."totalPrice" AS "productTotalPrice",
      p."url" AS "productUrl",
      c."name" AS "categoryName",
      i."sortOrder",
      i."createdAt" AS "itemCreatedAt"
    FROM "SiteUserList" l
    INNER JOIN "SiteUser" u ON u."id" = l."userId"
    LEFT JOIN "SiteUserListItem" i ON i."listId" = l."id"
    LEFT JOIN "DynamicProduct" p ON p."id" = i."productId"
    LEFT JOIN "DynamicCategory" c ON c."id" = p."categoryId"
    WHERE l."slug" = ${slug}
      AND l."isPublic" = true
    ORDER BY i."sortOrder" ASC NULLS LAST, i."createdAt" DESC NULLS LAST
  `);

  if (rows.length === 0) return notFound();

  const list = {
    title: rows[0]!.title,
    description: rows[0]!.description,
    ownerDisplayName: rows[0]!.ownerDisplayName,
    items: rows
      .filter((row) => row.itemId && row.productId && row.productName && row.productUrl)
      .map((row) => ({
        id: row.itemId!,
        note: row.note,
        product: {
          id: row.productId!,
          name: row.productName!,
          imageUrl: row.productImageUrl,
          totalPrice: row.productTotalPrice ?? 0,
          url: row.productUrl!,
          category: {
            name: row.categoryName ?? "Sem categoria",
          },
        },
      })),
  };

  return (
    <main className="min-h-screen bg-[#E3E6E6] pb-10">
      <Header />

      <div className="mx-auto max-w-[1080px] px-4 py-8">
        <section className="rounded-3xl border border-[#d5d9d9] bg-white p-6 shadow-sm">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-[#CC0C39]">
            Lista pública
          </p>
          <h1 className="mt-3 text-3xl font-black text-[#0F1111]">{list.title}</h1>
          <p className="mt-2 text-sm text-[#565959]">
            Lista criada por {list.ownerDisplayName}
            {list.description ? ` · ${list.description}` : ""}
          </p>
        </section>

        <section className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          {list.items.map((item) => (
            <div
              key={item.id}
              className="rounded-2xl border border-[#d5d9d9] bg-white p-4 shadow-sm transition hover:border-[#c7cfd0] hover:shadow-md"
            >
              <div className="flex gap-4">
                <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-white">
                  {item.product.imageUrl ? (
                    <Image
                      src={getOptimizedAmazonUrl(item.product.imageUrl, 220)}
                      alt={item.product.name}
                      fill
                      sizes="96px"
                      className="object-contain p-2"
                      unoptimized
                    />
                  ) : null}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-sm font-black text-[#0F1111]">
                    {item.product.name}
                  </p>
                  <p className="mt-1 text-sm text-[#565959]">{item.product.category.name}</p>
                  <p className="mt-2 text-lg font-black text-[#0F1111]">
                    {formatCurrency(item.product.totalPrice)}
                  </p>
                </div>
              </div>

              {item.note ? (
                <p className="mt-3 rounded-xl bg-[#F8FAFA] px-3 py-2 text-sm text-[#344054]">
                  {item.note}
                </p>
              ) : null}

              <div className="mt-4 flex flex-wrap gap-2">
                <a
                  href={item.product.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl border border-[#d5d9d9] px-3 py-2 text-xs font-semibold text-[#0F1111] transition hover:bg-[#F7FAFA]"
                >
                  Ver na Amazon
                </a>
              </div>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
