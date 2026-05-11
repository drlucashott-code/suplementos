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
  className = "",
}: ProgressiveBestDealsGridProps) {
  const [visibleCount, setVisibleCount] = useState(() =>
    Math.min(items.length, maxVisibleCount ?? items.length, initialVisibleCount)
  );
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);

  useEffect(() => {
    setVisibleCount(
      Math.min(items.length, maxVisibleCount ?? items.length, initialVisibleCount)
    );
    loadingRef.current = false;
  }, [initialVisibleCount, items, maxVisibleCount]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (!entry?.isIntersecting || loadingRef.current) return;
        if (visibleCount >= items.length) return;
        if (typeof maxVisibleCount === "number" && visibleCount >= maxVisibleCount) return;

        loadingRef.current = true;
        window.setTimeout(() => {
          setVisibleCount((current) =>
            Math.min(items.length, maxVisibleCount ?? items.length, current + step)
          );
          loadingRef.current = false;
        }, 80);
      },
      { rootMargin: "320px 0px", threshold: 0.05 }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [items.length, maxVisibleCount, step, visibleCount]);

  const visibleItems = items.slice(0, visibleCount);
  const hasMore =
    visibleCount < items.length &&
    (typeof maxVisibleCount !== "number" || visibleCount < maxVisibleCount);

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
