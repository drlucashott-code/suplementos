import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { getBestDeals } from "@/lib/bestDeals";
import ProgressiveBestDealsGrid from "@/components/ProgressiveBestDealsGrid";
import { buildAbsoluteUrl } from "@/lib/siteUrl";

export const revalidate = 600;

export const metadata: Metadata = {
  title: "Melhores ofertas do momento | amazonpicks",
  description:
    "Encontre ofertas atuais com desconto relevante, preço válido e leitura rápida do valor real da oferta.",
  alternates: {
    canonical: buildAbsoluteUrl("/ofertas"),
  },
  openGraph: {
    title: "Melhores ofertas do momento | amazonpicks",
    description:
      "Encontre ofertas atuais com desconto relevante, preço válido e leitura rápida do valor real da oferta.",
    url: buildAbsoluteUrl("/ofertas"),
    type: "website",
  },
};

const PAGE_SIZE = 50;
const POOL_SIZE = 100;
const DEALS_PER_GROUP_WHEN_ALL = 34;

const filters = [
  { label: "Todos", value: "todos" },
  { label: "Suplementos", value: "suplementos" },
  { label: "Casa", value: "casa" },
  { label: "Pets", value: "pets" },
] as const;

interface OfertasPageProps {
  searchParams: Promise<{ grupo?: string; pagina?: string }>;
}

export default async function OfertasPage({ searchParams }: OfertasPageProps) {
  const params = await searchParams;
  const selectedGroup =
    params.grupo === "suplementos" || params.grupo === "casa" || params.grupo === "pets"
      ? params.grupo
      : "todos";
  const normalizedGroup = selectedGroup === "todos" ? undefined : selectedGroup;
  const requestedPage = Math.max(1, Number.parseInt(params.pagina ?? "1", 10) || 1);

  const pool =
    selectedGroup === "todos"
      ? (
          await Promise.all([
            getBestDeals(DEALS_PER_GROUP_WHEN_ALL, "suplementos", 0),
            getBestDeals(DEALS_PER_GROUP_WHEN_ALL, "casa", 0),
            getBestDeals(DEALS_PER_GROUP_WHEN_ALL, "pets", 0),
          ])
        )
          .flat()
          .sort((a, b) => {
            if (b.discountPercent !== a.discountPercent) {
              return b.discountPercent - a.discountPercent;
            }
            if (b.averagePrice30d !== a.averagePrice30d) {
              return b.averagePrice30d - a.averagePrice30d;
            }
            return (b.ratingCount ?? 0) - (a.ratingCount ?? 0);
          })
          .slice(0, POOL_SIZE)
      : await getBestDeals(POOL_SIZE, normalizedGroup, 0);

  const totalDeals = pool.length;
  const totalPages = Math.max(1, Math.ceil(totalDeals / PAGE_SIZE));
  const currentPage = Math.min(requestedPage, totalPages);
  const deals = pool.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const buildPageHref = (page: number) => {
    const query = new URLSearchParams();

    if (selectedGroup !== "todos") {
      query.set("grupo", selectedGroup);
    }

    if (page > 1) {
      query.set("pagina", String(page));
    }

    const search = query.toString();
    return search ? `/ofertas?${search}` : "/ofertas";
  };

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Melhores ofertas do momento",
    url: buildAbsoluteUrl("/ofertas"),
    description:
      "Seleção de ofertas com desconto relevante, preço válido e leitura rápida do valor real da oferta.",
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: deals.length,
      itemListElement: deals.slice(0, 20).map((deal, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: deal.url,
        name: deal.name,
      })),
    },
  };

  return (
    <main className="min-h-screen bg-[#E3E6E6] pb-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <SiteHeader />

      <div className="mx-auto max-w-[1500px] px-3 py-4 md:px-5">
        <section className="rounded-2xl border border-[#d5d9d9] bg-white p-4 shadow-sm md:p-5">
          <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-[24px] font-bold text-[#0F1111]">
                Melhores ofertas do momento
              </h1>
              <p className="mt-1 text-[13px] text-[#565959]">
                {totalDeals} produtos com desconto relevante e preço atual válido.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {filters.map((filter) => {
                const isActive = selectedGroup === filter.value;
                const href =
                  filter.value === "todos" ? "/ofertas" : `/ofertas?grupo=${filter.value}`;

                return (
                  <Link
                    key={filter.value}
                    href={href}
                    className={`rounded-full border px-3 py-1.5 text-[12px] font-bold transition ${
                      isActive
                        ? "border-[#007185] bg-[#E6F4F1] text-[#007185]"
                        : "border-[#d5d9d9] bg-[#F8FAFA] text-[#0F1111] hover:border-[#aab7b8]"
                    }`}
                  >
                    {filter.label}
                  </Link>
                );
              })}
            </div>
          </div>

          <ProgressiveBestDealsGrid
            items={deals}
            category="pagina_ofertas"
            initialVisibleCount={PAGE_SIZE}
            step={PAGE_SIZE}
          />

          {totalPages > 1 ? (
            <div className="mt-6 flex flex-col items-center gap-3">
              <p className="text-[12px] text-[#565959]">
                Página {currentPage} de {totalPages}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Link
                  href={buildPageHref(Math.max(1, currentPage - 1))}
                  aria-disabled={currentPage === 1}
                  className={`rounded-full border px-4 py-2 text-[12px] font-bold transition ${
                    currentPage === 1
                      ? "pointer-events-none border-[#e3e6e6] bg-[#f7f8f8] text-[#9ca3af]"
                      : "border-[#d5d9d9] bg-white text-[#0F1111] hover:border-[#aab7b8]"
                  }`}
                >
                  Anterior
                </Link>

                <Link
                  href={buildPageHref(Math.min(totalPages, currentPage + 1))}
                  aria-disabled={currentPage === totalPages}
                  className={`rounded-full border px-4 py-2 text-[12px] font-bold transition ${
                    currentPage === totalPages
                      ? "pointer-events-none border-[#e3e6e6] bg-[#f7f8f8] text-[#9ca3af]"
                      : "border-[#007185] bg-[#E6F4F1] text-[#007185] hover:bg-[#d7efea]"
                  }`}
                >
                  Próxima
                </Link>
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
