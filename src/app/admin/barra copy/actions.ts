"use server";

import { prisma } from "@/lib/prisma";
import { extractAmazonASIN } from "@/lib/extractAmazonASIN";
import { revalidatePath } from "next/cache";

/* ==========================================================================
   CREATE (BEBIDA PROTEICA)
   ========================================================================== */
export async function createBebidaProteicaAction(formData: FormData) {
  const name = formData.get("name") as string;
  const brand = formData.get("brand") as string;
  const flavor = (formData.get("flavor") as string) || null;
  const imageUrl = (formData.get("imageUrl") as string) || "";

  const unitsPerPack = Math.floor(Number(formData.get("unitsPerPack"))); 
  const volumePerUnitInMl = Number(formData.get("volumePerUnitInMl"));                  
  const proteinPerUnitInGrams = Number(formData.get("proteinPerUnitInGrams"));

  const amazonAsinRaw = (formData.get("amazonAsin") as string | null)?.trim() || null;

  if (
    !name ||
    !brand ||
    unitsPerPack <= 0 ||
    volumePerUnitInMl <= 0 ||
    proteinPerUnitInGrams <= 0
  ) {
    throw new Error("Preencha todos os campos obrigatórios com valores válidos.");
  }

  const product = await prisma.product.create({
    data: {
      category: "bebidaproteica",
      name,
      brand,
      flavor,
      imageUrl,
      proteinDrinkInfo: {
        create: {
          unitsPerPack,
          volumePerUnitInMl,
          proteinPerUnitInGrams,
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

    if (exists) throw new Error("Este ASIN já está cadastrado em outro produto.");

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

  revalidatePath("/admin/bebidaproteica");
}

/* ==========================================================================
   UPDATE (BEBIDA PROTEICA INDIVIDUAL)
   ========================================================================== */
export async function updateBebidaProteicaAction(formData: FormData) {
  const id = formData.get("id") as string;
  const name = formData.get("name") as string;
  const brand = formData.get("brand") as string;
  const flavor = (formData.get("flavor") as string) || null;
  const imageUrl = (formData.get("imageUrl") as string) || "";

  const unitsPerPack = Math.floor(Number(formData.get("unitsPerPack")));
  const volumePerUnitInMl = Number(formData.get("volumePerUnitInMl"));
  const proteinPerUnitInGrams = Number(formData.get("proteinPerUnitInGrams"));

  const amazonAsinRaw = (formData.get("amazonAsin") as string | null)?.trim() || null;

  if (!id || !name || !brand) {
    throw new Error("ID, nome e marca são obrigatórios.");
  }

  await prisma.product.update({
    where: { id },
    data: {
      name,
      brand,
      flavor,
      imageUrl,
    },
  });

  await prisma.proteinDrinkInfo.update({
    where: { productId: id },
    data: {
      unitsPerPack,
      volumePerUnitInMl,
      proteinPerUnitInGrams,
    },
  });

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

    if (existing) throw new Error("Este ASIN já pertence a outro produto.");

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

  revalidatePath("/admin/bebidaproteica");
}

/* ==========================================================================
   BULK UPDATE (EDIÇÃO EM LOTE)
   ========================================================================== */
export async function bulkUpdateBebidaProteicaAction(ids: string[], data: {
  name?: string;
  brand?: string;
  unitsPerPack?: number;
  volumePerUnitInMl?: number;
  proteinPerUnitInGrams?: number;
}) {
  if (!ids.length) throw new Error("Nenhum produto selecionado.");

  if (data.name || data.brand) {
    await prisma.product.updateMany({
      where: { id: { in: ids } },
      data: { 
        ...(data.name && { name: data.name }),
        ...(data.brand && { brand: data.brand }) 
      }
    });
  }

  const updatePromises = ids.map(id => 
    prisma.proteinDrinkInfo.update({
      where: { productId: id },
      data: {
        ...(data.unitsPerPack !== undefined && { unitsPerPack: data.unitsPerPack }),
        ...(data.volumePerUnitInMl !== undefined && { volumePerUnitInMl: data.volumePerUnitInMl }),
        ...(data.proteinPerUnitInGrams !== undefined && { proteinPerUnitInGrams: data.proteinPerUnitInGrams }),
      }
    })
  );

  await Promise.all(updatePromises);

  revalidatePath("/admin/bebidaproteica");
}

/* ==========================================================================
   BULK DELETE (EXCLUSÃO EM LOTE)
   ========================================================================== */
export async function bulkDeleteBebidaProteicaAction(ids: string[]) {
  if (!ids.length) throw new Error("Nenhum produto selecionado.");

  await prisma.product.deleteMany({
    where: { id: { in: ids } },
  });

  revalidatePath("/admin/bebidaproteica");
}

/* ==========================================================================
   DELETE (BEBIDA PROTEICA INDIVIDUAL)
   ========================================================================== */
export async function deleteBebidaProteicaAction(formData: FormData) {
  const id = formData.get("id") as string;
  if (!id) throw new Error("ID inválido.");

  await prisma.product.delete({
    where: { id },
  });

  revalidatePath("/admin/bebidaproteica");
}