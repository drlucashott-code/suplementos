export type DynamicCatalogCategoryRef = {
  group: string;
  slug: string;
};

export function getDynamicCatalogCacheTag(group: string, slug: string) {
  return `dynamic-catalog:${group}:${slug}`;
}

export function getDynamicCatalogPath(group: string, slug: string) {
  return `/${group}/${slug}`;
}

export function dedupeDynamicCatalogCategoryRefs(
  refs: DynamicCatalogCategoryRef[]
): DynamicCatalogCategoryRef[] {
  const unique = new Map<string, DynamicCatalogCategoryRef>();

  for (const ref of refs) {
    if (!ref.group || !ref.slug) continue;
    unique.set(`${ref.group}:${ref.slug}`, ref);
  }

  return [...unique.values()];
}
