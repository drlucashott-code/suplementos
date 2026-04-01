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
  for (const ref of dedupeDynamicCatalogCategoryRefs(refs)) {
    revalidateTag(getDynamicCatalogCacheTag(ref.group, ref.slug), "max");
    revalidatePath(getDynamicCatalogPath(ref.group, ref.slug), "page");
  }
}
