function SkeletonProductCard({ index }: { index: number }) {
  return (
    <div
      className={`${index > 1 ? "hidden sm:block" : "block"} min-w-0 border border-[#D5D9D9] bg-white p-3 lg:border-0 lg:border-b lg:border-r lg:border-[#D5D9D9]`}
    >
      <div className="aspect-square bg-[#F3F4F4]" />
      <div className="mt-3 h-6 w-14 rounded-sm bg-[#D5D9D9]" />
      <div className="mt-2 h-6 w-24 rounded bg-[#D5D9D9]" />
      <div className="mt-2 h-3 w-32 max-w-full rounded bg-[#EAeded]" />
      <div className="mt-3 space-y-2">
        <div className="h-3.5 w-full rounded bg-[#E3E6E6]" />
        <div className="h-3.5 w-4/5 rounded bg-[#E3E6E6]" />
      </div>
    </div>
  );
}

export function HomeSkeleton() {
  return (
    <main className="animate-pulse" aria-hidden="true">
      <section className="bg-[#F3F4F4]">
        <div className="mx-auto max-w-[1480px] px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
          <div className="h-9 w-48 rounded bg-[#D5D9D9]" />

          <div className="mt-4 flex gap-2 overflow-hidden pb-2">
            {Array.from({ length: 7 }).map((_, index) => (
              <div
                key={index}
                className="h-9 w-28 shrink-0 rounded-full border border-[#D5D9D9] bg-white"
              />
            ))}
          </div>

          <div className="-mx-4 mt-3 grid grid-cols-2 gap-3 px-4 sm:mx-0 sm:grid-cols-3 sm:px-0 lg:grid-cols-6 lg:gap-0 lg:border-l lg:border-t lg:border-[#D5D9D9]">
            {Array.from({ length: 6 }).map((_, index) => (
              <SkeletonProductCard key={index} index={index} />
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-[1480px] px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
          <div className="h-8 w-80 max-w-[85%] rounded bg-[#D5D9D9]" />
          <div className="mt-5 flex gap-2">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="h-10 w-32 rounded-full border border-[#D5D9D9] bg-white"
              />
            ))}
          </div>
          <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-8">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className={index > 3 ? "hidden lg:block" : "block"}>
                <div className="aspect-square rounded-lg bg-[#F3F4F4]" />
                <div className="mx-auto mt-3 h-4 w-24 max-w-[80%] rounded bg-[#D5D9D9]" />
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="border-t border-[#D5D9D9] bg-white">
        <section className="mx-auto max-w-[1480px] px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
          <div className="h-8 w-64 rounded bg-[#D5D9D9]" />
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className={`${index > 1 ? "hidden lg:block" : "block"} border border-[#D5D9D9] bg-white p-4`}
              >
                <div className="h-24 bg-[#F3F4F4]" />
                <div className="mt-3 h-4 w-3/4 rounded bg-[#D5D9D9]" />
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

export default HomeSkeleton;
