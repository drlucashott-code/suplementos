import Link from "next/link";
import { notFound } from "next/navigation";
import { Prisma } from "@prisma/client";
import { AmazonHeader } from "@/components/dynamic/AmazonHeader";
import BestDealProductCard from "@/components/BestDealProductCard";
import ProductCommentsSheet from "@/components/dynamic/ProductCommentsSheet";
import { prisma } from "@/lib/prisma";

export const revalidate = 300;

export default async function ProductDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ comments?: string }>;
}) {
  const { id } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const openComments = resolvedSearchParams?.comments === "1";

  const rows = await prisma.$queryRaw<
    Array<{
      id: string;
      asin: string;
      name: string;
      totalPrice: number;
      averagePrice30d: number | null;
      imageUrl: string | null;
      url: string;
      ratingAverage: number | null;
      ratingCount: number | null;
      attributes: unknown;
      categoryName: string;
      categoryGroup: string;
      categorySlug: string;
      commentsCount: number;
    }>
  >(Prisma.sql`
    SELECT
      p."id",
      p."asin",
      p."name",
      p."totalPrice",
      p."averagePrice30d",
      p."imageUrl",
      p."url",
      p."ratingAverage",
      p."ratingCount",
      p."attributes",
      cat."name" AS "categoryName",
      cat."group" AS "categoryGroup",
      cat."slug" AS "categorySlug",
      (
        SELECT COUNT(*)::int
        FROM "SiteProductComment" c
        INNER JOIN "SiteUser" u ON u."id" = c."userId"
        WHERE c."productId" = p."id"
          AND c."status" = 'published'
          AND u."commentsBlocked" = false
      ) AS "commentsCount"
    FROM "DynamicProduct" p
    INNER JOIN "DynamicCategory" cat ON cat."id" = p."categoryId"
    WHERE p."id" = ${id}
    LIMIT 1
  `);

  const row = rows[0];
  if (!row) {
    return notFound();
  }

  const averagePrice30d = row.averagePrice30d ?? row.totalPrice;
  const discountPercent =
    averagePrice30d > row.totalPrice && row.totalPrice > 0
      ? Math.round(((averagePrice30d - row.totalPrice) / averagePrice30d) * 100)
      : 0;

  const item = {
    id: row.id,
    asin: row.asin,
    name: row.name,
    imageUrl:
      row.imageUrl || "https://m.media-amazon.com/images/I/61NJbm2a9tL._AC_SL1200_.jpg",
    url: row.url,
    totalPrice: row.totalPrice,
    averagePrice30d,
    discountPercent,
    ratingAverage: row.ratingAverage,
    ratingCount: row.ratingCount,
    likeCount: 0,
    dislikeCount: 0,
    attributes:
      row.attributes && typeof row.attributes === "object"
        ? (row.attributes as Record<string, string | number | boolean | null>)
        : {},
    categoryName: row.categoryName,
    categoryGroup: row.categoryGroup,
    categorySlug: row.categorySlug,
  };

  return (
    <main className="min-h-screen bg-[#E3E6E6] pb-10">
      <AmazonHeader />

      <div className="mx-auto max-w-[1500px] px-3 py-4 md:px-5">
        <section className="rounded-2xl border border-[#d5d9d9] bg-white p-4 shadow-sm md:p-5">
          <div className="mb-5 flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2 text-sm text-[#565959]">
              <Link
                href={`/${row.categoryGroup}/${row.categorySlug}`}
                className="font-semibold text-[#2162A1] hover:text-[#174e87]"
              >
                Voltar para {row.categoryName}
              </Link>
              <span>•</span>
              <span>Produto individual</span>
            </div>

            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <h1 className="text-[24px] font-bold text-[#0F1111]">{row.name}</h1>
                <p className="mt-1 text-[13px] text-[#565959]">
                  Abra os comentários, respostas e interações deste produto em um lugar só.
                </p>
              </div>

              <div id="comentarios" className="flex items-center gap-3">
                <ProductCommentsSheet
                  productId={row.id}
                  productName={row.name}
                  initialCount={row.commentsCount}
                  initialOpen={openComments}
                  hideTrigger
                  inline
                />
              </div>
            </div>
          </div>

          <div className="max-w-[360px]">
            <BestDealProductCard item={item} category="produto_detalhe" />
          </div>
        </section>
      </div>
    </main>
  );
}
