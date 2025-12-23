import { prisma } from "@/lib/prisma";
import { ProductList } from "./ProductList";
import { PriceSlider } from "./PriceSlider";
import { CreatineForm, Store } from "@prisma/client";

type SearchParams = {
  brand?: string;
  weight?: string;
  form?: string;
  flavor?: string;
  store?: string;
  priceMax?: string;
};

const DOSE_GRAMS = 3;

export default async function CreatinaPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;

  /* =======================
     PARÂMETROS DA URL
     ======================= */
  const selectedBrands = params.brand ? params.brand.split(",") : [];
  const selectedWeights = params.weight
    ? params.weight.split(",").map(Number)
    : [];
  const selectedForms = params.form ? params.form.split(",") : [];
  const selectedFlavors = params.flavor ? params.flavor.split(",") : [];
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

      ...(selectedWeights.length > 0 && {
        weightInGrams: { in: selectedWeights },
      }),

      ...(selectedFlavors.length > 0 && {
        flavor: { in: selectedFlavors },
      }),

      ...(selectedForms.length > 0 && {
        creatineInfo: {
          form: { in: selectedForms as CreatineForm[] },
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
  const rankedProducts = products
    .map((product) => {
      if (!product.creatineInfo) return null;

      // 🔴 REGRA CRÍTICA:
      // - preço válido
      // - link afiliado obrigatório
      // - respeita filtro de loja
      const validOffers = product.offers.filter(
        (o) =>
          o.price > 0 &&
          !!o.affiliateUrl &&
          (selectedStores.length === 0 ||
            selectedStores.includes(o.store))
      );

      if (validOffers.length === 0) return null;

      const bestOffer = validOffers.reduce((best, current) =>
        current.price < best.price ? current : best
      );

      if (product.weightInGrams <= 0) return null;

      const costPerGram =
        bestOffer.price / product.weightInGrams;

      const pricePerDose =
        costPerGram * DOSE_GRAMS;

      const doses =
        product.weightInGrams / DOSE_GRAMS;

      if (
        maxPrice !== undefined &&
        bestOffer.price > maxPrice
      ) {
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

        pricePerDose,
        doses,
      };
    })
    .filter(Boolean)
    .sort(
      (a, b) => a!.pricePerDose - b!.pricePerDose
    );

  /* =======================
     OPÇÕES DE FILTRO
     ======================= */
  const brands = await prisma.product.findMany({
    where: { category: "creatina" },
    distinct: ["brand"],
    select: { brand: true },
  });

  const weights = await prisma.product.findMany({
    where: { category: "creatina" },
    distinct: ["weightInGrams"],
    select: { weightInGrams: true },
    orderBy: { weightInGrams: "asc" },
  });

  const flavors = await prisma.product.findMany({
    where: {
      category: "creatina",
      flavor: { not: null },
    },
    distinct: ["flavor"],
    select: { flavor: true },
  });

  const forms = [
    { value: CreatineForm.POWDER, label: "Pó" },
    { value: CreatineForm.CAPSULE, label: "Cápsula" },
    { value: CreatineForm.GUMMY, label: "Gummy" },
  ];

  const stores = [
    { value: Store.AMAZON, label: "Amazon" },
    { value: Store.MERCADO_LIVRE, label: "Mercado Livre" },
  ];

  /* =======================
     URL BUILDER
     ======================= */
  const buildUrl = (
    brands: string[],
    weights: number[],
    forms: string[],
    flavors: string[],
    stores: string[]
  ) => {
    const p = new URLSearchParams();

    if (brands.length > 0) p.set("brand", brands.join(","));
    if (weights.length > 0) p.set("weight", weights.join(","));
    if (forms.length > 0) p.set("form", forms.join(","));
    if (flavors.length > 0) p.set("flavor", flavors.join(","));
    if (stores.length > 0) p.set("store", stores.join(","));
    if (maxPrice !== undefined)
      p.set("priceMax", String(maxPrice));

    return `/creatina${p.toString() ? "?" + p.toString() : ""}`;
  };

  /* =======================
     RENDER
     ======================= */
  return (
    <main className="max-w-7xl mx-auto p-4 sm:p-6">
      <h1 className="text-2xl sm:text-3xl font-bold mb-2">
        Ranking de Creatinas – Melhor Custo-Benefício
      </h1>

      <p className="text-gray-700 mb-6">
        Comparamos creatinas disponíveis
        e mostramos o menor custo por dose,
        considerando preços reais e atualizados.
      </p>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* =======================
            FILTROS
           ======================= */}
        <aside className="lg:w-64 border rounded-xl p-4 h-fit">
          <h2 className="font-semibold mb-4">Filtros</h2>

          {/* LOJA */}
          <div className="mb-6">
            <p className="font-medium mb-2">Loja</p>
            <ul className="space-y-2 text-sm">
              {stores.map((s) => {
                const checked =
                  selectedStores.includes(s.value);

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
                        selectedWeights,
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

          {/* MARCA */}
          <div className="mb-6">
            <p className="font-medium mb-2">Marca</p>
            <ul className="space-y-2 text-sm">
              {brands.map((b) => {
                const checked =
                  selectedBrands.includes(b.brand);

                const next = checked
                  ? selectedBrands.filter(
                      (x) => x !== b.brand
                    )
                  : [...selectedBrands, b.brand];

                return (
                  <li key={b.brand}>
                    <a
                      href={buildUrl(
                        next,
                        selectedWeights,
                        selectedForms,
                        selectedFlavors,
                        selectedStores
                      )}
                      className="flex items-center gap-2"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        readOnly
                        className="pointer-events-none"
                      />
                      <span>{b.brand}</span>
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* PESO */}
          <div className="mb-6">
            <p className="font-medium mb-2">Peso</p>
            <ul className="space-y-2 text-sm">
              {weights.map((w) => {
                const checked =
                  selectedWeights.includes(w.weightInGrams);

                const next = checked
                  ? selectedWeights.filter(
                      (x) => x !== w.weightInGrams
                    )
                  : [...selectedWeights, w.weightInGrams];

                return (
                  <li key={w.weightInGrams}>
                    <a
                      href={buildUrl(
                        selectedBrands,
                        next,
                        selectedForms,
                        selectedFlavors,
                        selectedStores
                      )}
                      className="flex items-center gap-2"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        readOnly
                        className="pointer-events-none"
                      />
                      <span>{w.weightInGrams} g</span>
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* SABOR */}
          <div className="mb-6">
            <p className="font-medium mb-2">Sabor</p>
            <ul className="space-y-2 text-sm">
              {flavors.map((f) => {
                if (!f.flavor) return null;

                const checked =
                  selectedFlavors.includes(f.flavor);

                const next = checked
                  ? selectedFlavors.filter(
                      (x) => x !== f.flavor
                    )
                  : [...selectedFlavors, f.flavor];

                return (
                  <li key={f.flavor}>
                    <a
                      href={buildUrl(
                        selectedBrands,
                        selectedWeights,
                        selectedForms,
                        next,
                        selectedStores
                      )}
                      className="flex items-center gap-2"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        readOnly
                        className="pointer-events-none"
                      />
                      <span>{f.flavor}</span>
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* APRESENTAÇÃO */}
          <div className="mb-6">
            <p className="font-medium mb-2">
              Apresentação
            </p>
            <ul className="space-y-2 text-sm">
              {forms.map((f) => {
                const checked =
                  selectedForms.includes(f.value);

                const next = checked
                  ? selectedForms.filter(
                      (x) => x !== f.value
                    )
                  : [...selectedForms, f.value];

                return (
                  <li key={f.value}>
                    <a
                      href={buildUrl(
                        selectedBrands,
                        selectedWeights,
                        next,
                        selectedFlavors,
                        selectedStores
                      )}
                      className="flex items-center gap-2"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        readOnly
                        className="pointer-events-none"
                      />
                      <span>{f.label}</span>
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* PREÇO */}
          <PriceSlider />
        </aside>

        {/* =======================
            LISTA
           ======================= */}
        <ProductList products={rankedProducts as any} />
      </div>
    </main>
  );
}
