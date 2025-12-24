import { prisma } from "@/lib/prisma";
import { ProductList } from "./ProductList";
import { PriceSlider } from "./PriceSlider";
import { CreatineForm, Store } from "@prisma/client";
import { calculateCreatineStats } from "@/lib/calculateCreatineStats";
import { MobileFiltersDrawer } from "./MobileFiltersDrawer";

type SearchParams = {
  brand?: string;
  form?: string;
  flavor?: string;
  store?: string;
  priceMax?: string;
};

type RankedProduct = {
  id: string;
  name: string;
  imageUrl: string;
  flavor: string | null;
  form: CreatineForm;

  price: number;
  affiliateUrl: string;
  store: Store;

  doses: number;
  pricePerDose: number;
  hasCarbohydrate: boolean;
};

export default async function CreatinaPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;

  /* =======================
     PARÂMETROS DA URL
     ======================= */
  const selectedBrands = params.brand
    ? params.brand.split(",")
    : [];

  const selectedForms = params.form
    ? (params.form.split(",") as CreatineForm[])
    : [];

  const selectedFlavors = params.flavor
    ? params.flavor.split(",")
    : [];

  const selectedStores = params.store
    ? (params.store.split(",") as Store[])
    : [];

  const maxPrice = params.priceMax
    ? Number(params.priceMax)
    : undefined;

  /* =======================
     BUSCA DOS PRODUTOS
     ======================= */
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
        creatineInfo: {
          form: { in: selectedForms },
        },
      }),
    },
    include: {
      creatineInfo: true,
      offers: true,
    },
  });

  /* =======================
     RANKING + CÁLCULOS
     ======================= */
  const rankedProducts: RankedProduct[] = products
    .map((product) => {
      if (!product.creatineInfo) return null;

      const validOffers = product.offers.filter(
        (o) =>
          o.price > 0 &&
          !!o.affiliateUrl &&
          (selectedStores.length === 0 ||
            selectedStores.includes(o.store))
      );

      if (validOffers.length === 0) return null;

      const bestOffer = validOffers.reduce((best, cur) =>
        cur.price < best.price ? cur : best
      );

      if (
        maxPrice !== undefined &&
        bestOffer.price > maxPrice
      ) {
        return null;
      }

      const stats = calculateCreatineStats({
        form: product.creatineInfo.form,
        totalUnits: product.creatineInfo.totalUnits,
        unitsPerDose: product.creatineInfo.unitsPerDose,
        price: bestOffer.price,
      });

      if (!stats.pricePerDose || stats.doses <= 0) {
        return null;
      }

      return {
        id: product.id,
        name: product.name,
        imageUrl: product.imageUrl,
        flavor: product.flavor,
        form: product.creatineInfo.form,

        price: bestOffer.price,
        affiliateUrl: bestOffer.affiliateUrl,
        store: bestOffer.store,

        doses: stats.doses,
        pricePerDose: stats.pricePerDose,
        hasCarbohydrate: stats.hasCarbohydrate,
      };
    })
    .filter(
      (p): p is RankedProduct =>
        p !== null
    )
    .sort(
      (a, b) => a.pricePerDose - b.pricePerDose
    );

  /* =======================
     OPÇÕES DE FILTRO
     ======================= */
  const brands = (
    await prisma.product.findMany({
      where: { category: "creatina" },
      distinct: ["brand"],
      select: { brand: true },
    })
  ).sort((a, b) =>
    a.brand.localeCompare(b.brand)
  );

  const flavors = (
    await prisma.product.findMany({
      where: {
        category: "creatina",
        flavor: { not: null },
      },
      distinct: ["flavor"],
      select: { flavor: true },
    })
  )
    .map((f) => f.flavor!)
    .sort((a, b) => a.localeCompare(b));

  const forms = [
    { value: CreatineForm.CAPSULE, label: "Cápsula" },
    { value: CreatineForm.GUMMY, label: "Gummy" },
    { value: CreatineForm.POWDER, label: "Pó" },
  ];

  const stores = [
    { value: Store.AMAZON, label: "Amazon" },
    {
      value: Store.MERCADO_LIVRE,
      label: "Mercado Livre",
    },
  ];

  /* =======================
     URL BUILDER
     ======================= */
  const buildUrl = (
    brands: string[],
    forms: CreatineForm[],
    flavors: string[],
    stores: Store[]
  ) => {
    const p = new URLSearchParams();

    if (brands.length)
      p.set("brand", brands.join(","));
    if (forms.length)
      p.set("form", forms.join(","));
    if (flavors.length)
      p.set("flavor", flavors.join(","));
    if (stores.length)
      p.set("store", stores.join(","));
    if (maxPrice !== undefined)
      p.set("priceMax", String(maxPrice));

    return `/creatina${
      p.toString() ? "?" + p.toString() : ""
    }`;
  };

  /* =======================
     RENDER
     ======================= */
  return (
    <main className="max-w-7xl mx-auto p-4 sm:p-6">
      {/* FILTROS MOBILE */}
      <MobileFiltersDrawer
        brands={brands.map((b) => b.brand)}
        flavors={flavors}
      />

      <h1 className="text-2xl sm:text-3xl font-bold mb-2">
        Ranking de Creatinas – Melhor
        Custo-Benefício
      </h1>

      <p className="text-gray-700 mb-6">
        Comparação baseada em doses reais
        de 3 g de creatina ativa.
      </p>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* =======================
            FILTROS DESKTOP
           ======================= */}
        <aside className="lg:w-64 border rounded-xl p-4 h-fit hidden lg:block">
          <h2 className="font-semibold mb-4">
            Filtros
          </h2>

          {/* LOJA */}
          <div className="mb-6">
            <p className="font-medium mb-2">
              Loja
            </p>
            <ul className="space-y-2 text-sm">
              {stores.map((s) => {
                const checked =
                  selectedStores.includes(
                    s.value
                  );

                const next = checked
                  ? selectedStores.filter(
                      (x) => x !== s.value
                    )
                  : [...selectedStores, s.value];

                return (
                  <li key={s.value}>
                    <a
                      href={buildUrl(
                        selectedBrands,
                        selectedForms,
                        selectedFlavors,
                        next
                      )}
                      className="flex items-center gap-2"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        readOnly
                        className="pointer-events-none"
                      />
                      <span>{s.label}</span>
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>

          <PriceSlider />
        </aside>

        {/* LISTA */}
        <ProductList products={rankedProducts} />
      </div>
    </main>
  );
}
