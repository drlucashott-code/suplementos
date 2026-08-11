import { revalidatePath, revalidateTag } from "next/cache";
import {
  dedupeDynamicCatalogCategoryRefs,
  getDynamicCatalogCacheTag,
  getDynamicCatalogPath,
  type DynamicCatalogCategoryRef,
} from "@/lib/dynamicCatalogCache";

export function revalidateDynamicCatalogCategoryRefs(
  refs: DynamicCatalogCategoryRef[]
) {
  const deduped = dedupeDynamicCatalogCategoryRefs(refs);

  for (const ref of deduped) {
    revalidateTag(getDynamicCatalogCacheTag(ref.group, ref.slug), "max");
    revalidatePath(getDynamicCatalogPath(ref.group, ref.slug), "page");
  }

}
