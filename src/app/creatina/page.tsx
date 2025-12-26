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
          price: { gt: 0 },
          affiliateUrl: { not: "" },
        },
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
        pricePerDose: stats.pricePerDose!,
        hasCarbohydrate,
      };
    })
    .filter(Boolean)
    .sort(
      (a, b) => a!.pricePerDose - b!.pricePerDose
    );

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

      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        {/* BLOCO INTRODUTÓRIO */}
        <section className="space-y-1 mb-6">
          {/* CENTRALIZADOS */}
          <p className="text-sm text-gray-700 text-center">
            Categoria: <strong>Creatina</strong>
          </p>

          <p className="text-sm text-gray-700 text-center">
            Produtos vendidos pela Amazon
          </p>

          {/* ALINHADO À ESQUERDA */}
          <p className="text-sm text-gray-700 mt-2">
            Navegue pelos filtros e encontre a melhor
            creatina para você.
          </p>

          {/* ENTENDA O CÁLCULO */}
          <details className="text-sm mt-2">
            <summary className="cursor-pointer text-green-700 font-medium">
              Entenda o cálculo
            </summary>

            <div className="mt-2 text-gray-700 space-y-2 max-w-3xl">
              <p>
                A comparação é baseada no preço por
                dose, considerando a dose diária de
                3 g de creatina pura (princípio ativo).
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

        {/* FILTRO MOBILE */}
        <MobileFiltersDrawer
          brands={brands.map((b) => b.brand)}
          flavors={flavors.map((f) => f.flavor!).sort()}
        />

        <div className="flex flex-col lg:flex-row gap-6 mt-4">
          <aside className="hidden lg:flex flex-col gap-4 w-64">
            <DesktopFiltersSidebar
              brands={brands.map((b) => b.brand)}
              flavors={flavors.map((f) => f.flavor!).sort()}
            />
            <PriceSlider />
          </aside>

          <ProductList products={rankedProducts as any} />
        </div>
      </div>
    </main>
  );
}
