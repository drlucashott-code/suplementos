import { prisma } from "@/lib/prisma";
import { ProductList } from "./ProductList";
import { MobileFiltersDrawer } from "./MobileFiltersDrawer";
import { DesktopFiltersSidebar } from "./DesktopFiltersSidebar";
import { PriceSlider } from "./PriceSlider";

export type SearchParams = {
  brand?: string;
  flavor?: string;
  priceMax?: string;
  order?: "cost" | "protein";
  proteinRange?: string; // 50-60 | 60-70 | 70-80 | 80-90 | 90-100
  page?: string;
};

const PAGE_SIZE = 30;

type RankedProduct = {
  id: string;
  name: string;
  imageUrl: string;
  flavor: string | null;

  price: number;
  affiliateUrl: string;

  protein: number;
  dose: number;
  proteinPercent: number;
  numberOfDoses: number;
  pricePerGramProtein: number;
};

/* ======================
   PROTEIN RANGE MATCH
====================== */
function matchProteinRange(
  percent: number,
  range: string
): boolean {
  if (!Number.isFinite(percent)) return false;

  switch (range) {
    case "50-60":
      return percent >= 50 && percent < 60;
    case "60-70":
      return percent >= 60 && percent < 70;
    case "70-80":
      return percent >= 70 && percent < 80;
    case "80-90":
      return percent >= 80 && percent < 90;
    case "90-100":
      return percent >= 90 && percent <= 100;
    default:
      return true;
  }
}

export default async function WheyPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;

  const selectedBrands = params.brand?.split(",") ?? [];
  const selectedFlavors = params.flavor?.split(",") ?? [];
  const selectedProteinRanges =
    params.proteinRange?.split(",") ?? [];

  const maxPrice = params.priceMax
    ? Number(params.priceMax)
    : undefined;

  const order = params.order ?? "cost";
  const currentPage = Math.max(Number(params.page) || 1, 1);

  /* ======================
     BUSCA PRODUTOS
  ====================== */
  const products = await prisma.product.findMany({
    where: {
      category: "whey",
      ...(selectedBrands.length > 0 && {
        brand: { in: selectedBrands },
      }),
      ...(selectedFlavors.length > 0 && {
        flavor: { in: selectedFlavors },
      }),
    },
    include: {
      offers: {
        where: {
          store: "AMAZON",
          price: { gt: 0 },
          affiliateUrl: { not: "" },
        },
        orderBy: { price: "asc" },
        take: 1,
      },
      wheyInfo: true,
    },
  });

  /* ======================
     PROCESSA + FILTRA
  ====================== */
  const rankedProducts: RankedProduct[] = products
    .map((product) => {
      if (!product.wheyInfo) return null;

      const offer = product.offers[0];
      if (!offer) return null;

      if (maxPrice !== undefined && offer.price > maxPrice)
        return null;

      const proteinPerDose =
        product.wheyInfo.proteinPerDoseInGrams;
      const dose = product.wheyInfo.doseInGrams;
      const totalWeight =
        product.wheyInfo.totalWeightInGrams;

      if (
        !proteinPerDose ||
        !dose ||
        !totalWeight ||
        dose <= 0 ||
        totalWeight <= 0
      ) {
        return null;
      }

      const proteinPercent =
        (proteinPerDose / dose) * 100;

      if (
        selectedProteinRanges.length > 0 &&
        !selectedProteinRanges.some((r) =>
          matchProteinRange(proteinPercent, r)
        )
      ) {
        return null;
      }

      const numberOfDoses = totalWeight / dose;
      const totalProtein =
        totalWeight * (proteinPercent / 100);

      if (!Number.isFinite(totalProtein) || totalProtein <= 0)
        return null;

      const pricePerGramProtein =
        offer.price / totalProtein;

      if (!Number.isFinite(pricePerGramProtein))
        return null;

      return {
        id: product.id,
        name: product.name,
        imageUrl: product.imageUrl,
        flavor: product.flavor,

        price: offer.price,
        affiliateUrl: offer.affiliateUrl,

        protein: proteinPerDose,
        dose,
        proteinPercent,
        numberOfDoses,
        pricePerGramProtein,
      };
    })
    .filter((p): p is RankedProduct => p !== null)
    .sort((a, b) => {
      if (order === "protein") {
        if (b.proteinPercent !== a.proteinPercent) {
          return b.proteinPercent - a.proteinPercent;
        }
        return (
          a.pricePerGramProtein -
          b.pricePerGramProtein
        );
      }
      return (
        a.pricePerGramProtein -
        b.pricePerGramProtein
      );
    });

  /* ======================
     PAGINAÇÃO
  ====================== */
  const totalPages = Math.max(
    Math.ceil(rankedProducts.length / PAGE_SIZE),
    1
  );

  const safePage = Math.min(currentPage, totalPages);

  const paginatedProducts = rankedProducts.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );

  /* ======================
     FILTROS DISPONÍVEIS
  ====================== */
  const brands = await prisma.product.findMany({
    where: { category: "whey" },
    distinct: ["brand"],
    select: { brand: true },
  });

  const flavors = await prisma.product.findMany({
    where: {
      category: "whey",
      flavor: { not: null },
    },
    distinct: ["flavor"],
    select: { flavor: true },
  });

  /* ======================
     RENDER
  ====================== */
  return (
    <main>
      <section className="bg-black text-white py-8 px-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-center">
          Calculadora de custo-benefício
        </h1>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <section className="space-y-1 mb-6 mt-4 max-w-5xl mx-auto text-[#171717]">
          <p className="text-sm">
            Categoria: <strong>Whey Protein</strong>
          </p>
          <p className="text-sm">
            Produtos vendidos pela Amazon e com as melhores
            avaliações do mercado
          </p>
        </section>

        <MobileFiltersDrawer
          brands={brands.map((b) => b.brand)}
          flavors={flavors.map((f) => f.flavor!).sort()}
        />

        <div className="flex flex-col lg:flex-row gap-8 mt-6 justify-center">
          <aside className="hidden lg:block w-72 shrink-0">
            <DesktopFiltersSidebar
              brands={brands.map((b) => b.brand)}
              flavors={flavors.map((f) => f.flavor!).sort()}
            />
            <div className="mt-4">
              <PriceSlider />
            </div>
          </aside>

          <div className="w-full max-w-3xl">
            {paginatedProducts.length === 0 ? (
              <div className="text-center text-sm text-gray-600 py-16">
                Nenhum produto encontrado.
              </div>
            ) : (
              <>
                <ProductList products={paginatedProducts} />

                {totalPages > 1 && (
                  <div className="flex justify-center gap-2 mt-8">
                    {Array.from({ length: totalPages }).map(
                      (_, i) => {
                        const page = i + 1;
                        const qs = new URLSearchParams(
                          params as any
                        );
                        qs.set("page", String(page));

                        return (
                          <a
                            key={page}
                            href={`/whey?${qs.toString()}`}
                            className={`px-3 py-1 rounded text-sm ${
                              page === safePage
                                ? "bg-black text-white"
                                : "bg-gray-100"
                            }`}
                          >
                            {page}
                          </a>
                        );
                      }
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
