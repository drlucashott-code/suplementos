import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import AdminBebidaProteicaWrapper from "./AdminBebidaProteicaWrapper";

/* =========================
    PERFORMANCE & BUILD FIX
    Força a renderização dinâmica para evitar que o Next.js tente 
    pré-renderizar esta página administrativa durante o build, 
    o que resolve o conflito com o Streaming (loading/skeleton).
    ========================= */
export const dynamic = "force-dynamic";

/**
 * Página Server-Side para Gestão de Bebidas Proteicas
 * Agora com suporte total ao schema sincronizado
 */
export default async function AdminBebidaProteicaPage() {
  // Busca produtos da categoria 'bebidaproteica' incluindo as tabelas relacionadas
  const productsRaw = await prisma.product.findMany({
    where: { category: "bebidaproteica" },
    include: {
      proteinDrinkInfo: true, // Tabela específica para bebidas (ml/unid)
      offers: {
        where: { store: "AMAZON" },
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Serialização: Converte objetos Date em String para o Client Component
  const products = productsRaw.map((p) => ({
    ...p,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
    offers: p.offers.map((o) => ({
      ...o,
      createdAt: o.createdAt.toISOString(),
      updatedAt: o.updatedAt.toISOString(),
    })),
  }));

  // Renderiza o Wrapper dentro de um Suspense para garantir que o 
  // uso de searchParams ou hooks de cliente no Wrapper não quebre o build.
  return (
    <Suspense fallback={null}>
      <AdminBebidaProteicaWrapper products={products as any} />
    </Suspense>
  );
}