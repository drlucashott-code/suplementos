import AdminWheyClient from "./AdminWheyClient";

export type WheyProduct = {
  id: string;
  name: string;
  brand: string;
  flavor: string | null;
  imageUrl: string;
  createdAt: string;

  wheyInfo: {
    totalWeightInGrams: number;
    doseInGrams: number;
    proteinPerDoseInGrams: number;
  } | null;

  offers: {
    id: string;
    store: "AMAZON" | "MERCADO_LIVRE";
    externalId: string;
    price: number;
    affiliateUrl: string;
    createdAt: string;
  }[];
};

export default function AdminWheyWrapper({
  products,
}: {
  products: WheyProduct[];
}) {
  return <AdminWheyClient products={products} />;
}
