"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MobileProductCard, type DynamicProductType } from "./MobileProductCard";

interface DisplayConfigField {
  key: string;
  label: string;
  type: "text" | "number" | "currency";
  prefix?: string;
  suffix?: string;
  hideLabel?: boolean;
}

type GtagWindow = Window & {
  gtag?: (command: string, event: string, params: Record<string, unknown>) => void;
  dataLayer?: object[];
};

function ProductListContent({
  products,
  viewEventName,
  displayConfig,
  highlightConfig,
  analysisTitleTemplate,
}: {
  products: DynamicProductType[];
  viewEventName: string;
  displayConfig: DisplayConfigField[];
  highlightConfig: DisplayConfigField[];
  analysisTitleTemplate?: string;
}) {
  const [visibleCount, setVisibleCount] = useState(6);

  const loadMoreRef = useRef<HTMLDivElement>(null);
  const trackedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!viewEventName || trackedRef.current === viewEventName) return;

    const win = window as GtagWindow;

    const payload = {
      category: "catalog",
      total_products: products.length,
    };

    if (win.gtag) {
      win.gtag("event", viewEventName, payload);
    } else if (win.dataLayer) {
      win.dataLayer.push({
        event: viewEventName,
        ...payload,
      });
    }

    trackedRef.current = viewEventName;
  }, [products.length, viewEventName]);

  useEffect(() => {
    const currentTarget = loadMoreRef.current;
    if (!currentTarget) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && products.length > visibleCount) {
          setVisibleCount((prev) => prev + 10);
        }
      },
      { threshold: 0.1, rootMargin: "200px" }
    );

    observer.observe(currentTarget);
    return () => observer.disconnect();
  }, [visibleCount, products.length]);

  const visibleProducts = useMemo(
    () => products.slice(0, visibleCount),
    [products, visibleCount]
  );

  const hasMore = products.length > visibleCount;

  return (
    <section className="flex-1 space-y-4">
      {visibleProducts.map((product, index) => (
        <MobileProductCard
          key={product.id}
          product={product}
          priority={index < 4}
          displayConfig={displayConfig}
          highlightConfig={highlightConfig}
          analysisTitleTemplate={analysisTitleTemplate}
        />
      ))}

      {hasMore && (
        <div ref={loadMoreRef} className="flex h-28 items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-300 border-t-blue-500" />
            <p className="text-[12px] font-medium text-zinc-600">
              Buscando mais ofertas...
            </p>
          </div>
        </div>
      )}

      {products.length === 0 && (
        <div className="mx-1 rounded-xl border border-dashed border-zinc-300 bg-white py-20 text-center">
          <p className="text-[14px] text-zinc-500">
            Nenhum produto encontrado com estes filtros.
          </p>
        </div>
      )}
    </section>
  );
}

export function ProductList({
  products,
  viewEventName = "view_catalog_list",
  displayConfig,
  highlightConfig = [],
  analysisTitleTemplate,
}: {
  products: DynamicProductType[];
  viewEventName?: string;
  displayConfig: DisplayConfigField[];
  highlightConfig?: DisplayConfigField[];
  analysisTitleTemplate?: string;
}) {
  const resetKey = useMemo(() => {
    return products.map((product) => product.id).join("|");
  }, [products]);

  return (
    <ProductListContent
      key={resetKey}
      products={products}
      viewEventName={viewEventName}
      displayConfig={displayConfig}
      highlightConfig={highlightConfig}
      analysisTitleTemplate={analysisTitleTemplate}
    />
  );
}

export default ProductList;
