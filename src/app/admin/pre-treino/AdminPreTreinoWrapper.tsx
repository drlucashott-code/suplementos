import AdminPreTreinoClient, { PreTreinoProduct } from "./AdminPreTreinoClient"; 

export default function AdminPreTreinoWrapper({
  products,
}: {
  products: PreTreinoProduct[];
}) {
  return <AdminPreTreinoClient products={products} />;
}