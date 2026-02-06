import AdminBebidaProteicaClient, { BebidaProduct } from "./AdminBebidaProteicaClient"; 

/**
 * O Wrapper agora apenas repassa os dados.
 * A tipagem (BebidaProduct) é importada do Client para garantir 100% de compatibilidade.
 */
export default function AdminBebidaProteicaWrapper({
  products,
}: {
  products: BebidaProduct[];
}) {
  return <AdminBebidaProteicaClient products={products} />;
}