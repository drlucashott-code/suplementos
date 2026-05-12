"use client";

import { useEffect, useRef, useState } from "react";
import BestDealProductCard from "@/components/BestDealProductCard";
import type { BestDeal } from "@/lib/bestDeals";

type ProgressiveBestDealsGridProps = {
  items: BestDeal[];
  category: string;
  compact?: boolean;
  showActions?: boolean;
  initialVisibleCount?: number;
  step?: number;
  maxVisibleCount?: number;
  mobileVisibleCount?: number;
  desktopVisibleCount?: number;
  className?: string;
};

export default function ProgressiveBestDealsGrid({
  items,
  category,
  compact = false,
  showActions = true,
  initialVisibleCount = 24,
  step = 16,
  maxVisibleCount,
  mobileVisibleCount,
  desktopVisibleCount,
  className = "",
}: ProgressiveBestDealsGridProps) {
  const getResponsiveLimit = () => {
    if (typeof window === "undefined") return maxVisibleCount;
    if (desktopVisibleCount && window.matchMedia("(min-width: 1024px)").matches) {
      return desktopVisibleCount;
    }
    if (mobileVisibleCount && window.matchMedia("(max-width: 1023px)").matches) {
      return mobileVisibleCount;
    }
    return maxVisibleCount;
  };

  const [visibleCount, setVisibleCount] = useState(() =>
    Math.min(items.length, getResponsiveLimit() ?? items.length, initialVisibleCount)
  );
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);

  useEffect(() => {
    const limit = getResponsiveLimit();
    setVisibleCount(Math.min(items.length, limit ?? items.length, initialVisibleCount));
    loadingRef.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialVisibleCount, items, maxVisibleCount, mobileVisibleCount, desktopVisibleCount]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (!entry?.isIntersecting || loadingRef.current) return;
        if (visibleCount >= items.length) return;
        const limit = getResponsiveLimit();
        if (typeof limit === "number" && visibleCount >= limit) return;

        loadingRef.current = true;
        window.setTimeout(() => {
          setVisibleCount((current) =>
            Math.min(items.length, getResponsiveLimit() ?? items.length, current + step)
          );
          loadingRef.current = false;
        }, 80);
      },
      { rootMargin: "320px 0px", threshold: 0.05 }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [items.length, maxVisibleCount, mobileVisibleCount, desktopVisibleCount, step, visibleCount]);

  const visibleItems = items.slice(0, visibleCount);
  const hasMore =
    visibleCount < items.length &&
    ((typeof getResponsiveLimit() !== "number" && typeof maxVisibleCount !== "number") ||
      visibleCount < (getResponsiveLimit() ?? maxVisibleCount ?? items.length));

  return (
    <div className={className}>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {visibleItems.map((item) => (
          <BestDealProductCard
            key={item.id}
            item={item}
            category={category}
            compact={compact}
            showActions={showActions}
          />
        ))}
      </div>

      {hasMore ? (
        <div ref={sentinelRef} className="flex h-24 items-center justify-center">
          <div className="flex items-center gap-2 text-[12px] font-semibold text-[#667085]">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#cfd8dc] border-t-[#007185]" />
            Carregando mais ofertas...
          </div>
        </div>
      ) : null}
    </div>
  );
}
