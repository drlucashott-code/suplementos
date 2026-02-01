import AdminWheyClient from "./AdminWheyClient";

/**
 * Tipagem Refinada para Whey Protein
 * Inclui campos básicos, informações nutricionais e metadados
 * necessários para a UI administrativa.
 */
export type WheyProduct = {
  id: string;
  name: string;
  brand: string;
  flavor: string | null;     // Sabor (quando aplicável)
  imageUrl: string;          // Usado para exibição de imagem no admin
  createdAt: Date | string;

  // Informações nutricionais do Whey (conforme schema)
  wheyInfo: {
    totalWeightInGrams: number;
    doseInGrams: number;
    proteinPerDoseInGrams: number;
  } | null;

  // Ofertas vinculadas (Amazon / Mercado Livre)
  offers: {
    id: string;
    store: "AMAZON" | "MERCADO_LIVRE";
    externalId: string;
    price: number;
    affiliateUrl: string;
    createdAt: Date | string;
  }[];
};

export default function AdminWheyWrapper({
  products,
}: {
  products: WheyProduct[];
}) {
  /**
   * O Wrapper atua como o componente de servidor que recebe os dados
   * já serializados e os repassa para o Client Component,
   * responsável pela tabela, edição e ações em lote.
   */
  return <AdminWheyClient products={products} />;
}
