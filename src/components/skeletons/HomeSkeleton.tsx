import { BestDealGridSkeleton } from "@/components/skeletons/BestDealCardSkeleton";

// Skeleton da home — espelha as seções reais do HomePremiumClient:
// faixa de confiança, hero (texto + carrossel), grade de categorias,
// "melhores ofertas" e listas públicas.
export function HomeSkeleton() {
  return (
    <div className="animate-pulse">
      {/* Faixa de confiança */}
      <div className="border-b border-[#E5EBF0] bg-[#F8FAFC]">
        <div className="mx-auto flex max-w-[1440px] items-center justify-center px-4 py-2 md:px-8">
          <div className="h-3 w-64 rounded bg-gray-200" />
        </div>
      </div>

      <div className="mx-auto max-w-[1440px] px-4 pb-8 pt-1 md:px-8">
        {/* HERO */}
        <section className="overflow-hidden rounded-[28px] border border-[#D8DEE6] bg-[linear-gradient(135deg,#131921_0%,#18283A_52%,#21405F_100%)]">
          <div className="grid gap-8 px-5 py-6 md:px-8 md:py-8 lg:grid-cols-[minmax(0,1.05fr)_420px] lg:items-center lg:px-10 lg:py-10">
            <div>
              <div className="h-4 w-40 rounded bg-white/20" />
              <div className="mt-4 space-y-3">
                <div className="h-9 w-[90%] rounded bg-white/20" />
                <div className="h-9 w-[70%] rounded bg-white/20" />
              </div>
              <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:max-w-[680px]">
                {Array.from({ length: 2 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-20 rounded-2xl border border-white/10 bg-white/10"
                  />
                ))}
              </div>
            </div>
            <div className="mx-auto aspect-[4/5] w-full max-w-[420px] rounded-[22px] bg-white/10" />
          </div>
        </section>

        {/* CATEGORIAS */}
        <section className="mt-6 rounded-[28px] border border-[#D8DEE6] bg-white px-5 py-5 shadow-[0_10px_40px_rgba(15,17,17,0.05)] md:px-7 md:py-6">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div className="max-w-[720px]">
              <div className="h-3 w-32 rounded bg-gray-200" />
              <div className="mt-3 h-8 w-64 rounded bg-gray-200" />
              <div className="mt-3 h-4 w-80 rounded bg-gray-100" />
            </div>
            <div className="grid w-full gap-3 md:max-w-[700px] md:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="h-[68px] rounded-[18px] border border-[#E5EBF0] bg-[#F8FAFC]"
                />
              ))}
            </div>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="rounded-[24px] border border-[#E5EBF0] bg-[#FCFDFE] p-3"
              >
                <div className="h-[138px] rounded-[18px] bg-gray-100" />
                <div className="mt-3 h-4 w-3/4 rounded bg-gray-200" />
                <div className="mt-2 h-3 w-1/2 rounded bg-gray-100" />
              </div>
            ))}
          </div>
        </section>

        {/* MELHORES OFERTAS */}
        <section className="mt-6 rounded-[28px] border border-[#D8DEE6] bg-white px-5 py-5 shadow-sm md:px-7 md:py-6">
          <div className="h-4 w-32 rounded bg-gray-200" />
          <div className="mt-2 mb-5 h-7 w-80 rounded bg-gray-200" />
          <BestDealGridSkeleton items={10} />
        </section>

        {/* LISTAS PÚBLICAS */}
        <section className="mt-6 rounded-[28px] border border-[#D8DEE6] bg-white px-5 py-5 shadow-sm md:px-7 md:py-6">
          <div className="h-4 w-32 rounded bg-gray-200" />
          <div className="mt-2 h-7 w-64 rounded bg-gray-200" />
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="rounded-[24px] border border-[#E5EBF0] bg-[#FCFDFE] p-4"
              >
                <div className="flex h-[94px] items-center justify-center gap-2 rounded-[20px] border border-[#EEF2F6] bg-[#F8FAFC]">
                  {Array.from({ length: 3 }).map((_, inner) => (
                    <div key={inner} className="h-16 w-16 rounded-[16px] bg-gray-100" />
                  ))}
                </div>
                <div className="mt-3 h-4 w-2/3 rounded bg-gray-200" />
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

export default HomeSkeleton;
