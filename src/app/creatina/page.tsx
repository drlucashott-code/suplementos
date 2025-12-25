import { prisma } from "@/lib/prisma";
import { ProductList } from "./ProductList";
import { PriceSlider } from "./PriceSlider";
import { MobileFiltersDrawer } from "./MobileFiltersDrawer";
import { DesktopFiltersSidebar } from "./DesktopFiltersSidebar";
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
     (estrutura mantém compatibilidade com ML,
      mas frontend usa apenas AMAZON)
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
          store: "AMAZON", // 👈 FONTE ÚNICA PÚBLICA
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

      // ✅ REGRA PARA CARBOIDRATO
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
    <main className="max-w-7xl mx-auto p-4 sm:p-6">
      <MobileFiltersDrawer
        brands={brands.map((b) => b.brand)}
        flavors={flavors.map((f) => f.flavor!).sort()}
      />

      <h1 className="text-2xl sm:text-3xl font-bold mb-2 text-center">
        Creatina: melhor custo-benefício
      </h1>

      <p className="text-gray-700 mb-6 max-w-4xl text-left lg:text-justify">
        Comparação baseada no menor preço por dose,
        considerando 3 g de princípio ativo, com
        valores obtidos diretamente na Amazon.
      </p>

      <div className="flex flex-col lg:flex-row gap-6">
        <aside className="hidden lg:flex flex-col gap-4 w-64">
          <DesktopFiltersSidebar
            brands={brands.map((b) => b.brand)}
            flavors={flavors.map((f) => f.flavor!).sort()}
          />
          <PriceSlider />
        </aside>

        <ProductList products={rankedProducts as any} />
      </div>
    </main>
  );
}
