import { SiteHeaderInstant } from "@/components/SiteHeaderInstant";
import { HomeSkeleton } from "@/components/skeletons/HomeSkeleton";

export default function Loading() {
  return (
    <>
      {/* Header real (é sempre o mesmo) em vez de skeleton. */}
      <SiteHeaderInstant />
      <HomeSkeleton />
    </>
  );
}
