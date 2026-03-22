import { AmazonHeaderSkeleton } from "@/components/skeletons/AmazonHeaderSkeleton";
import { FloatingFiltersBarSkeleton } from "@/components/skeletons/FloatingFiltersBarSkeleton";
import { ProductListSkeleton } from "@/components/skeletons/ProductCardSkeleton";

export default function Loading() {
  return (
    <main className="min-h-screen bg-[#EAEDED]">
      <AmazonHeaderSkeleton />

      <div className="mx-auto max-w-[1200px]">
        <FloatingFiltersBarSkeleton />

        <div className="px-3">
          <div className="mt-4 w-full pb-10">
            <div className="mb-2 h-4 w-56 animate-pulse rounded bg-gray-200" />
            <div className="mb-3 h-4 w-64 animate-pulse rounded bg-gray-100" />

            <div className="w-full">
              <ProductListSkeleton />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
