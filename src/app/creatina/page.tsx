import { prisma } from "@/lib/prisma";
import { ProductList } from "./ProductList";
import { PriceSlider } from "./PriceSlider";
import { MobileFiltersDrawer } from "./MobileFiltersDrawer";
import { DesktopFiltersSidebar } from "./DesktopFiltersSidebar";
import { CreatineForm, Store } from "@prisma/client";
import { calculateCreatineStats } from "@/lib/calculateCreatineStats";

type SearchParams = {
  brand?: string;
  form?: string;
  flavor?: string;
  store?: string;
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
  const selectedStores =
    (params.store?.split(",") as Store[]) ?? [];
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
      offers: true,
    },
  });

  /* =========================
     PROCESSA + FILTRA
     ========================= */
  const rankedProducts = products
    .map((product) => {
      if (!product.creatineInfo) return null;

      const validOffers = product.offers.filter(
        (offer) =>
          offer.price > 0 &&
          !!offer.affiliateUrl &&
          (selectedStores.length === 0 ||
            selectedStores.includes(offer.store))
      );

      if (!validOffers.length) return null;

      const bestOffer = validOffers.reduce((a, b) =>
        b.price < a.price ? b : a
      );

      if (
        maxPrice !== undefined &&
        bestOffer.price > maxPrice
      ) {
        return null;
      }

      const mercadoLivreOffer = product.offers.find(
        (offer) =>
          offer.store === Store.MERCADO_LIVRE &&
          offer.ratingAverage !== null &&
          offer.ratingAverage !== undefined
      );

      const stats = calculateCreatineStats({
        form: product.creatineInfo.form,
        totalUnits: product.creatineInfo.totalUnits,
        unitsPerDose: product.creatineInfo.unitsPerDose,
        price: bestOffer.price,
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

      // ✅ REGRA CORRETA PARA CARBOIDRATO
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

        price: bestOffer.price,
        affiliateUrl: bestOffer.affiliateUrl,
        store: bestOffer.store,

        doses,
        pricePerDose: stats.pricePerDose!,

        ratingAverage:
          mercadoLivreOffer?.ratingAverage ?? null,

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
        Comparação baseada no menor preço por dose, considerando
        3 g de princípio ativo, entre os produtos mais bem
        avaliados do mercado.
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
