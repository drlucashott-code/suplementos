"use client";

import type { ReactNode } from "react";
import { trackProductClick } from "@/lib/client/productClickTracking";

interface TrackedDealLinkProps {
  asin: string;
  href: string;
  className?: string;
  children: ReactNode;
  productId?: string;
  productName?: string;
  value?: number;
  category?: string;
  disabled?: boolean;
}

export default function TrackedDealLink({
  asin,
  href,
  className,
  children,
  productId,
  productName,
  value,
  category,
  disabled = false,
}: TrackedDealLinkProps) {
  if (disabled) {
    return <div className={className}>{children}</div>;
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer sponsored"
      onClick={() =>
        trackProductClick({
          asin,
          productId,
          productName,
          value,
          category,
        })
      }
      className={className}
    >
      {children}
    </a>
  );
}
