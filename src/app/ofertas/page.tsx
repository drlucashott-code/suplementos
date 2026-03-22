import Image from "next/image";
import Link from "next/link";
import Header from "@/app/Header";
import TrackedDealLink from "@/components/TrackedDealLink";
import { getBestDeals } from "@/lib/bestDeals";

export const revalidate = 600;

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

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
              <TrackedDealLink
                key={item.id}
                asin={item.asin}
                href={item.url}
                productId={item.id}
                productName={item.name}
                value={item.totalPrice}
                category="pagina_ofertas"
                className="group rounded-xl border border-[#d5d9d9] bg-[#F8FAFA] p-3 text-left transition hover:border-[#aab7b8] hover:bg-white"
              >
                <div className="relative h-[110px] overflow-hidden rounded-lg bg-white">
                  <Image
                    src={item.imageUrl}
                    alt={item.name}
                    fill
                    sizes="(max-width: 768px) 42vw, 220px"
                    className="object-contain p-2"
                    unoptimized
                  />
                </div>

                <p className="mt-3 line-clamp-2 text-[13px] font-bold leading-snug text-[#0F1111]">
                  {item.name}
                </p>
                <p className="mt-1 text-[11px] text-[#565959]">{item.categoryName}</p>
                <div className="mt-2 flex justify-center">
                  <span className="rounded-full bg-[#CC0C39] px-2 py-1 text-[10px] font-black uppercase tracking-wide text-white">
                    -{item.discountPercent}%
                  </span>
                </div>
                <div className="mt-2 text-center">
                  <div className="text-[19px] font-black leading-none text-[#0F1111]">
                    {formatCurrency(item.totalPrice)}
                  </div>
                  <p className="mt-1 text-[11px] text-[#565959]">
                    De:{" "}
                    <span className="line-through">
                      {formatCurrency(item.averagePrice30d)}
                    </span>
                  </p>
                </div>
              </TrackedDealLink>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
