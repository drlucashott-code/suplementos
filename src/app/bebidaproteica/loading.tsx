import { AmazonHeaderSkeleton } from "@/components/skeletons/AmazonHeaderSkeleton";
import { FloatingFiltersBarSkeleton } from "@/components/skeletons/FloatingFiltersBarSkeleton";
import { ProductListSkeleton } from "@/components/skeletons/ProductCardSkeleton"; // Nome corrigido aqui

export default function Loading() {
  return (
    <main className="bg-[#EAEDED] min-h-screen">
      <AmazonHeaderSkeleton />
      <div className="max-w-[1200px] mx-auto">
        <FloatingFiltersBarSkeleton />
        <div className="px-3">
          <div className="mt-4 mb-2 px-1">
            <div className="h-4 bg-gray-200 rounded w-48 animate-pulse" />
          </div>
          <ProductListSkeleton />
        </div>
      </div>
    </main>
  );
}