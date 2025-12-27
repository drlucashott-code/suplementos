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
};

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
  pricePerProtein: number;
};

export default async function WheyPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;

  const selectedBrands = params.brand?.split(",") ?? [];
  const selectedFlavors = params.flavor?.split(",") ?? [];
  const maxPrice = params.priceMax
    ? Number(params.priceMax)
    : undefined;
  const order = params.order ?? "cost";

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

  const rankedProducts: RankedProduct[] = products
    .map((product) => {
      if (!product.wheyInfo) return null;
      const offer = product.offers[0];
      if (!offer) return null;

      if (maxPrice !== undefined && offer.price > maxPrice)
        return null;

      const protein = product.wheyInfo.proteinPerDoseInGrams;
      const dose = product.wheyInfo.doseInGrams;
      const proteinPercent = (protein / dose) * 100;
      const pricePerProtein = offer.price / protein;

      return {
        id: product.id,
        name: product.name,
        imageUrl: product.imageUrl,
        flavor: product.flavor,
        price: offer.price,
        affiliateUrl: offer.affiliateUrl,
        protein,
        dose,
        proteinPercent,
        pricePerProtein,
      };
    })
    .filter((p): p is RankedProduct => p !== null)
    .sort((a, b) => {
      if (order === "protein") {
        if (b.proteinPercent !== a.proteinPercent) {
          return b.proteinPercent - a.proteinPercent;
        }
        return a.pricePerProtein - b.pricePerProtein;
      }
      return a.pricePerProtein - b.pricePerProtein;
    });

  const brands = await prisma.product.findMany({
    where: { category: "whey" },
    distinct: ["brand"],
    select: { brand: true },
  });

  const flavors = await prisma.product.findMany({
    where: { category: "whey", flavor: { not: null } },
    distinct: ["flavor"],
    select: { flavor: true },
  });

  return (
    <main>
      <section className="bg-black text-white py-8 px-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-center">
          Whey Protein — custo-benefício
        </h1>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <section className="space-y-1 mb-6 mt-4 max-w-5xl mx-auto text-[#171717]">
          <p className="text-sm">
            Categoria: <strong>Whey Protein</strong>
          </p>
          <p className="text-sm">
            Produtos vendidos pela Amazon
          </p>
          <p className="text-sm mt-2">
            Compare wheys pelo menor preço por grama de proteína ou
            pela maior porcentagem de proteína por dose.
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
            <ProductList products={rankedProducts} />
          </div>
        </div>
      </div>
    </main>
  );
}
