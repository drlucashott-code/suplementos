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
  totalProducts,
  hasMore: initialHasMore,
  loadMoreUrl,
  pageSize,
  viewEventName,
  displayConfig,
  highlightConfig,
  analysisTitleTemplate,
}: {
  products: DynamicProductType[];
  totalProducts: number;
  hasMore: boolean;
  loadMoreUrl?: string;
  pageSize: number;
  viewEventName: string;
  displayConfig: DisplayConfigField[];
  highlightConfig: DisplayConfigField[];
  analysisTitleTemplate?: string;
}) {
  const [items, setItems] = useState(products);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const trackedRef = useRef<string | null>(null);
  const loadingRef = useRef(false);

  useEffect(() => {
    setItems(products);
    setHasMore(initialHasMore);
    setIsLoadingMore(false);
    loadingRef.current = false;
  }, [initialHasMore, products]);

  useEffect(() => {
    if (!viewEventName || trackedRef.current === viewEventName) return;

    const win = window as GtagWindow;

    const payload = {
      category: "catalog",
      total_products: totalProducts,
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
  }, [totalProducts, viewEventName]);

  useEffect(() => {
    const currentTarget = loadMoreRef.current;
    if (!currentTarget) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingRef.current) {
          if (!loadMoreUrl) return;

          loadingRef.current = true;
          setIsLoadingMore(true);

          const separator = loadMoreUrl.includes("?") ? "&" : "?";
          const requestUrl = `${loadMoreUrl}${separator}offset=${items.length}&limit=${pageSize}`;

          fetch(requestUrl, { method: "GET", cache: "no-store" })
            .then(async (response) => {
              if (!response.ok) {
                throw new Error(`load_more_failed_${response.status}`);
              }

              const payload = (await response.json()) as {
                products?: DynamicProductType[];
                hasMore?: boolean;
              };

              const nextProducts = payload.products ?? [];

              setItems((prev) => {
                const seen = new Set(prev.map((product) => product.id));
                const deduped = nextProducts.filter((product) => !seen.has(product.id));
                return [...prev, ...deduped];
              });
              setHasMore(Boolean(payload.hasMore));
            })
            .catch(() => {
              setHasMore(false);
            })
            .finally(() => {
              loadingRef.current = false;
              setIsLoadingMore(false);
            });
        }
      },
      { threshold: 0.1, rootMargin: "200px" }
    );

    observer.observe(currentTarget);
    return () => observer.disconnect();
  }, [hasMore, items.length, loadMoreUrl, pageSize]);

  return (
    <section className="flex-1 space-y-4">
      {items.map((product, index) => (
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
              {isLoadingMore ? "Buscando mais ofertas..." : "Carregando mais ofertas..."}
            </p>
          </div>
        </div>
      )}

      {items.length === 0 && (
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
  totalProducts,
  hasMore = false,
  loadMoreUrl,
  pageSize = 12,
  viewEventName = "view_catalog_list",
  displayConfig,
  highlightConfig = [],
  analysisTitleTemplate,
}: {
  products: DynamicProductType[];
  totalProducts: number;
  hasMore?: boolean;
  loadMoreUrl?: string;
  pageSize?: number;
  viewEventName?: string;
  displayConfig: DisplayConfigField[];
  highlightConfig?: DisplayConfigField[];
  analysisTitleTemplate?: string;
}) {
  const resetKey = useMemo(() => {
    return [products.map((product) => product.id).join("|"), totalProducts, loadMoreUrl].join(
      "::"
    );
  }, [loadMoreUrl, products, totalProducts]);

  return (
    <ProductListContent
      key={resetKey}
      products={products}
      totalProducts={totalProducts}
      hasMore={hasMore}
      loadMoreUrl={loadMoreUrl}
      pageSize={pageSize}
      viewEventName={viewEventName}
      displayConfig={displayConfig}
      highlightConfig={highlightConfig}
      analysisTitleTemplate={analysisTitleTemplate}
    />
  );
}

export default ProductList;
