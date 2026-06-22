import { Suspense } from "react";
import Header from "@/app/Header";
import { AmazonHeader } from "@/components/dynamic/AmazonHeader";
import type { HeaderProps } from "@/app/Header";

// Header unificado do site: no mobile usa o mesmo header da home (Header /
// HeaderClient, com busca + menu de categorias); no desktop mantém o AmazonHeader.
// O AmazonHeader fica dentro de `hidden lg:block`, então sua variante mobile
// nunca aparece — quem manda no mobile é o Header.
export function SiteHeader({ extraCategories }: HeaderProps = {}) {
  return (
    <>
      <div className="lg:hidden">
        <Header extraCategories={extraCategories} />
      </div>
      <div className="hidden lg:block">
        <Suspense fallback={<div className="h-14 w-full bg-[#131921]" />}>
          <AmazonHeader extraCategories={extraCategories} />
        </Suspense>
      </div>
    </>
  );
}

export default SiteHeader;
