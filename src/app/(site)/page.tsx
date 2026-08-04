import type { Metadata } from "next";

export { default } from "../experimental/home/page";
export const revalidate = 600;

export const metadata: Metadata = {
  title: "AmazonPicks | Ofertas e melhor custo-benefício",
  description: "Encontre promoções reais e compare os melhores produtos pelo seu custo-benefício.",
  robots: { index: true, follow: true },
};
