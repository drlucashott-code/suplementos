"use client";

import { Suspense } from "react";
import HeaderClient from "@/components/HeaderClient";
import { AmazonHeader } from "@/components/dynamic/AmazonHeader";
import type { HeaderProps } from "@/app/Header";

// Versão "instantânea" do SiteHeader para usar em loading.tsx (que não pode
// aguardar dados no servidor). Mesma estética: Header da home no mobile
// (sem auth, estado deslogado durante o carregamento) + AmazonHeader no desktop.
export function SiteHeaderInstant({
  extraCategories,
  desktopSearchPlaceholder,
  searchPlaceholder,
  searchTargetPath,
}: HeaderProps = {}) {
  return (
    <>
      <div className="lg:hidden">
        <HeaderClient
          extraCategories={extraCategories}
          searchPlaceholder={searchPlaceholder}
          searchTargetPath={searchTargetPath}
        />
      </div>
      <div className="hidden lg:block">
        <Suspense fallback={<div className="h-14 w-full bg-[#131921]" />}>
          <AmazonHeader
            extraCategories={extraCategories}
            searchPlaceholder={desktopSearchPlaceholder}
            searchTargetPath={searchTargetPath}
          />
        </Suspense>
      </div>
    </>
  );
}

export default SiteHeaderInstant;
