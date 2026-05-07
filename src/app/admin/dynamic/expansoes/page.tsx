import { prisma } from "@/lib/prisma";
import ExpansionWorkbenchClient from "./ExpansionWorkbenchClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type SearchParams = Promise<{
  category?: string;
  notice?: string;
}>;

function safeDecode(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export default async function AdminDynamicExpansionPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const categories = await prisma.dynamicCategory.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, group: true, slug: true },
  });

  const selectedCategoryId = params.category?.trim() || "";
  const notice = typeof params.notice === "string" ? safeDecode(params.notice) : "";

  if (!selectedCategoryId) {
    return (
      <ExpansionWorkbenchClient
        categories={categories}
        selectedCategoryId=""
        notice={notice}
        selectedCategory={null}
        baseProductCount={0}
        decisions={[]}
      />
    );
  }

  const selectedCategory = await prisma.dynamicCategory.findUnique({
    where: { id: selectedCategoryId },
    select: { id: true, name: true, group: true, slug: true },
  });

  const baseProductCount = await prisma.dynamicProduct.count({
    where: { categoryId: selectedCategoryId },
  });

  const decisions = await prisma.dynamicCategoryAsinDecision.findMany({
    where: { categoryId: selectedCategoryId },
    orderBy: [{ lastSeenAt: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      asin: true,
      sourceAsin: true,
      status: true,
      reasonCode: true,
      reasonText: true,
      title: true,
      brand: true,
      imageUrl: true,
      observedPrice: true,
      productId: true,
      firstSeenAt: true,
      lastSeenAt: true,
      createdAt: true,
    },
  });

  return (
    <ExpansionWorkbenchClient
      categories={categories}
      selectedCategoryId={selectedCategoryId}
      notice={notice}
      selectedCategory={selectedCategory}
      baseProductCount={baseProductCount}
      decisions={decisions.map((decision) => ({
        id: decision.id,
        asin: decision.asin,
        sourceAsin: decision.sourceAsin,
        status: decision.status,
        reasonCode: decision.reasonCode,
        reasonText: decision.reasonText,
        title: decision.title,
        brand: decision.brand,
        imageUrl: decision.imageUrl,
        observedPrice: decision.observedPrice,
        productId: decision.productId,
        firstSeenAt: decision.firstSeenAt.toISOString(),
        lastSeenAt: decision.lastSeenAt.toISOString(),
        createdAt: decision.createdAt.toISOString(),
      }))}
    />
  );
}
