import type { Metadata } from "next";

import { SiteHeader } from "@/components/SiteHeader";
import { NextOffersCatalog } from "@/components/next-offers/NextOffersCatalog";
import { fetchNextOffersFeed } from "@/lib/next-offers/server";
import { buildAbsoluteUrl } from "@/lib/siteUrl";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Top ofertas da Amazon | amazonpicks",
  description:
    "Descubra produtos populares, quedas reais de preço e as melhores oportunidades da Amazon Brasil.",
  alternates: { canonical: buildAbsoluteUrl("/ofertas") },
  openGraph: {
    title: "Top ofertas da Amazon | amazonpicks",
    description:
      "Descubra produtos populares, quedas reais de preço e as melhores oportunidades da Amazon Brasil.",
    url: buildAbsoluteUrl("/ofertas"),
    type: "website",
  },
};

type OfertasPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function OfertasPage({ searchParams }: OfertasPageProps) {
  const params = await searchParams;
  const feedParams = new URLSearchParams();

  for (const [key, rawValue] of Object.entries(params)) {
    const value = Array.isArray(rawValue) ? rawValue[0] : rawValue;
    if (value) feedParams.set(key, value);
  }

  let catalog = null;
  try {
    catalog = (await fetchNextOffersFeed(feedParams, 10_000)).catalog;
  } catch (error) {
    console.error("Não foi possível abrir o catálogo novo de ofertas.", error);
  }

  return (
    <main className="min-h-screen bg-white">
      <SiteHeader
        searchTargetPath="/ofertas"
        searchPlaceholder="Buscar produtos"
        desktopSearchPlaceholder="O que você está procurando?"
      />
      {catalog ? (
        <NextOffersCatalog catalog={catalog} />
      ) : (
        <section className="mx-auto max-w-[900px] px-4 py-20 text-center">
          <h1 className="text-2xl font-bold text-[#0F1111]">
            Top ofertas temporariamente indisponíveis
          </h1>
          <p className="mt-3 text-sm text-[#565959]">
            Não exibimos a seleção antiga como substituta. Tente novamente em instantes.
          </p>
        </section>
      )}
    </main>
  );
}
