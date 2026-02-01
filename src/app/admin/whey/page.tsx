import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import AdminWheyWrapper from "./AdminWheyWrapper";

/* =========================
    PERFORMANCE & BUILD FIX
    Força a renderização dinâmica para evitar conflitos com o 
    sistema de loading/skeleton durante o build na Vercel.
   ========================= */
export const dynamic = "force-dynamic";

export default async function AdminWheyPage() {
  const productsRaw = await prisma.product.findMany({
    where: { category: "whey" },
    include: {
      wheyInfo: true,
      offers: {
        where: { store: "AMAZON" },
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const products = productsRaw.map((p) => ({
    ...p,
    createdAt: p.createdAt.toISOString(),
    offers: p.offers.map((o) => ({
      ...o,
      createdAt: o.createdAt.toISOString(),
    })),
  }));

  // Envolvendo o Wrapper em Suspense para garantir que qualquer uso 
  // de hooks de cliente (URL/filtros) no AdminWheyWrapper não quebre o deploy.
  return (
    <Suspense fallback={null}>
      <AdminWheyWrapper products={products as any} />
    </Suspense>
  );
}