import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import AdminBarraWrapper from "./AdminBarraWrapper";
import type { BarraProduct } from "./AdminBarraWrapper";

/* =========================
    PERFORMANCE & BUILD FIX
    Força a renderização dinâmica para evitar que o Next.js tente 
    pré-renderizar esta página administrativa durante o build, 
    o que resolve o conflito com o Streaming (loading/skeleton).
    ========================= */
export const dynamic = "force-dynamic";

/**
 * Página Server-Side para Gestão de Barras
 * Agora com suporte total ao schema sincronizado
 */
export default async function AdminBarraPage() {
  // Busca produtos da categoria 'barra' incluindo as tabelas relacionadas
  const productsRaw = await prisma.product.findMany({
    where: { category: "barra" },
    include: {
      proteinBarInfo: true,
      offers: {
        where: { store: "AMAZON" },
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Serialização: Converte objetos Date em String respeitando o tipo BarraProduct
  const products: BarraProduct[] = productsRaw.map((p) => ({
    ...p,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
    proteinBarInfo: p.proteinBarInfo ? {
      ...p.proteinBarInfo,
    } : null,
    offers: p.offers.map((o) => ({
      ...o,
      // Fazemos o cast de store para garantir que o TS aceite como o Enum correto
      store: o.store as "AMAZON" | "MERCADO_LIVRE",
      createdAt: o.createdAt.toISOString(),
      updatedAt: o.updatedAt.toISOString(),
    })),
  }));

  // Renderiza o Wrapper dentro de um Suspense
  return (
    <Suspense fallback={null}>
      <AdminBarraWrapper products={products} />
    </Suspense>
  );
}