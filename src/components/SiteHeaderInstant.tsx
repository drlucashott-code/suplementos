"use client";

import { Suspense } from "react";
import HeaderClient from "@/components/HeaderClient";
import { AmazonHeader } from "@/components/dynamic/AmazonHeader";

// Versão "instantânea" do SiteHeader para usar em loading.tsx (que não pode
// aguardar dados no servidor). Mesma estética: Header da home no mobile
// (sem auth, estado deslogado durante o carregamento) + AmazonHeader no desktop.
export function SiteHeaderInstant() {
  return (
    <>
      <div className="lg:hidden">
        <HeaderClient />
      </div>
      <div className="hidden lg:block">
        <Suspense fallback={<div className="h-14 w-full bg-[#131921]" />}>
          <AmazonHeader />
        </Suspense>
      </div>
    </>
  );
}

export default SiteHeaderInstant;
