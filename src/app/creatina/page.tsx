import { prisma } from "@/lib/prisma";
import { ProductList } from "./ProductList";
import { PriceSlider } from "./PriceSlider";
import { MobileFiltersDrawer } from "./MobileFiltersDrawer";
import { DesktopFiltersSidebar } from "./DesktopFiltersSidebar";
import { MobileStickySearch } from "./MobileStickySearch";
import { CreatineForm } from "@prisma/client";
import { calculateCreatineStats } from "@/lib/calculateCreatineStats";

type SearchParams = {
  brand?: string;
  form?: string;
  flavor?: string;
  priceMax?: string;
  doses?: string;
  q?: string;
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
  const searchQuery = params.q ?? "";

  const maxPrice = params.priceMax
    ? Number(params.priceMax)
    : undefined;

  /* =========================
     BUSCA PRODUTOS
     ========================= */
  const products = await prisma.product.findMany({
    where: {
      category: "creatina",

      ...(searchQuery && {
        OR: [
          {
            name: {
              contains: searchQuery,
              mode: "insensitive",
            },
          },
          {
            brand: {
              contains: searchQuery,
              mode: "insensitive",
            },
          },
        ],
      }),

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
    <main className="max-w-6xl mx-auto px-4 sm:px-6">
      {/* FILTROS MOBILE */}
      <MobileFiltersDrawer
        brands={brands.map((b) => b.brand)}
        flavors={flavors.map((f) => f.flavor!).sort()}
      />

      {/* ===== TOPO MOBILE ===== */}
      <header className="mb-6 space-y-4 text-center sm:hidden">
        <h1 className="text-2xl font-bold leading-tight">
          Creatinas com melhor custo-benefício
        </h1>

        <p className="text-sm text-gray-600 px-4">
          Ranking baseado no preço por dose (3 g),
          com valores obtidos diretamente na Amazon.
        </p>

        <div className="flex justify-center items-center gap-2 text-[11px] text-gray-500">
          <img
            src="/amazon-logo.svg"
            alt="Amazon"
            className="h-4"
          />
          <span>Preços verificados na Amazon</span>
        </div>
      </header>

      {/* ===== BUSCA STICKY MOBILE ===== */}
      <MobileStickySearch />

      {/* ===== TOPO DESKTOP ===== */}
      <header className="hidden sm:block mb-8">
        <h1 className="text-3xl font-bold mb-2 text-center">
          Creatina: melhor custo-benefício
        </h1>

        <p className="text-gray-700 max-w-4xl mx-auto text-center">
          Comparação baseada no menor preço por dose,
          considerando 3 g de princípio ativo,
          com valores obtidos diretamente na Amazon.
        </p>
      </header>

      {/* ===== CONTEÚDO ===== */}
      <div className="flex flex-col lg:flex-row gap-8 justify-center">
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
