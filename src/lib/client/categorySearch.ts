// Lógica compartilhada de busca de categorias usada pelos headers (mobile
// HeaderClient e desktop AmazonHeader): monta a lista de categorias pesquisáveis
// (base + dinâmicas vindas do banco), filtra sugestões por nome e resolve para
// qual categoria a busca deve navegar. Centralizado aqui para que os dois
// headers se comportem de forma idêntica.

export type SearchCategory = {
  name: string;
  path: string;
  keywords: string[];
};

export type CategorySuggestion = {
  name: string;
  path: string;
};

export type ExtraCategory = {
  title: string;
  path: string;
};

export const removeAccents = (str: string) => {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
};

export const BASE_CATEGORIES: SearchCategory[] = [
  { name: "Creatina", path: "/suplementos/creatina", keywords: ["creatina", "creatine"] },
  { name: "Whey Protein", path: "/suplementos/whey", keywords: ["whey", "protein", "proteina"] },
  { name: "Barra de proteína", path: "/suplementos/barra", keywords: ["barra", "barrinha"] },
  { name: "Pré-treino", path: "/suplementos/pre-treino", keywords: ["pre", "treino", "pretreino"] },
  { name: "Bebida proteica", path: "/suplementos/bebidaproteica", keywords: ["bebida", "pronta"] },
  { name: "Café funcional", path: "/suplementos/cafe-funcional", keywords: ["cafe", "funcional"] },
];

// Une as categorias base com as dinâmicas (casa/pets/etc.), gerando keywords a
// partir do título e do slug. Deduplica por path mantendo a base na frente.
export function buildSearchCategories(
  extraCategories: ExtraCategory[] = []
): SearchCategory[] {
  const normalizedExtras = extraCategories.map((category) => {
    const normalizedTitle = removeAccents(category.title.toLowerCase());
    const slugKeywords = category.path
      .split("/")
      .filter(Boolean)
      .flatMap((part) => removeAccents(part.toLowerCase()).split("-"));
    const titleKeywords = normalizedTitle.split(/[\s/&-]+/).filter(Boolean);

    return {
      name: category.title,
      path: category.path,
      keywords: Array.from(new Set([normalizedTitle, ...titleKeywords, ...slugKeywords])),
    };
  });

  const deduped = new Map<string, SearchCategory>();

  for (const category of [...BASE_CATEGORIES, ...normalizedExtras]) {
    if (!deduped.has(category.path)) {
      deduped.set(category.path, category);
    }
  }

  return Array.from(deduped.values());
}

// Sugestões do dropdown: categorias cujo nome contém o texto digitado
// (ignorando acentos e caixa).
export function filterCategorySuggestions(
  query: string,
  categories: SearchCategory[]
): CategorySuggestion[] {
  const normalizedValue = removeAccents(query.toLowerCase());
  return categories
    .filter((cat) => removeAccents(cat.name.toLowerCase()).includes(normalizedValue))
    .map((cat) => ({ name: cat.name, path: cat.path }));
}

// Resolve para qual categoria a busca deve ir, por correspondência de
// palavra-chave. Retorna null quando nada casa.
export function resolveCategoryTarget(
  query: string,
  categories: SearchCategory[]
): string | null {
  const searchString = removeAccents(query.trim().toLowerCase());
  if (!searchString) return null;

  for (const category of categories) {
    if (category.keywords.some((keyword) => searchString.includes(keyword))) {
      return category.path;
    }
  }

  return null;
}
