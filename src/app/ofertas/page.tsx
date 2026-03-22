import Link from "next/link";
import Header from "@/app/Header";
import BestDealProductCard from "@/components/BestDealProductCard";
import { getBestDeals } from "@/lib/bestDeals";
export const revalidate = 600;

const filters = [
  { label: "Todos", value: "todos" },
  { label: "Suplementos", value: "suplementos" },
  { label: "Casa", value: "casa" },
] as const;

interface OfertasPageProps {
  searchParams: Promise<{ grupo?: string }>;
}

export default async function OfertasPage({ searchParams }: OfertasPageProps) {
  const params = await searchParams;
  const selectedGroup =
    params.grupo === "suplementos" || params.grupo === "casa" ? params.grupo : "todos";
  const deals = await getBestDeals(40, selectedGroup === "todos" ? undefined : selectedGroup);

  return (
    <main className="min-h-screen bg-[#E3E6E6] pb-10">
      <Header />

      <div className="bg-[#37475A] px-4 py-2 text-center text-[11px] font-medium text-white">
        Produtos com maior desconto versus a média de 30 dias.
      </div>

      <div className="mx-auto max-w-[1500px] px-3 py-4 md:px-5">
        <section className="rounded-2xl border border-[#d5d9d9] bg-white p-4 shadow-sm md:p-5">
          <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-[24px] font-bold text-[#0F1111]">Melhores ofertas do momento</h1>
              <p className="mt-1 text-[13px] text-[#565959]">
                {deals.length} produtos com desconto relevante e preço atual válido.
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

          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
            {deals.map((item) => (
              <BestDealProductCard
                key={item.id}
                item={item}
                category="pagina_ofertas"
              />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
