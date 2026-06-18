import { Suspense } from "react";
import { AmazonHeader } from "@/components/dynamic/AmazonHeader";
import { BestDealGridSkeleton } from "@/components/skeletons/BestDealCardSkeleton";

export default function Loading() {
  return (
    <main className="min-h-screen bg-[#E3E6E6] pb-10">
      {/* Header real (é sempre o mesmo) em vez de skeleton. */}
      <Suspense fallback={<div className="h-14 w-full bg-[#131921]" />}>
        <AmazonHeader />
      </Suspense>

      <div className="bg-[#37475A] px-4 py-2">
        <div className="mx-auto h-4 w-64 animate-pulse rounded bg-white/20" />
      </div>

      <div className="mx-auto max-w-[1500px] px-3 py-4 md:px-5">
        <section className="rounded-2xl border border-[#d5d9d9] bg-white p-4 shadow-sm md:p-5">
          <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="space-y-2">
              <div className="h-8 w-72 animate-pulse rounded bg-gray-200" />
              <div className="h-4 w-80 animate-pulse rounded bg-gray-100" />
            </div>

            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="h-9 w-28 animate-pulse rounded-full border border-gray-200 bg-gray-100"
                />
              ))}
            </div>
          </div>

          <BestDealGridSkeleton items={10} />
        </section>
      </div>
    </main>
  );
}
