"use client";

function DealCardSkeleton() {
  return (
    <div className="rounded-xl border border-[#d5d9d9] bg-white p-3 animate-pulse">
      <div className="h-[108px] rounded-lg bg-gray-100" />

      <div className="mt-3 space-y-2">
        <div className="h-4 w-full rounded bg-gray-200" />
        <div className="h-4 w-4/5 rounded bg-gray-200" />
      </div>

      <div className="mt-2 h-4 w-20 rounded bg-gray-200" />

      <div className="mt-3 flex items-end gap-2">
        <div className="h-6 w-14 rounded bg-gray-200" />
        <div className="h-4 w-6 rounded bg-gray-200" />
        <div className="h-8 w-20 rounded bg-gray-200" />
      </div>

      <div className="mt-2 h-4 w-24 rounded bg-gray-200" />
    </div>
  );
}

export function BestDealGridSkeleton({
  items = 6,
}: {
  items?: number;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
      {Array.from({ length: items }).map((_, index) => (
        <DealCardSkeleton key={index} />
      ))}
    </div>
  );
}
