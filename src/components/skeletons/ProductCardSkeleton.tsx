// Skeletons do card de catálogo — espelham o MobileProductCard real:
// variante horizontal no mobile (lg:hidden) e vertical no desktop (lg:flex).

function Block({ className = "" }: { className?: string }) {
  return <div className={`rounded bg-gray-200 ${className}`} />;
}

/** Mini-tabela técnica (mesmo grid de N colunas do card real). */
function TableSkeleton({ columns = 3 }: { columns?: number }) {
  return (
    <div className="mb-3 grid gap-2 divide-x divide-zinc-200 rounded border border-zinc-200 p-2">
      <div
        className="grid"
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: columns }).map((_, index) => (
          <div key={index} className="flex flex-col items-center gap-1 px-1">
            <Block className="h-3.5 w-10" />
            <Block className="h-2 w-12 bg-gray-100" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ProductSkeleton() {
  return (
    <>
      {/* MOBILE: card horizontal (espelha lg:hidden) */}
      <div className="relative flex min-h-[250px] items-stretch gap-3 rounded-xl border border-[#D5D9D9] bg-white font-sans shadow-[0_1px_3px_rgba(15,17,17,0.06)] lg:hidden">
        <div className="flex w-[160px] flex-shrink-0 items-center justify-center rounded-l-xl bg-[#f3f3f3] p-2">
          <div className="h-[180px] w-[120px] animate-pulse rounded bg-gray-200" />
        </div>
        <div className="flex min-w-0 flex-1 animate-pulse flex-col py-4 pr-2">
          <div className="mb-2 space-y-1.5">
            <Block className="h-3.5 w-full" />
            <Block className="h-3.5 w-4/5" />
            <Block className="h-3.5 w-3/5" />
          </div>
          <div className="mb-2 flex items-center gap-1.5">
            <Block className="h-3 w-8" />
            <Block className="h-3 w-20" />
          </div>
          <TableSkeleton columns={3} />
          <div className="mt-auto space-y-2">
            <Block className="h-7 w-28" />
            <Block className="h-9 w-full rounded-lg" />
          </div>
        </div>
      </div>

      {/* DESKTOP: card vertical (espelha hidden lg:flex) */}
      <div className="hidden h-full animate-pulse flex-col rounded-xl border border-[#D5D9D9] bg-white font-sans shadow-[0_1px_3px_rgba(15,17,17,0.06)] lg:flex">
        <div className="flex h-[190px] w-full items-center justify-center rounded-t-xl bg-[#f3f3f3] p-4">
          <div className="h-[150px] w-[60%] rounded bg-gray-200" />
        </div>
        <div className="flex flex-1 flex-col p-3">
          <div className="mb-1 min-h-[36px] space-y-1.5">
            <Block className="h-3.5 w-full" />
            <Block className="h-3.5 w-3/4" />
          </div>
          <div className="mb-2 flex items-center gap-1.5">
            <Block className="h-3 w-8" />
            <Block className="h-3 w-16" />
          </div>
          <TableSkeleton columns={3} />
          <div className="mt-auto space-y-2">
            <Block className="h-8 w-32" />
            <Block className="h-9 w-full rounded-lg" />
          </div>
        </div>
      </div>
    </>
  );
}

export function ProductListSkeleton({ items = 8 }: { items?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {Array.from({ length: items }).map((_, index) => (
        <ProductSkeleton key={index} />
      ))}
    </div>
  );
}
