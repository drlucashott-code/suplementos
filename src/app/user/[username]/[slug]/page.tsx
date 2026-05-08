import Link from "next/link";
import BestDealProductCard from "@/components/BestDealProductCard";
import { AmazonHeader } from "@/components/dynamic/AmazonHeader";
import ListCommentsSheet from "@/components/dynamic/ListCommentsSheet";
import PublicListAsinSearch from "@/components/PublicListAsinSearch";
import SavePublicListButton from "@/components/SavePublicListButton";
import PublicListSortSelect from "@/components/PublicListSortSelect";
import { notFound } from "next/navigation";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentSiteUser } from "@/lib/siteAuthSession";
import { buildPublicUserPath } from "@/lib/siteSocial";

export const revalidate = 300;

type PublicUserListRow = {
  listId: string;
  title: string;
  description: string | null;
  createdAt: Date;
  ownerDisplayName: string;
  ownerUsername: string | null;
  itemId: string | null;
  itemCreatedAt: Date | null;
  note: string | null;
  productId: string | null;
  monitoredProductId: string | null;
  trackedAmazonProductId: string | null;
  productAsin: string | null;
  productName: string | null;
  productBrand: string | null;
  productImageUrl: string | null;
  productTotalPrice: number | null;
  productAveragePrice30d: number | null;
  productUrl: string | null;
  productAvailabilityStatus: string | null;
  productRatingAverage: number | null;
  productRatingCount: number | null;
  categoryName: string | null;
  categoryGroup: string | null;
  categorySlug: string | null;
  commentsCount: number;
};

export default async function PublicUserListPage({
  params,
  searchParams,
}: {
  params: Promise<{ username: string; slug: string }>;
  searchParams?: Promise<{
    sort?: string;
    order?: string;
    comments?: string;
    outOfStock?: string;
    asin?: string;
    q?: string;
    show?: string;
  }>;
}) {
  const { username, slug } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const sortMode =
    resolvedSearchParams?.order === "discount" ||
    resolvedSearchParams?.order === "price" ||
    resolvedSearchParams?.order === "alpha"
      ? resolvedSearchParams.order
      : resolvedSearchParams?.sort === "discount" ||
        resolvedSearchParams?.sort === "price" ||
        resolvedSearchParams?.sort === "alpha"
        ? resolvedSearchParams.sort
      : "creator";
  const openComments = resolvedSearchParams?.comments === "1";
  const visibilityMode =
    resolvedSearchParams?.show === "out_of_stock" ||
    resolvedSearchParams?.show === "all"
      ? resolvedSearchParams.show
      : resolvedSearchParams?.outOfStock === "1"
        ? "out_of_stock"
        : "in_stock";
  const searchQuery = (resolvedSearchParams?.q ?? resolvedSearchParams?.asin ?? "").trim();
  const normalizedSearchQuery = searchQuery.toLowerCase();

  const rows = await prisma.$queryRaw<PublicUserListRow[]>(Prisma.sql`
    SELECT
      l."id" AS "listId",
      l."title",
      l."description",
      l."createdAt",
      u."displayName" AS "ownerDisplayName",
      u."username" AS "ownerUsername",
      i."id" AS "itemId",
      i."createdAt" AS "itemCreatedAt",
      i."note",
      p."id" AS "productId",
      mp."id" AS "monitoredProductId",
      tp."id" AS "trackedAmazonProductId",
      COALESCE(p."asin", tp."asin", mp."asin") AS "productAsin",
      COALESCE(p."name", tp."name", mp."name") AS "productName",
      COALESCE(p."imageUrl", tp."imageUrl", mp."imageUrl") AS "productImageUrl",
      COALESCE(p."totalPrice", tp."totalPrice", mp."totalPrice") AS "productTotalPrice",
      COALESCE(p."averagePrice30d", tp."averagePrice30d", mp."averagePrice30d") AS "productAveragePrice30d",
      COALESCE(p."url", tp."amazonUrl", mp."amazonUrl") AS "productUrl",
      COALESCE(p."availabilityStatus", tp."availabilityStatus", mp."availabilityStatus") AS "productAvailabilityStatus",
      COALESCE(p."ratingAverage", tp."ratingAverage") AS "productRatingAverage",
      COALESCE(p."ratingCount", tp."ratingCount") AS "productRatingCount",
      COALESCE(
        NULLIF(TRIM(p."attributes"->>'brand'), ''),
        NULLIF(TRIM(p."attributes"->>'Brand'), ''),
        NULLIF(TRIM(p."attributes"->>'manufacturer'), ''),
        NULLIF(TRIM(tp."name"), ''),
        NULLIF(TRIM(mp."name"), '')
      ) AS "productBrand",
      c."name" AS "categoryName",
      c."group" AS "categoryGroup",
      c."slug" AS "categorySlug",
      (
        SELECT COUNT(*)::int
        FROM "SiteUserListComment" lc
        INNER JOIN "SiteUser" cu ON cu."id" = lc."userId"
        WHERE lc."listId" = l."id"
          AND lc."status" = 'published'
          AND cu."commentsBlocked" = false
      ) AS "commentsCount"
    FROM "SiteUserList" l
    INNER JOIN "SiteUser" u ON u."id" = l."userId"
    LEFT JOIN "SiteUserListItem" i ON i."listId" = l."id"
    LEFT JOIN "DynamicProduct" p ON p."id" = i."productId"
    LEFT JOIN "SiteUserMonitoredProduct" mp ON mp."id" = i."monitoredProductId"
    LEFT JOIN "SiteTrackedAmazonProduct" tp ON tp."id" = COALESCE(i."trackedAmazonProductId", mp."trackedProductId")
    LEFT JOIN "DynamicCategory" c ON c."id" = p."categoryId"
    WHERE l."slug" = ${slug}
      AND l."isPublic" = true
      AND u."username" = ${username}
    ORDER BY i."sortOrder" ASC NULLS LAST, i."createdAt" DESC NULLS LAST
  `);

  if (rows.length === 0) return notFound();
  const currentUser = await getCurrentSiteUser();
  const savedRows =
    currentUser
      ? await prisma.siteUserSavedList.findMany({
          where: {
            userId: currentUser.id,
            listId: rows[0]!.listId,
          },
          select: { id: true },
          take: 1,
        })
      : [];

  const items = rows
    .filter((row) => row.productName && row.productUrl && row.productAsin)
    .map((row) => {
      const totalPrice = row.productTotalPrice ?? 0;
      const averagePrice30d = row.productAveragePrice30d ?? totalPrice;
      const discountPercent =
        averagePrice30d > totalPrice && totalPrice > 0
          ? Math.round(((averagePrice30d - totalPrice) / averagePrice30d) * 100)
          : 0;

      return {
        id: row.productId ?? row.trackedAmazonProductId ?? row.monitoredProductId!,
        asin: row.productAsin!,
        name: row.productName!,
        imageUrl:
          row.productImageUrl ||
          "https://m.media-amazon.com/images/I/61NJbm2a9tL._AC_SL1200_.jpg",
        url: row.productUrl!,
        totalPrice,
        averagePrice30d,
        discountPercent,
        createdAt: row.itemCreatedAt,
        ratingAverage: row.productRatingAverage,
        ratingCount: row.productRatingCount,
        likeCount: 0,
        dislikeCount: 0,
        attributes: {
          notaLista: row.note ?? "",
          availabilityStatus: row.productAvailabilityStatus ?? "",
          brand: row.productBrand ?? "",
        },
        categoryName: row.categoryName ?? "Amazon",
        categoryGroup: row.categoryGroup ?? "amazon",
        categorySlug: row.categorySlug ?? "monitorado",
      };
    });

  const sortedItems = [...items].sort((a, b) => {
    const leftOutOfStock =
      (a.attributes.availabilityStatus ?? "") === "OUT_OF_STOCK" || a.totalPrice <= 0;
    const rightOutOfStock =
      (b.attributes.availabilityStatus ?? "") === "OUT_OF_STOCK" || b.totalPrice <= 0;

    if (leftOutOfStock !== rightOutOfStock) {
      return leftOutOfStock ? 1 : -1;
    }

    if (sortMode === "discount") {
      if (b.discountPercent !== a.discountPercent) return b.discountPercent - a.discountPercent;
      return a.totalPrice - b.totalPrice;
    }

    if (sortMode === "price") {
      if (a.totalPrice !== b.totalPrice) return a.totalPrice - b.totalPrice;
      return a.name.localeCompare(b.name, "pt-BR");
    }

    if (sortMode === "alpha") {
      return a.name.localeCompare(b.name, "pt-BR");
    }

    return 0;
  });
  const visibleItems =
    visibilityMode === "all"
      ? sortedItems
      : visibilityMode === "out_of_stock"
        ? sortedItems.filter(
            (item) =>
              item.attributes.availabilityStatus === "OUT_OF_STOCK" || item.totalPrice <= 0
          )
        : sortedItems.filter(
            (item) =>
              item.attributes.availabilityStatus !== "OUT_OF_STOCK" && item.totalPrice > 0
          );
  const filteredItems = normalizedSearchQuery
    ? visibleItems.filter((item) => {
        const haystack = [item.name, item.asin, String(item.attributes.brand ?? "")]
          .join(" ")
          .toLowerCase();
        return haystack.includes(normalizedSearchQuery);
      })
    : visibleItems;

  const firstRow = rows[0]!;
  const list = {
    id: firstRow.listId,
    title: firstRow.title,
    description: firstRow.description,
    ownerDisplayName: firstRow.ownerDisplayName,
    ownerUsername: firstRow.ownerUsername,
    createdAt: firstRow.createdAt,
    items: sortedItems,
    commentsCount: firstRow.commentsCount,
  };

  return (
    <main className="min-h-screen bg-[#E3E6E6] pb-10">
      <AmazonHeader />

      <div className="mx-auto max-w-[1500px] px-3 py-4 md:px-5">
        <section className="rounded-2xl border border-[#d5d9d9] bg-white p-4 shadow-sm md:p-5">
          <div className="mb-5 flex flex-col gap-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between md:gap-6">
              <div className="min-w-0">
                <h1 className="text-[24px] font-bold text-[#0F1111]">{list.title}</h1>
                {list.description ? (
                  <p className="mt-1 text-[13px] text-[#565959]">{list.description}</p>
                ) : null}
                <p className="mt-1 text-[13px] text-[#565959]">
                  Lista criada por {list.ownerDisplayName}
                  {list.ownerUsername ? (
                    <>
                      {" "}
                      <Link
                        href={buildPublicUserPath(list.ownerUsername)}
                        className="font-medium text-[14px] text-[#2162A1] transition hover:text-[#174e87]"
                        style={{ color: "#2162A1" }}
                      >
                        @{list.ownerUsername}
                      </Link>
                    </>
                  ) : null}
                  {" em "}
                  {new Intl.DateTimeFormat("pt-BR", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                  }).format(list.createdAt)}
                </p>
              </div>

              <SavePublicListButton listId={list.id} initialSaved={savedRows.length > 0} />
            </div>

            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_240px_280px]">
              <PublicListAsinSearch className="w-full" />
              <PublicListSortSelect
                className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 shadow-sm"
                defaultOrder="in_stock"
                paramName="show"
                label="Mostrar:"
                options={[
                  { value: "in_stock", label: "Em estoque" },
                  { value: "out_of_stock", label: "Sem estoque" },
                  { value: "all", label: "Todos os itens" },
                ]}
              />
              <PublicListSortSelect
                className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 shadow-sm"
                defaultOrder="creator"
                paramName="order"
                label="Classificar por:"
                options={[
                  { value: "creator", label: "Ordem do criador" },
                  { value: "discount", label: "Maior desconto" },
                  { value: "price", label: "Menor preço" },
                  { value: "alpha", label: "Ordem alfabética" },
                ]}
              />
            </div>
          </div>

          {filteredItems.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#d5d9d9] bg-[#F8FAFA] px-4 py-12 text-center text-sm text-[#565959]">
              {list.items.length === 0
                ? "Essa lista ainda nao tem produtos."
                : normalizedSearchQuery
                  ? "Nenhum produto encontrado nesta busca."
                  : visibilityMode === "out_of_stock"
                    ? "Nenhum produto sem estoque encontrado nesta lista."
                    : "Todos os produtos desta lista estao sem estoque no momento."}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
              {filteredItems.map((item) => (
                <BestDealProductCard key={item.id} item={item} category="lista_publica" />
              ))}
            </div>
          )}
        </section>

        <section id="comentarios" className="mt-4">
          <ListCommentsSheet
            listId={list.id}
            listTitle={list.title}
            initialCount={list.commentsCount}
            initialOpen={openComments}
            hideTrigger
            inline
          />
        </section>
      </div>
    </main>
  );
}

