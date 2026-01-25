import { prisma } from "@/lib/prisma";
import { ProductList } from "./ProductList";
import { MobileFiltersDrawer } from "./MobileFiltersDrawer";
import { DesktopFiltersSidebar } from "./DesktopFiltersSidebar";
import { PriceSlider } from "./PriceSlider";
import { FloatingFiltersBar } from "@/components/FloatingFiltersBar";
import { CreatineForm } from "@prisma/client";

type SearchParams = {
  brand?: string;
  form?: string;
  flavor?: string;
  priceMax?: string;
  order?: "gram" | "discount";
};

export default async function CreatinaPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;

  const showFallback =
    process.env.NEXT_PUBLIC_SHOW_FALLBACK_PRICE === "true";

  const order: "gram" | "discount" = params.order ?? "gram";

  const selectedBrands = params.brand?.split(",") ?? [];
  const selectedForms =
    (params.form?.split(",") as CreatineForm[]) ?? [];
  const selectedFlavors = params.flavor?.split(",") ?? [];

  const maxPrice = params.priceMax
    ? Number(params.priceMax)
    : undefined;

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  /* =========================
      BUSCA PRODUTOS
      ========================= */
  const products = await prisma.product.findMany({
    where: {
      category: "creatina",
      ...(selectedBrands.length && {
        brand: { in: selectedBrands },
      }),
      ...(selectedFlavors.length && {
        flavor: { in: selectedFlavors },
      }),
      ...(selectedForms.length && {
        creatineInfo: { form: { in: selectedForms } },
      }),
    },
    include: {
      creatineInfo: true,
      offers: {
        where: {
          store: "AMAZON",
          affiliateUrl: { not: "" },
          ...(showFallback ? {} : { price: { gt: 0 } }),
        },
        orderBy: { updatedAt: "desc" },
        take: 1,
      },
    },
  });

  /* =========================
      PROCESSA + RANKING
      ========================= */
  const rankedProducts = await Promise.all(
    products.map(async (product) => {
      if (!product.creatineInfo) return null;

      const offer = product.offers[0];
      if (!offer) return null;

      let finalPrice: number | null = offer.price;

      if (showFallback && (!finalPrice || finalPrice <= 0)) {
        const lastValid =
          await prisma.offerPriceHistory.findFirst({
            where: { offerId: offer.id },
            orderBy: { createdAt: "desc" },
            select: { price: true },
          });

        finalPrice = lastValid?.price ?? null;
      }

      if (!finalPrice || finalPrice <= 0) return null;

      if (maxPrice !== undefined && finalPrice > maxPrice)
        return null;

      const pricePerGram =
        finalPrice / product.creatineInfo.totalUnits;

      const doses =
        product.creatineInfo.totalUnits /
        product.creatineInfo.unitsPerDose;

      const history =
        await prisma.offerPriceHistory.findMany({
          where: {
            offerId: offer.id,
            createdAt: { gte: thirtyDaysAgo },
          },
          select: { price: true },
        });

      let discountPercent: number | null = null;
      let avg30: number | null = null;

      if (history.length >= 5) {
        avg30 =
          history.reduce((s, h) => s + h.price, 0) /
          history.length;

        const raw =
          ((avg30 - finalPrice) / avg30) * 100;

        if (raw >= 5) {
          discountPercent = Math.round(raw);
        }
      }

      return {
        id: product.id,
        name: product.name,
        imageUrl: product.imageUrl,
        flavor: product.flavor,
        form: product.creatineInfo.form,
        price: finalPrice,
        affiliateUrl: offer.affiliateUrl,
        doses,
        pricePerGram,
        discountPercent,
        avg30Price:
          discountPercent && avg30 ? avg30 : null,
        // ✅ Dados reais das estrelas vindos do banco
        rating: offer.ratingAverage ?? 0,
        reviewsCount: offer.ratingCount ?? 0,
      };
    })
  );

  /* =========================
      FILTRA NULL + ORDENA
      ========================= */
  const finalProducts = rankedProducts
    .filter(
      (
        p
      ): p is NonNullable<typeof p> =>
        p !== null
    )
    .sort((a, b) => {
      if (order === "discount") {
        const aHas = a.discountPercent != null;
        const bHas = b.discountPercent != null;

        if (aHas && !bHas) return -1;
        if (!aHas && bHas) return 1;

        if (aHas && bHas) {
          return (
            b.discountPercent! -
            a.discountPercent!
          );
        }
      }
      return a.pricePerGram - b.pricePerGram;
    });

  /* =========================
      FILTROS DISPONÍVEIS
      ========================= */
  const brands = [
    ...new Set(products.map((p) => p.brand)),
  ];

  const flavors = [
    ...new Set(
      products
        .map((p) => p.flavor)
        .filter(
          (f): f is string => Boolean(f)
        )
    ),
  ];

  /* =========================
      RENDER
      ========================= */
  return (
    <main>
      <section className="bg-[#131921] text-white px-4 py-3">
        <h1 className="text-sm">
          Categoria: creatina
        </h1>
      </section>

      <div className="max-w-[1200px] mx-auto px-3">
        <FloatingFiltersBar />

        <MobileFiltersDrawer
          brands={brands}
          flavors={flavors}
        />

        <div className="flex flex-col lg:flex-row gap-6 mt-4">
          <aside className="hidden lg:block w-64 shrink-0">
            <DesktopFiltersSidebar
              brands={brands}
              flavors={flavors}
            />
            <div className="mt-3">
              <PriceSlider />
            </div>
          </aside>

          <div className="w-full max-w-[680px]">
            <p className="text-xs text-gray-600 mb-2">
              {finalProducts.length} resultados
            </p>

            <ProductList products={finalProducts} />
          </div>
        </div>
      </div>
    </main>
  );
}