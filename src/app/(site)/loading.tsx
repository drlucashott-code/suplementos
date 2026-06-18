import { Suspense } from "react";
import { AmazonHeader } from "@/components/dynamic/AmazonHeader";
import { HomeSkeleton } from "@/components/skeletons/HomeSkeleton";

export default function Loading() {
  return (
    <>
      {/* Header real (é sempre o mesmo) em vez de skeleton. */}
      <Suspense fallback={<div className="h-14 w-full bg-[#131921]" />}>
        <AmazonHeader />
      </Suspense>

      <HomeSkeleton />
    </>
  );
}
