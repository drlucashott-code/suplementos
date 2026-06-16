import type { Metadata } from "next";
import { cache } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Prisma } from "@prisma/client";
import { AmazonHeader } from "@/components/dynamic/AmazonHeader";
import BestDealProductCard from "@/components/BestDealProductCard";
import ProductCommentsSheet from "@/components/dynamic/ProductCommentsSheet";
import { prisma } from "@/lib/prisma";
import { buildAbsoluteUrl } from "@/lib/siteUrl";

export const revalidate = 300;

type ProductDetailRecord =
  | {
      kind: "dynamic";
      id: string;
      asin: string;
      name: string;
      imageUrl: string | null;
      totalPrice: number;
      averagePrice30d: number | null;
      ratingAverage: number | null;
      ratingCount: number | null;
      url: string;
      categoryName: string;
      categoryGroup: string;
      categorySlug: string;
      description: string;
      commentsCount: number;
    }
  | {
      kind: "tracked";
      id: string;
      asin: string;
      name: string;
      imageUrl: string | null;
      totalPrice: number;
      averagePrice30d: number | null;
      ratingAverage: number | null;
      ratingCount: number | null;
      url: string;
      categoryName: string;
      categoryGroup: string;
      categorySlug: string;
      description: string;
      commentsCount: number;
    }
  | {
      kind: "monitored";
      id: string;
      asin: string;
      name: string;
      imageUrl: string | null;
      totalPrice: number;
      averagePrice30d: number | null;
      ratingAverage: number | null;
      ratingCount: number | null;
      url: string;
      categoryName: string;
      categoryGroup: string;
      categorySlug: string;
      description: string;
      commentsCount: number;
    };

// Memoizado por request: generateMetadata() e o componente da página chamam
// isto com o mesmo id, então cache() evita resolver o produto duas vezes.
const resolveProductDetailRecord = cache(async (id: string): Promise<ProductDetailRecord | null> => {
  const dynamicRows = await prisma.$queryRaw<
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
      c."name" AS "categoryName",
      c."group" AS "categoryGroup",
      c."slug" AS "categorySlug",
      (
        SELECT COUNT(*)::int
        FROM "SiteProductComment" sc
        INNER JOIN "SiteUser" su ON su."id" = sc."userId"
        WHERE sc."productAsin" = p."asin"
          AND sc."status" = 'published'
          AND su."commentsBlocked" = false
      ) AS "commentsCount"
    FROM "DynamicProduct" p
    INNER JOIN "DynamicCategory" c ON c."id" = p."categoryId"
    WHERE p."id" = ${id}
       OR p."asin" = ${id}
    LIMIT 1
  `);

  const dynamicRow = dynamicRows[0];
  if (dynamicRow) {
    const averagePrice30d = dynamicRow.averagePrice30d ?? dynamicRow.totalPrice;
    const discountPercent =
      averagePrice30d > dynamicRow.totalPrice && dynamicRow.totalPrice > 0
        ? Math.round(((averagePrice30d - dynamicRow.totalPrice) / averagePrice30d) * 100)
        : 0;
    const descriptionParts = [
      dynamicRow.categoryName,
      dynamicRow.totalPrice > 0 ? `R$ ${dynamicRow.totalPrice.toFixed(2).replace(".", ",")}` : null,
      discountPercent > 0 ? `${discountPercent}% abaixo da média` : null,
    ].filter(Boolean);

    return {
      kind: "dynamic",
      id: dynamicRow.id,
      asin: dynamicRow.asin,
      name: dynamicRow.name,
      imageUrl: dynamicRow.imageUrl,
      totalPrice: dynamicRow.totalPrice,
      averagePrice30d: dynamicRow.averagePrice30d,
      ratingAverage: dynamicRow.ratingAverage,
      ratingCount: dynamicRow.ratingCount,
      url: dynamicRow.url,
      categoryName: dynamicRow.categoryName,
      categoryGroup: dynamicRow.categoryGroup,
      categorySlug: dynamicRow.categorySlug,
      description: descriptionParts.join(" • "),
      commentsCount: dynamicRow.commentsCount,
    };
  }

  const trackedRow = await prisma.siteTrackedAmazonProduct.findFirst({
    where: { asin: id },
    select: {
      id: true,
      asin: true,
      name: true,
      imageUrl: true,
      totalPrice: true,
      averagePrice30d: true,
      amazonUrl: true,
      ratingAverage: true,
      ratingCount: true,
    },
  });

  if (trackedRow) {
    const averagePrice30d = trackedRow.averagePrice30d ?? trackedRow.totalPrice;
    const discountPercent =
      averagePrice30d > trackedRow.totalPrice && trackedRow.totalPrice > 0
        ? Math.round(((averagePrice30d - trackedRow.totalPrice) / averagePrice30d) * 100)
        : 0;
    const descriptionParts = [
      "Produto monitorado",
      trackedRow.totalPrice > 0 ? `R$ ${trackedRow.totalPrice.toFixed(2).replace(".", ",")}` : null,
      discountPercent > 0 ? `${discountPercent}% abaixo da média` : null,
    ].filter(Boolean);

    return {
      kind: "tracked",
      id: trackedRow.id,
      asin: trackedRow.asin,
      name: trackedRow.name,
      imageUrl: trackedRow.imageUrl,
      totalPrice: trackedRow.totalPrice,
      averagePrice30d: trackedRow.averagePrice30d,
      ratingAverage: trackedRow.ratingAverage,
      ratingCount: trackedRow.ratingCount,
      url: trackedRow.amazonUrl,
      categoryName: "Produto monitorado",
      categoryGroup: "",
      categorySlug: "",
      description: descriptionParts.join(" • "),
      commentsCount: await countProductComments(trackedRow.asin),
    };
  }

  const monitoredRow = await prisma.siteUserMonitoredProduct.findFirst({
    where: { asin: id },
    select: {
      id: true,
      asin: true,
      name: true,
      imageUrl: true,
      totalPrice: true,
      averagePrice30d: true,
      amazonUrl: true,
      trackedProduct: {
        select: {
          ratingAverage: true,
          ratingCount: true,
        },
      },
    },
  });

  if (!monitoredRow) return null;

  const averagePrice30d = monitoredRow.averagePrice30d ?? monitoredRow.totalPrice;
  const discountPercent =
    averagePrice30d > monitoredRow.totalPrice && monitoredRow.totalPrice > 0
      ? Math.round(((averagePrice30d - monitoredRow.totalPrice) / averagePrice30d) * 100)
      : 0;
  const descriptionParts = [
    "Produto monitorado",
    monitoredRow.totalPrice > 0 ? `R$ ${monitoredRow.totalPrice.toFixed(2).replace(".", ",")}` : null,
    discountPercent > 0 ? `${discountPercent}% abaixo da média` : null,
  ].filter(Boolean);

  return {
    kind: "monitored",
    id: monitoredRow.id,
    asin: monitoredRow.asin,
    name: monitoredRow.name,
    imageUrl: monitoredRow.imageUrl,
    totalPrice: monitoredRow.totalPrice,
    averagePrice30d: monitoredRow.averagePrice30d,
    ratingAverage: monitoredRow.trackedProduct?.ratingAverage ?? null,
    ratingCount: monitoredRow.trackedProduct?.ratingCount ?? null,
    url: monitoredRow.amazonUrl,
    categoryName: "Produto monitorado",
    categoryGroup: "",
    categorySlug: "",
    description: descriptionParts.join(" • "),
    commentsCount: await countProductComments(monitoredRow.asin),
  };
});

async function countProductComments(productAsin: string) {
  const rows = await prisma.$queryRaw<Array<{ count: bigint }>>(Prisma.sql`
    SELECT COUNT(*)::bigint AS "count"
    FROM "SiteProductComment" c
    INNER JOIN "SiteUser" u ON u."id" = c."userId"
    WHERE c."productAsin" = ${productAsin}
      AND c."status" = 'published'
      AND u."commentsBlocked" = false
  `);

  return Number(rows[0]?.count ?? BigInt(0));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const record = await resolveProductDetailRecord(id);

  if (!record) {
    return {
      title: "Produto não encontrado | amazonpicks",
    };
  }

  const canonicalPath = `/produto/${record.asin}`;

  return {
    title: `${record.name} | amazonpicks`,
    description: record.description,
    alternates: {
      canonical: buildAbsoluteUrl(canonicalPath),
    },
    openGraph: {
      title: `${record.name} | amazonpicks`,
      description: record.description,
      url: buildAbsoluteUrl(canonicalPath),
      type: "website",
      images: record.imageUrl ? [record.imageUrl] : undefined,
    },
  };
}

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
  const record = await resolveProductDetailRecord(id);

  if (!record) {
    return notFound();
  }

  const averagePrice30d = record.averagePrice30d ?? record.totalPrice;
  const discountPercent =
    averagePrice30d > record.totalPrice && record.totalPrice > 0
      ? Math.round(((averagePrice30d - record.totalPrice) / averagePrice30d) * 100)
      : 0;
  const canonicalPath = `/produto/${record.asin}`;
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: record.name,
    url: buildAbsoluteUrl(canonicalPath),
    image: record.imageUrl ? [record.imageUrl] : undefined,
    description: record.description,
    sku: record.asin,
    brand: {
      "@type": "Brand",
      name: record.categoryName,
    },
    category: record.categoryName,
    offers: {
      "@type": "Offer",
      url: buildAbsoluteUrl(canonicalPath),
      priceCurrency: "BRL",
      price: record.totalPrice,
      availability:
        record.totalPrice > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
    },
    aggregateRating:
      record.ratingAverage && record.ratingCount && record.ratingCount > 0
        ? {
            "@type": "AggregateRating",
            ratingValue: record.ratingAverage,
            reviewCount: record.ratingCount,
          }
        : undefined,
  };

  const detailItem = {
    id: record.id,
    asin: record.asin,
    name: record.name,
    imageUrl:
      record.imageUrl || "https://m.media-amazon.com/images/I/61NJbm2a9tL._AC_SL1200_.jpg",
    url: record.url,
    totalPrice: record.totalPrice,
    averagePrice30d,
    discountPercent,
    ratingAverage: record.ratingAverage,
    ratingCount: record.ratingCount,
    likeCount: 0,
    dislikeCount: 0,
    attributes: {},
    categoryName: record.categoryName,
    categoryGroup: record.categoryGroup,
    categorySlug: record.categorySlug,
    createdAt: undefined,
  };

  return (
    <main className="min-h-screen bg-[#E3E6E6] pb-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <AmazonHeader />

      <div className="mx-auto max-w-[1500px] px-3 py-4 md:px-5">
        {record.categoryGroup && record.categorySlug ? (
          <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-[#565959]">
            <Link
              href={`/${record.categoryGroup}/${record.categorySlug}`}
              className="font-semibold text-[#2162A1] hover:text-[#174e87]"
            >
              Voltar para {record.categoryName}
            </Link>
            <span>•</span>
            <span>Produto individual</span>
          </div>
        ) : (
          <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-[#565959]">
            <Link href="/" className="font-semibold text-[#2162A1] hover:text-[#174e87]">
              Voltar ao início
            </Link>
            <span>•</span>
            <span>Produto individual</span>
          </div>
        )}

        <section className="rounded-2xl border border-[#d5d9d9] bg-white p-4 shadow-sm md:p-5">
          <h1 className="sr-only">{record.name}</h1>

          <div className="mx-auto max-w-[360px]">
            <BestDealProductCard item={detailItem} category="produto_detalhe" />
          </div>
        </section>

        <section id="comentarios" className="mt-4">
          <ProductCommentsSheet
            productId={record.asin}
            productName={record.name}
            initialCount={record.commentsCount}
            initialOpen={openComments}
            hideTrigger
            inline
          />
        </section>
      </div>
    </main>
  );
}
