import AdminBarraClient from "./AdminBarraClient";

/**
 * Tipagem Refinada para Barras de Proteína
 * Inclui campos para Foto, Sabor e metadados necessários para a UI
 */
export type BarraProduct = {
  id: string;
  name: string;
  brand: string;
  flavor: string | null;     // Coluna solicitada: Sabor
  imageUrl: string;          // Necessário para mostrar a Foto na página
  createdAt: Date | string;

  // Informações nutricionais e de caixa (conforme seu Schema v1.4+)
  proteinBarInfo: {
    unitsPerBox: number;           // Unidades por caixa (ex: 12)
    doseInGrams: number;           // Peso de cada barra (ex: 45)
    proteinPerDoseInGrams: number; // Proteína por barra (ex: 13)
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

export default function AdminBarraWrapper({
  products,
}: {
  products: BarraProduct[];
}) {
  /**
   * O Wrapper atua como o componente de servidor que recebe os dados
   * e os repassa para o Client Component que lidará com a tabela e o Lote.
   */
  return <AdminBarraClient products={products} />;
}