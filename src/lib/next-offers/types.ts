export type NextOfferProduct = {
  id: string;
  asin: string;
  title: string;
  brand: string | null;
  imageUrl: string;
  currentPrice: number;
  averagePrice90d: number | null;
  discountPercent: number;
  savingsAmount: number;
  ratingAverage: number | null;
  reviewCount: number | null;
  salesRank: number | null;
  category: string | null;
  navigationCategories: Array<{
    slug: string;
    name: string;
    parentSlug: string | null;
  }>;
  dealReason: string | null;
  isDeal: boolean;
  isLowest90: boolean;
};

export type NextOffersFilters = {
  query: string;
  category: string;
  priceRange: "all" | "under-100" | "100-300" | "over-300";
  rating: "all" | "4" | "4.5";
  brand: string;
  sort: "popular" | "discount";
  page: number;
};

export type NextOffersCatalog = {
  products: NextOfferProduct[];
  filters: NextOffersFilters;
  eligibleProducts: number;
  totalProducts: number;
  page: number;
  pageSize: number;
  totalPages: number;
  categories: Array<{
    slug: string;
    name: string;
    parentSlug: string | null;
    count: number;
  }>;
  brands: Array<{
    value: string;
    label: string;
    count: number;
  }>;
};

export type NextOffersFeedResponse = {
  schemaVersion: 1;
  generatedAt: string;
  sourceOrigin: string;
  catalog: NextOffersCatalog;
};

export function isNextOffersFeedResponse(
  value: unknown,
): value is NextOffersFeedResponse {
  if (!value || typeof value !== "object") return false;
  const response = value as Partial<NextOffersFeedResponse>;
  const catalog = response.catalog as Partial<NextOffersCatalog> | undefined;

  return (
    response.schemaVersion === 1 &&
    typeof response.generatedAt === "string" &&
    typeof response.sourceOrigin === "string" &&
    !!catalog &&
    Array.isArray(catalog.products) &&
    Array.isArray(catalog.categories) &&
    Array.isArray(catalog.brands) &&
    typeof catalog.totalProducts === "number" &&
    typeof catalog.page === "number" &&
    typeof catalog.totalPages === "number" &&
    !!catalog.filters
  );
}
