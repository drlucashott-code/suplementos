import AdminBebidaProteicaClient from "./AdminBebidaProteicaClient";

/**
 * Tipagem Refinada para Bebidas Proteicas
 * Inclui campos para Foto, Sabor e metadados necessários para a UI
 */
export type BebidaProteicaProduct = {
  id: string;
  name: string;
  brand: string;
  flavor: string | null;     // Sabor
  imageUrl: string;          // Necessário para mostrar a Foto na página
  createdAt: Date | string;

  // Informações nutricionais e de pack (conforme seu Schema atualizado)
  proteinDrinkInfo: {
    unitsPerPack: number;           // Unidades por pack (ex: 6)
    volumePerUnitInMl: number;      // Volume de cada unidade (ex: 250)
    proteinPerUnitInGrams: number;  // Proteína por unidade (ex: 15)
  } | null;

  // Ofertas vinculadas (Amazon/ML)
  offers: {
    id: string;
    store: "AMAZON" | "MERCADO_LIVRE";
    externalId: string;
    price: number;
    affiliateUrl: string;
    createdAt: Date | string;
  }[];
};

export default function AdminBebidaProteicaWrapper({
  products,
}: {
  products: BebidaProteicaProduct[];
}) {
  /**
   * O Wrapper atua como o componente de servidor que recebe os dados
   * e os repassa para o Client Component que lidará com a tabela e o Lote.
   */
  return <AdminBebidaProteicaClient products={products} />;
}