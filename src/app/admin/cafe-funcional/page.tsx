import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import AdminCafeFuncionalWrapper from "./AdminCafeFuncionalWrapper";
import { CafeFuncionalProduct } from "./AdminCafeFuncionalClient";

export const dynamic = "force-dynamic";

export default async function AdminCafeFuncionalPage() {
  const productsRaw = await prisma.product.findMany({
    where: { category: "cafe-funcional" }, // Categoria padrão que usamos no banco
    include: {
      functionalCoffeeInfo: true, // Alterado para o café funcional
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
      <AdminCafeFuncionalWrapper products={products as unknown as CafeFuncionalProduct[]} />
    </Suspense>
  );
}