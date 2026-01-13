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

  const order: "gram" | "discount" =
    params.order ?? "gram";

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

      // preço por grama de creatina (princípio ativo)
      const pricePerGram =
        offer.price /
        product.creatineInfo.totalUnits;

      // doses informativas
      const doses =
        product.creatineInfo.totalUnits /
        product.creatineInfo.unitsPerDose;

      // histórico 30 dias
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
    .filter(Boolean)
    .sort((a: any, b: any) => {
      if (order === "discount") {
        const aHas =
          a.discountPercent !== null &&
          a.discountPercent !== undefined;
        const bHas =
          b.discountPercent !== null &&
          b.discountPercent !== undefined;

        // 1️⃣ com desconto primeiro
        if (aHas && !bHas) return -1;
        if (!aHas && bHas) return 1;

        // 2️⃣ ambos com desconto → maior desconto
        if (aHas && bHas) {
          return (
            b.discountPercent! -
            a.discountPercent!
          );
        }

        // 3️⃣ nenhum com desconto → menor preço por grama
        return a.pricePerGram - b.pricePerGram;
      }

      // padrão: menor preço por grama
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
    <>
      {/* BOTÃO FLUTUANTE */}
      <FloatingFiltersBar />

      <main className="pt-[104px]">
        {/* HEADER */}
        <section className="bg-black text-white py-8 px-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-center">
            Calculadora de custo-benefício
          </h1>
        </section>

        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          {/* TEXTO INTRODUTÓRIO */}
          <section className="space-y-1 mb-6 mt-4 max-w-5xl mx-auto text-[#171717]">
            <p className="text-sm">
              Categoria: <strong>Creatina</strong>
            </p>

            <p className="text-sm">
              Produtos vendidos pela Amazon
            </p>

            <p className="text-sm mt-2">
              Compare creatinas com base no{" "}
              <strong>
                preço por grama de creatina
                (princípio ativo)
              </strong>{" "}
              e identifique boas oportunidades
              de compra.
            </p>

            <details className="text-sm mt-2">
              <summary className="cursor-pointer text-green-700 font-medium">
                Entenda o cálculo
              </summary>

              <div className="mt-2 space-y-2 max-w-3xl">
                <p>
                  O custo-benefício é calculado
                  dividindo o preço total do
                  produto pela quantidade real de
                  creatina declarada pelo
                  fabricante.
                </p>

                <p>
                  O desconto considera a variação
                  do preço total do produto em
                  relação à média dos últimos 30
                  dias.
                </p>

                <p className="text-xs text-gray-500">
                  As informações são padronizadas
                  exclusivamente para fins de
                  comparação.
                </p>
              </div>
            </details>
          </section>

          {/* FILTROS MOBILE */}
          <MobileFiltersDrawer
            brands={brands}
            flavors={flavors}
          />

          {/* DESKTOP + LISTA */}
          <div className="flex flex-col lg:flex-row gap-8 mt-6 justify-center">
            <aside className="hidden lg:block w-72 shrink-0">
              <DesktopFiltersSidebar
                brands={brands}
                flavors={flavors}
              />

              <div className="mt-4">
                <PriceSlider />
              </div>
            </aside>

            <div className="w-full max-w-3xl">
              <ProductList
                products={finalProducts as any}
              />
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
