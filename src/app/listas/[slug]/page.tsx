import Header from "@/app/Header";
import { notFound } from "next/navigation";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

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

        <section className="mt-6 grid gap-4">
          {list.items.map((item) => (
            <a
              key={item.id}
              href={item.product.url}
              target="_blank"
              rel="noreferrer"
              className="rounded-2xl border border-[#d5d9d9] bg-white p-5 shadow-sm transition hover:border-[#c7cfd0] hover:shadow-md"
            >
              <p className="text-lg font-black text-[#0F1111]">{item.product.name}</p>
              <p className="mt-1 text-sm text-[#565959]">
                {item.product.category.name} · {formatCurrency(item.product.totalPrice)}
              </p>
              {item.note ? (
                <p className="mt-3 rounded-xl bg-[#F8FAFA] px-3 py-2 text-sm text-[#344054]">
                  {item.note}
                </p>
              ) : null}
            </a>
          ))}
        </section>
      </div>
    </main>
  );
}
