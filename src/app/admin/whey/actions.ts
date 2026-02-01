"use server";

import { prisma } from "@/lib/prisma";
import { extractAmazonASIN } from "@/lib/extractAmazonASIN";
import { revalidatePath } from "next/cache";

/* ==========================================================================
   CREATE (WHEY)
   ========================================================================== */
export async function createWheyAction(formData: FormData) {
  const name = formData.get("name") as string;
  const brand = formData.get("brand") as string;
  const flavor = (formData.get("flavor") as string) || null;
  const imageUrl = (formData.get("imageUrl") as string) || "";

  const totalWeightInGrams = Number(formData.get("totalWeightInGrams"));
  const doseInGrams = Number(formData.get("doseInGrams"));
  const proteinPerDoseInGrams = Number(formData.get("proteinPerDoseInGrams"));

  const amazonAsinRaw =
    (formData.get("amazonAsin") as string | null)?.trim() || null;

  if (
    !name ||
    !brand ||
    totalWeightInGrams <= 0 ||
    doseInGrams <= 0 ||
    proteinPerDoseInGrams <= 0
  ) {
    throw new Error("Preencha todos os campos obrigatórios com valores válidos.");
  }

  const product = await prisma.product.create({
    data: {
      category: "whey",
      name,
      brand,
      flavor,
      imageUrl,
      wheyInfo: {
        create: {
          totalWeightInGrams,
          doseInGrams,
          proteinPerDoseInGrams,
        },
      },
    },
  });

  if (amazonAsinRaw) {
    const asin = extractAmazonASIN(amazonAsinRaw);
    if (!asin) throw new Error("ASIN inválido");

    const exists = await prisma.offer.findFirst({
      where: { store: "AMAZON", externalId: asin },
    });

    if (exists)
      throw new Error("Este ASIN já está cadastrado em outro produto.");

    await prisma.offer.create({
      data: {
        productId: product.id,
        store: "AMAZON",
        externalId: asin,
        affiliateUrl: "",
        price: 0,
      },
    });
  }

  revalidatePath("/admin/whey");
}

/* ==========================================================================
   UPDATE (WHEY INDIVIDUAL)
   ========================================================================== */
export async function updateWheyAction(formData: FormData) {
  const id = formData.get("id") as string;
  const name = formData.get("name") as string;
  const brand = formData.get("brand") as string;
  const flavor = (formData.get("flavor") as string) || null;
  const imageUrl = (formData.get("imageUrl") as string) || "";

  const totalWeightInGrams = Number(formData.get("totalWeightInGrams"));
  const doseInGrams = Number(formData.get("doseInGrams"));
  const proteinPerDoseInGrams = Number(formData.get("proteinPerDoseInGrams"));

  const amazonAsinRaw =
    (formData.get("amazonAsin") as string | null)?.trim() || null;

  if (!id || !name || !brand) {
    throw new Error("ID, nome e marca são obrigatórios.");
  }

  // 1. Produto
  await prisma.product.update({
    where: { id },
    data: {
      name,
      brand,
      flavor,
      imageUrl,
    },
  });

  // 2. WheyInfo
  await prisma.wheyInfo.update({
    where: { productId: id },
    data: {
      totalWeightInGrams,
      doseInGrams,
      proteinPerDoseInGrams,
    },
  });

  // 3. ASIN Amazon (opcional)
  if (amazonAsinRaw) {
    const asin = extractAmazonASIN(amazonAsinRaw);
    if (!asin) throw new Error("ASIN inválido");

    const existing = await prisma.offer.findFirst({
      where: {
        store: "AMAZON",
        externalId: asin,
        productId: { not: id },
      },
    });

    if (existing)
      throw new Error("Este ASIN já pertence a outro produto.");

    const currentOffer = await prisma.offer.findFirst({
      where: { productId: id, store: "AMAZON" },
    });

    if (currentOffer) {
      await prisma.offer.update({
        where: { id: currentOffer.id },
        data: { externalId: asin },
      });
    } else {
      await prisma.offer.create({
        data: {
          productId: id,
          store: "AMAZON",
          externalId: asin,
          affiliateUrl: "",
          price: 0,
        },
      });
    }
  }

  revalidatePath("/admin/whey");
}

/* ==========================================================================
   BULK UPDATE (EDIÇÃO EM LOTE)
   ========================================================================== */
export async function bulkUpdateWheyAction(
  ids: string[],
  data: {
    name?: string;
    brand?: string;
    totalWeightInGrams?: number;
    doseInGrams?: number;
    proteinPerDoseInGrams?: number;
  }
) {
  if (!ids.length) throw new Error("Nenhum produto selecionado.");

  // 1. Atualiza Product (nome / marca)
  if (data.name || data.brand) {
    await prisma.product.updateMany({
      where: { id: { in: ids } },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.brand && { brand: data.brand }),
      },
    });
  }

  // 2. Atualiza WheyInfo
  const updatePromises = ids.map((id) =>
    prisma.wheyInfo.update({
      where: { productId: id },
      data: {
        ...(data.totalWeightInGrams !== undefined && {
          totalWeightInGrams: data.totalWeightInGrams,
        }),
        ...(data.doseInGrams !== undefined && {
          doseInGrams: data.doseInGrams,
        }),
        ...(data.proteinPerDoseInGrams !== undefined && {
          proteinPerDoseInGrams: data.proteinPerDoseInGrams,
        }),
      },
    })
  );

  await Promise.all(updatePromises);

  revalidatePath("/admin/whey");
}

/* ==========================================================================
   BULK DELETE (EXCLUSÃO EM LOTE)
   ========================================================================== */
export async function bulkDeleteWheyAction(ids: string[]) {
  if (!ids.length) throw new Error("Nenhum produto selecionado.");

  // O deleteMany cuidará da exclusão em massa
  // (requer onDelete: Cascade no schema)
  await prisma.product.deleteMany({
    where: { id: { in: ids } },
  });

  revalidatePath("/admin/whey");
}

/* ==========================================================================
   DELETE (WHEY INDIVIDUAL)
   ========================================================================== */
export async function deleteWheyAction(formData: FormData) {
  const id = formData.get("id") as string;
  if (!id) throw new Error("ID inválido.");

  await prisma.product.delete({
    where: { id },
  });

  revalidatePath("/admin/whey");
}
