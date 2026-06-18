import { Suspense } from "react";
import { AmazonHeader } from "@/components/dynamic/AmazonHeader";
import { FloatingFiltersBarSkeleton } from "@/components/skeletons/FloatingFiltersBarSkeleton";
import { DesktopFiltersSidebarSkeleton } from "@/components/skeletons/FiltersSidebarSkeleton";
import { ProductListSkeleton } from "@/components/skeletons/ProductCardSkeleton";

export default function Loading() {
  return (
    <main className="min-h-screen bg-[#EAEDED]">
      {/* Header real (é sempre o mesmo) em vez de skeleton. */}
      <Suspense fallback={<div className="h-14 w-full bg-[#232f3e]" />}>
        <AmazonHeader />
      </Suspense>

      <FloatingFiltersBarSkeleton />

      <div className="mx-auto max-w-[1400px]">
        <div className="px-3">
          <div className="mt-4 flex gap-5 pb-10">
            {/* Sidebar de filtros (desktop) */}
            <aside className="hidden w-[230px] shrink-0 lg:block">
              <DesktopFiltersSidebarSkeleton />
            </aside>

            {/* Conteúdo: "Resultados" + contagem + grid */}
            <div className="min-w-0 flex-1">
              <div className="animate-pulse px-1">
                <div className="h-6 w-40 rounded bg-gray-200" />
                <div className="mb-3 mt-2 h-3.5 w-56 rounded bg-gray-100" />
              </div>

              <ProductListSkeleton />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
