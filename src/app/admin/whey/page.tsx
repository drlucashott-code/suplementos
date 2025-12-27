import { prisma } from "@/lib/prisma";
import AdminWheyWrapper from "./AdminWheyWrapper";

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

  return <AdminWheyWrapper products={products} />;
}
