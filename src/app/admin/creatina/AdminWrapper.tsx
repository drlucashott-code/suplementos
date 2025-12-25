import AdminClient from "./AdminClient";
import { CreatineForm, Store } from "@prisma/client";

/* =======================
   TIPAGEM DO PRODUTO (ADMIN)
   ======================= */
export type CreatineProduct = {
  id: string;
  name: string;
  brand: string;
  flavor: string | null;
  imageUrl: string;
  createdAt: Date;

  creatineInfo: {
    form: CreatineForm;
    totalUnits: number;
    unitsPerDose: number;
  } | null;

  // 🔒 Continua tipado como Store,
  // mas a query garante que só venha AMAZON
  offers: {
    id: string;
    store: Store;
    externalId: string;
    price: number;
    affiliateUrl: string;
    createdAt: Date;
  }[];
};

type Props = {
  products: CreatineProduct[];
};

/* =======================
   WRAPPER
   ======================= */
export default function AdminWrapper({
  products,
}: Props) {
  return <AdminClient products={products} />;
}
