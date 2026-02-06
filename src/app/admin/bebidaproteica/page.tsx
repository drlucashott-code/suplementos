import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import AdminBebidaProteicaWrapper from "./AdminBebidaProteicaWrapper";
// Precisamos importar o tipo do CLIENT para fazer o cast correto dos dados serializados
import { BebidaProduct } from "./AdminBebidaProteicaClient";

export const dynamic = "force-dynamic";

export default async function AdminBebidaPage() {
  const productsRaw = await prisma.product.findMany({
    where: { category: "bebida_proteica" },
    include: {
      proteinDrinkInfo: true,
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
    updatedAt: p.updatedAt.toISOString(),
    offers: p.offers.map((o) => ({
      ...o,
      createdAt: o.createdAt.toISOString(),
      updatedAt: o.updatedAt.toISOString(),
    })),
  }));

  return (
    <Suspense fallback={null}>
      {/* O 'unknown' é necessário porque o Prisma diz que é Date, 
        mas nós convertemos para String manualmente acima.
      */}
      <AdminBebidaProteicaWrapper products={products as unknown as BebidaProduct[]} />
    </Suspense>
  );
}