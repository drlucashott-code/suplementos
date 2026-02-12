import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import AdminPreTreinoWrapper from "./AdminPreTreinoWrapper";
import { PreTreinoProduct } from "./AdminPreTreinoClient";

export const dynamic = "force-dynamic";

export default async function AdminPreTreinoPage() {
  const productsRaw = await prisma.product.findMany({
    where: { category: "pre-treino" },
    include: {
      preWorkoutInfo: true, // Alterado para preWorkoutInfo
      offers: {
        where: { store: "AMAZON" },
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Serialização das datas para passar do Server para o Client Component
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

  return (
    <Suspense fallback={<div>Carregando painel...</div>}>
      <AdminPreTreinoWrapper products={products as unknown as PreTreinoProduct[]} />
    </Suspense>
  );
}