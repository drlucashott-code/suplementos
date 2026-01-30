import { prisma } from "@/lib/prisma";
import AdminBarraWrapper from "./AdminBarraWrapper";

/**
 * Página Server-Side para Gestão de Barras
 * Agora com suporte total ao schema sincronizado
 */
export default async function AdminBarraPage() {
  // Busca produtos da categoria 'barra' incluindo as tabelas relacionadas
  const productsRaw = await prisma.product.findMany({
    where: { category: "barra" },
    include: {
      proteinBarInfo: true, // Agora reconhecido pelo Prisma Client
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

  // Renderiza o Wrapper que lida com a tipagem e chama o Client
  return <AdminBarraWrapper products={products as any} />;
}