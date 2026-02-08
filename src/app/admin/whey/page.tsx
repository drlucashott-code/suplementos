import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import AdminWheyWrapper from "./AdminWheyWrapper";
import type { WheyProduct } from "./AdminWheyWrapper";

/* =========================
    PERFORMANCE & BUILD FIX
    Força a renderização dinâmica para evitar conflitos com o 
    sistema de loading/skeleton durante o build na Vercel.
   ========================= */
export const dynamic = "force-dynamic";

/**
 * Página Server-Side para Gestão de Whey
 * Padronizada exatamente como a página de Barras
 */
export default async function AdminWheyPage() {
  // Busca produtos da categoria 'whey' incluindo as tabelas relacionadas
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

  // Serialização: Converte objetos Date em String para o Client Component
  // Mapeamos garantindo que o tipo final seja WheyProduct[]
  const products: WheyProduct[] = productsRaw.map((p) => ({
    ...p,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
    wheyInfo: p.wheyInfo ? {
      ...p.wheyInfo,
    } : null,
    offers: p.offers.map((o) => ({
      ...o,
      // Cast de store para garantir compatibilidade com o tipo esperado pelo Wrapper
      store: o.store as "AMAZON" | "MERCADO_LIVRE",
      createdAt: o.createdAt.toISOString(),
      updatedAt: o.updatedAt.toISOString(),
    })),
  }));

  // Renderiza o Wrapper dentro de um Suspense para garantir que o
  // uso de searchParams ou hooks de cliente no Wrapper não quebre o build.
  return (
    <Suspense fallback={null}>
      <AdminWheyWrapper products={products} />
    </Suspense>
  );
}