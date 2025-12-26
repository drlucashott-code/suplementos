import { prisma } from "@/lib/prisma";
import { ProductList } from "./ProductList";
import { MobileFiltersDrawer } from "./MobileFiltersDrawer";
import { DesktopFiltersSidebar } from "./DesktopFiltersSidebar";
import { PriceSlider } from "./PriceSlider";
import { CreatineForm } from "@prisma/client";
import { calculateCreatineStats } from "@/lib/calculateCreatineStats";

type SearchParams = {
  brand?: string;
  form?: string;
  flavor?: string;
  priceMax?: string;
  doses?: string;
};

export default async function CreatinaPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;

  const selectedBrands = params.brand?.split(",") ?? [];
  const selectedForms =
    (params.form?.split(",") as CreatineForm[]) ?? [];
  const selectedFlavors = params.flavor?.split(",") ?? [];
  const selectedDoses = params.doses?.split(",") ?? [];

  const maxPrice = params.priceMax
    ? Number(params.priceMax)
    : undefined;

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
        orderBy: { price: "asc" },
        take: 1,
      },
    },
  });

  /* =========================
     PROCESSA + FILTRA
     ========================= */
  const rankedProducts = products
    .map((product) => {
      if (!product.creatineInfo) return null;

      const offer = product.offers[0];
      if (!offer) return null;

      if (
        maxPrice !== undefined &&
        offer.price > maxPrice
      ) {
        return null;
      }

      const stats = calculateCreatineStats({
        form: product.creatineInfo.form,
        totalUnits: product.creatineInfo.totalUnits,
        unitsPerDose: product.creatineInfo.unitsPerDose,
        price: offer.price,
      });

      if (!stats.pricePerDose) return null;

      const doses = stats.doses;

      const doseBucket =
        doses < 50
          ? "<50"
          : doses <= 100
          ? "51-100"
          : doses <= 150
          ? "101-150"
          : ">150";

      if (
        selectedDoses.length > 0 &&
        !selectedDoses.includes(doseBucket)
      ) {
        return null;
      }

      const hasCarbohydrate =
        product.creatineInfo.form === CreatineForm.GUMMY ||
        (product.creatineInfo.form === CreatineForm.POWDER &&
          product.creatineInfo.unitsPerDose > 3);

      return {
        id: product.id,
        name: product.name,
        imageUrl: product.imageUrl,
        flavor: product.flavor,
        form: product.creatineInfo.form,
        price: offer.price,
        affiliateUrl: offer.affiliateUrl,
        doses,
        pricePerDose: stats.pricePerDose,
        hasCarbohydrate,
      };
    })
    .filter(Boolean)
    .sort(
      (a, b) => a!.pricePerDose - b!.pricePerDose
    );

  /* =========================
     FILTROS DISPONÍVEIS
     ========================= */
  const brands = await prisma.product.findMany({
    where: { category: "creatina" },
    distinct: ["brand"],
    select: { brand: true },
  });

  const flavors = await prisma.product.findMany({
    where: {
      category: "creatina",
      flavor: { not: null },
    },
    distinct: ["flavor"],
    select: { flavor: true },
  });

  /* =========================
     RENDER
     ========================= */
  return (
    <main>
      {/* FAIXA PRETA */}
      <section className="bg-black text-white py-8 px-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-center">
          Calculadora de custo-benefício
        </h1>
      </section>

      {/* CONTEÚDO */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* TEXTO INTRODUTÓRIO */}
        <section className="space-y-1 mb-6 mt-4 max-w-5xl mx-auto">
          <p className="text-sm text-gray-700">
            Categoria: <strong>Creatina</strong>
          </p>

          <p className="text-sm text-gray-700">
            Produtos vendidos pela Amazon
          </p>

          <p className="text-sm text-gray-700 mt-2">
            Navegue pelos filtros e encontre a melhor
            creatina para você.
          </p>

          <details className="text-sm mt-2">
            <summary className="cursor-pointer text-green-700 font-medium">
              Entenda o cálculo
            </summary>

            <div className="mt-2 text-gray-700 space-y-2 max-w-3xl">
              <p>
                A comparação é baseada no preço por dose,
                considerando a dose diária de 3 g de
                creatina pura (princípio ativo).
              </p>

              <p>
                São considerados produtos vendidos pela
                Amazon e que apresentam boas avaliações
                dos consumidores, dentro das opções
                disponíveis para a categoria.
              </p>

              <p>
                Para cada produto, utilizamos o preço
                total informado na Amazon e a quantidade
                total de creatina declarada pelo
                fabricante para estimar o número de
                doses.
              </p>

              <p className="text-xs text-gray-500">
                As recomendações de uso dos fabricantes
                podem variar. O critério adotado neste
                site é padronizado exclusivamente para
                fins de comparação.
              </p>
            </div>
          </details>
        </section>

        {/* FILTROS MOBILE */}
        <MobileFiltersDrawer
          brands={brands.map((b) => b.brand)}
          flavors={flavors.map((f) => f.flavor!).sort()}
        />

        {/* DESKTOP */}
        <div className="flex flex-col lg:flex-row gap-8 mt-6 justify-center">
          {/* SIDEBAR */}
          <aside className="hidden lg:block w-72 shrink-0">
            <DesktopFiltersSidebar
              brands={brands.map((b) => b.brand)}
              flavors={flavors.map((f) => f.flavor!).sort()}
            />

            <div className="mt-4">
              <PriceSlider />
            </div>
          </aside>

          {/* LISTA */}
          <div className="w-full max-w-3xl">
            <ProductList products={rankedProducts as any} />
          </div>
        </div>
      </div>
    </main>
  );
}
