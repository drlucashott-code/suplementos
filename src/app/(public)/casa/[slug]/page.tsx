import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { ProductList } from "@/components/casa/ProductList";
import { MobileFiltersDrawer } from "@/components/casa/MobileFiltersDrawer";
import { FloatingFiltersBar } from "@/components/casa/FloatingFiltersBar"; 
import { AmazonHeader } from "@/components/casa/AmazonHeader";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

interface DisplayConfigField {
  key: string;
  label: string;
  type: "text" | "number" | "currency";
}

interface DynamicAttributes {
  brand?: string;
  seller?: string;
  [key: string]: string | number | undefined;
}

const removeAccents = (str: string) => {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
};

export default async function CasaCategoryPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const search = await searchParams;
  
  const order = (search.order as string) ?? "cheapest_unit";
  const searchQuery = (search.q as string) || "";

  const category = await prisma.homeCategory.findUnique({
    where: { slug },
    include: {
      products: { orderBy: { totalPrice: "asc" } },
    },
  });

  if (!category) return notFound();

  const displayConfig = category.displayConfig as unknown as DisplayConfigField[];

  // Identifica configurações dinâmicas de texto (ex: Tipo de Folha)
  const dynamicTextConfigs = displayConfig.filter(
    (c) => c.type === "text" && !c.label.toUpperCase().includes("VALOR") && !c.label.toUpperCase().includes("PREÇO")
  );

  // 1. Extração de Opções Únicas (Marca, Vendedor e Dinâmicos)
  const availableBrands = new Set<string>();
  const availableSellers = new Set<string>();
  const dynamicFilterOptions: Record<string, Set<string>> = {};
  
  dynamicTextConfigs.forEach(c => dynamicFilterOptions[c.key] = new Set());

  category.products.forEach((p) => {
    const attrs = p.attributes as unknown as DynamicAttributes;
    if (attrs.brand) availableBrands.add(String(attrs.brand));
    if (attrs.seller) availableSellers.add(String(attrs.seller));
    
    dynamicTextConfigs.forEach(config => {
      const val = attrs[config.key];
      if (val) dynamicFilterOptions[config.key].add(String(val));
    });
  });

  // 2. Busca (Search)
  const stopWords = ["de", "da", "do", "para", "com"];
  const searchWords = searchQuery.trim().split(/\s+/).map((word) => removeAccents(word.toLowerCase())).filter((word) => !stopWords.includes(word) && word.length > 0);

  // 3. Aplicação de Filtros
  const selectedBrands = search.brand ? String(search.brand).split(",") : [];
  const selectedSellers = search.seller ? String(search.seller).split(",") : [];

  // 🚀 CORREÇÃO ESLint: Usando 'const' em vez de 'let'
  const matchedProducts = category.products.filter((p) => {
    const attrs = p.attributes as unknown as DynamicAttributes;
    const pBrand = String(attrs.brand || "");
    const pSeller = String(attrs.seller || "");

    // Filtro de Busca
    if (searchWords.length > 0) {
      const productText = removeAccents(`${p.name} ${pBrand}`.toLowerCase());
      if (!searchWords.every((word) => productText.includes(word))) return false;
    }

    // Filtros Fixos (Marca e Vendedor)
    if (selectedBrands.length > 0 && !selectedBrands.includes(pBrand)) return false;
    if (selectedSellers.length > 0 && !selectedSellers.includes(pSeller)) return false;

    // Filtros Dinâmicos
    for (const config of dynamicTextConfigs) {
      const selectedDynamic = search[config.key] ? String(search[config.key]).split(",") : [];
      const pVal = String(attrs[config.key] || "");
      if (selectedDynamic.length > 0 && !selectedDynamic.includes(pVal)) return false;
    }

    return true;
  });

  // 4. Cálculo de Custo-Benefício e Formatação para o Card
  const rankedProducts = matchedProducts.map((p) => {
    const attrs = p.attributes as unknown as DynamicAttributes;
    let pricePerUnit = 0;

    // Acha o campo de "Lavagens", "Litros" ou "Rolos" para calcular o custo unitário
    const calcConfig = displayConfig.find(c => c.label.toUpperCase().includes("VALOR") || c.label.toUpperCase().includes("PREÇO"));
    if (calcConfig) {
      const labelUpper = calcConfig.label.toUpperCase();
      let targetConfig;
      if (labelUpper.includes("LAVAGE")) targetConfig = displayConfig.find(c => c.label.toUpperCase().includes("LAVAGE") && c.key !== calcConfig.key);
      else if (labelUpper.includes("LITRO")) targetConfig = displayConfig.find(c => c.label.toUpperCase().includes("LITRO") && c.key !== calcConfig.key);
      else if (labelUpper.includes("ROLO")) targetConfig = displayConfig.find(c => c.label.toUpperCase().includes("ROLO") && c.key !== calcConfig.key);

      const quantity = targetConfig ? Number(attrs[targetConfig.key]) : 0;
      if (quantity > 0) pricePerUnit = p.totalPrice / quantity;
    }

    return {
      id: p.id,
      name: p.name,
      imageUrl: p.imageUrl || "",
      price: p.totalPrice,
      affiliateUrl: p.url,
      pricePerUnit,
      attributes: attrs,
    };
  });

  // 5. Ordenação
  const finalProducts = rankedProducts.sort((a, b) => {
    if (order === "price_asc") return a.price - b.price;
    if (order === "cheapest_unit" && a.pricePerUnit > 0 && b.pricePerUnit > 0) return a.pricePerUnit - b.pricePerUnit;
    return a.price - b.price; 
  });

  return (
    <main className="bg-[#EAEDED] min-h-screen">
      <Suspense fallback={<div className="h-14 bg-[#232f3e] w-full" />}>
        <AmazonHeader />
      </Suspense>

      <div className="max-w-[1200px] mx-auto">
        <Suspense fallback={<div className="h-14 bg-white border-b border-zinc-200 w-full" />}>
          <FloatingFiltersBar />
        </Suspense>

        <div className="px-3">
          <Suspense fallback={null}>
            <MobileFiltersDrawer
              brands={Array.from(availableBrands).sort()}
              sellers={Array.from(availableSellers).sort()}
              dynamicConfigs={dynamicTextConfigs}
              dynamicOptions={Object.fromEntries(
                Object.entries(dynamicFilterOptions).map(([k, v]) => [k, Array.from(v).sort()])
              )}
            />
          </Suspense>

          <div className="mt-4 pb-10 w-full">
            <p className="text-[13px] text-zinc-800 mb-2 px-1 font-medium">
              {finalProducts.length} produtos encontrados em {category.name}
            </p>

            <div className="w-full">
              <ProductList
                products={finalProducts}
                viewEventName="view_casa_list"
                displayConfig={displayConfig}
              />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}