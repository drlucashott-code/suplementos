import { PrismaClient } from "@prisma/client";
import AdminWrapper from "./AdminWrapper";

/* =========================
    PERFORMANCE & BUILD FIX
    Força a renderização dinâmica para evitar o erro de Prerender
    durante o build na Vercel, já que acessa o banco de dados.
   ========================= */
export const dynamic = "force-dynamic";

const prisma = new PrismaClient();

export default async function AdminCreatinaPage() {
  const products = await prisma.product.findMany({
    where: {
      category: "creatina",
    },
    include: {
      creatineInfo: true,
      offers: {
        where: {
          store: "AMAZON", // 👈 Mercado Livre oculto no admin
        },
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return <AdminWrapper products={products} />;
}