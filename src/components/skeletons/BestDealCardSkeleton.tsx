// Skeleton do card de melhores ofertas — espelha o BestDealProductCard real:
// imagem ~104px, título 2 linhas, rating, linha de preço com CTA (desktop)
// e CTA full-width (mobile).

function DealCardSkeleton({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex h-full animate-pulse flex-col rounded-[6px] border border-[#d5d9d9] bg-white p-2.5">
      <div
        className={`rounded-md bg-gray-100 ${compact ? "h-[72px]" : "h-[104px]"}`}
      />

      {/* título (2 linhas) */}
      <div className="mt-2 min-h-[40px] space-y-1.5">
        <div className="h-3.5 w-full rounded bg-gray-200" />
        <div className="h-3.5 w-3/5 rounded bg-gray-200" />
      </div>

      {/* rating */}
      <div className="mt-1.5 h-3 min-h-[16px] w-24 rounded bg-gray-200" />

      {/* preço + CTA (desktop ao lado) */}
      <div className="mt-2 flex items-end justify-between gap-2">
        <div className="space-y-1">
          <div className="h-6 w-20 rounded bg-gray-200" />
          <div className="h-3 w-12 rounded bg-gray-100" />
        </div>
        <div className="hidden h-9 w-16 rounded-lg bg-gray-200 lg:block" />
      </div>

      {/* CTA full-width (mobile) */}
      <div className="mt-2 h-9 w-full rounded-lg bg-gray-200 lg:hidden" />
    </div>
  );
}

export function BestDealGridSkeleton({
  items = 10,
  compact = false,
}: {
  items?: number;
  compact?: boolean;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
      {Array.from({ length: items }).map((_, index) => (
        <DealCardSkeleton key={index} compact={compact} />
      ))}
    </div>
  );
}
