import AdminCafeFuncionalClient, { CafeFuncionalProduct } from "./AdminCafeFuncionalClient"; 

export default function AdminCafeFuncionalWrapper({
  products,
}: {
  products: CafeFuncionalProduct[];
}) {
  return <AdminCafeFuncionalClient products={products} />;
}