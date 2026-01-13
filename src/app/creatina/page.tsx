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
      ...(selectedBrands.length > 0 && {
        brand: { in: selectedBrands },
      }),
      ...(selectedFlavors.length > 0 && {
        flavor: { in: selectedFlavors },
      }),
      ...(selectedForms.length > 0 && {
        creatineInfo: { form: { in: selectedForms } },
      }),
    },
    include: {
      creatineInfo: true,
      offers: {
        where: {
          store: "AMAZON",
          price: { gt: 0 },
          affiliateUrl: { not: "" },
        },
        take: 1,
        orderBy: { price: "asc" },
      },
    },
  });

  /* =========================
     PROCESSA + DESCONTO
     ========================= */
  const rankedProducts = await Promise.all(
    products.map(async (product) => {
      if (!product.creatineInfo) return null;

      const offer = product.offers[0];
      if (!offer) return null;

      if (
        maxPrice !== undefined &&
        offer.price > maxPrice
      ) {
        return null;
      }

      const pricePerGram =
        offer.price /
        product.creatineInfo.totalUnits;

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

      if (history.length >= 5) {
        const avg30 =
          history.reduce(
            (sum, h) => sum + h.price,
            0
          ) / history.length;

        const raw =
          ((avg30 - offer.price) / avg30) * 100;

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
        price: offer.price,
        affiliateUrl: offer.affiliateUrl,
        doses,
        pricePerGram,
        discountPercent,
      };
    })
  );

  /* =========================
     ORDENAÇÃO FINAL
     ========================= */
  const finalProducts = rankedProducts
    .filter(
      (p): p is NonNullable<typeof p> =>
        Boolean(p)
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
  const brands: string[] = [
    ...new Set(
      products
        .map((p) => p.brand)
        .filter(
          (b): b is string =>
            typeof b === "string"
        )
    ),
  ];

  const flavors: string[] = [
    ...new Set(
      products
        .map((p) => p.flavor)
        .filter(
          (f): f is string =>
            typeof f === "string"
        )
    ),
  ];

  /* =========================
     RENDER
     ========================= */
  return (
    <main>
      {/* HEADER */}
      <section className="bg-[#131921] text-white px-4 py-3">
        <h1 className="text-sm">
          Buscador de suplementos
        </h1>
      </section>

      <div className="max-w-[1200px] mx-auto px-3">
        {/* TEXTO INTRODUTÓRIO */}
        <section className="mt-3 mb-2 text-sm text-[#0F1111] space-y-0.5">
          <p>
            Categoria: <strong>Creatina</strong>
          </p>

          <p className="text-gray-600">
            Produtos vendidos pela Amazon
          </p>

          <details>
            <summary className="cursor-pointer text-[#007185] text-sm">
              Como o ranking é calculado
            </summary>

            <div className="mt-1 text-sm text-gray-700 space-y-1 max-w-3xl">
              <p>
                Ordenação pelo menor preço por grama
                de creatina (princípio ativo).
              </p>
              <p>
                O desconto considera a média de
                preço dos últimos 30 dias.
              </p>
            </div>
          </details>
        </section>

        {/* FILTRAR + ORDENAR (NÃO FIXO, POSIÇÃO CORRETA) */}
        <FloatingFiltersBar />

        {/* FILTROS MOBILE */}
        <MobileFiltersDrawer
          brands={brands}
          flavors={flavors}
        />

        {/* DESKTOP + LISTA */}
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

            <ProductList
              products={finalProducts}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
