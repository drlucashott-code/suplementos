import { SiteHeaderInstant } from "@/components/SiteHeaderInstant";

function ProductSkeleton({ hidden = false }: { hidden?: boolean }) {
  return (
    <div className={`${hidden ? "hidden lg:block" : "block"} min-w-0`}>
      <div className="aspect-square bg-[#F3F4F4]" />
      <div className="mt-2 h-6 w-14 rounded-sm bg-[#D5D9D9]" />
      <div className="mt-2 h-6 w-24 rounded bg-[#D5D9D9]" />
      <div className="mt-2 h-3 w-full rounded bg-[#E3E6E6]" />
      <div className="mt-2 h-3 w-4/5 rounded bg-[#E3E6E6]" />
    </div>
  );
}

export default function Loading() {
  return (
    <main className="min-h-screen bg-white">
      <SiteHeaderInstant
        searchTargetPath="/ofertas"
        searchPlaceholder="Buscar produtos"
        desktopSearchPlaceholder="O que você está procurando?"
      />
      <div className="animate-pulse" aria-hidden="true">
        <div className="flex gap-2 overflow-hidden border-b border-[#E7E7E7] px-3 py-3 lg:px-[22px] lg:py-[18px]">
          {Array.from({ length: 10 }).map((_, index) => (
            <div key={index} className="h-[76px] w-[116px] shrink-0 rounded border border-[#E3E6E6] bg-white" />
          ))}
        </div>
        <div className="border-t-[9px] border-[#F3F3F3] lg:grid lg:grid-cols-[226px_minmax(0,1fr)] lg:border-t-[14px]">
          <aside className="hidden border-r border-[#E3E6E6] px-[22px] py-6 lg:block">
            {Array.from({ length: 4 }).map((_, group) => (
              <div key={group} className="mb-6 border-b border-[#EAEDED] pb-5">
                <div className="h-4 w-24 rounded bg-[#D5D9D9]" />
                <div className="mt-3 space-y-2">
                  {Array.from({ length: 5 }).map((__, row) => (
                    <div key={row} className="h-3 w-full rounded bg-[#E3E6E6]" />
                  ))}
                </div>
              </div>
            ))}
          </aside>
          <section className="px-3 pb-10 pt-5 lg:px-[22px] lg:pt-6">
            <div className="mb-4 h-[43px] rounded-lg border border-[#D5D9D9] bg-white" />
            <div className="grid grid-cols-2 gap-x-2.5 gap-y-6 sm:grid-cols-3 lg:grid-cols-5 lg:gap-3">
              {Array.from({ length: 10 }).map((_, index) => (
                <ProductSkeleton key={index} hidden={index > 3} />
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
