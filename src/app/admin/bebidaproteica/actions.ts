"use server";

import { prisma } from "@/lib/prisma";
import { extractAmazonASIN } from "@/lib/extractAmazonASIN";
import { revalidatePath } from "next/cache";

/* ==========================================================================
   CREATE (BARRA)
   ========================================================================== */
export async function createBarraAction(formData: FormData) {
  const name = formData.get("name") as string;
  const brand = formData.get("brand") as string;
  const flavor = (formData.get("flavor") as string) || null;
  const imageUrl = (formData.get("imageUrl") as string) || "";

  const unitsPerBox = Math.floor(Number(formData.get("unitsPerBox"))); 
  const doseInGrams = Number(formData.get("doseInGrams"));                  
  const proteinPerDoseInGrams = Number(formData.get("proteinPerDoseInGrams"));

  const amazonAsinRaw = (formData.get("amazonAsin") as string | null)?.trim() || null;

  if (
    !name ||
    !brand ||
    unitsPerBox <= 0 ||
    doseInGrams <= 0 ||
    proteinPerDoseInGrams <= 0
  ) {
    throw new Error("Preencha todos os campos obrigatórios com valores válidos.");
  }

  const product = await prisma.product.create({
    data: {
      category: "barra",
      name,
      brand,
      flavor,
      imageUrl,
      proteinBarInfo: {
        create: {
          unitsPerBox,
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

  revalidatePath("/admin/barra");
}

/* ==========================================================================
   UPDATE (BARRA INDIVIDUAL)
   ========================================================================== */
export async function updateBarraAction(formData: FormData) {
  const id = formData.get("id") as string;
  const name = formData.get("name") as string;
  const brand = formData.get("brand") as string;
  const flavor = (formData.get("flavor") as string) || null;
  const imageUrl = (formData.get("imageUrl") as string) || "";

  const unitsPerBox = Math.floor(Number(formData.get("unitsPerBox")));
  const doseInGrams = Number(formData.get("doseInGrams"));
  const proteinPerDoseInGrams = Number(formData.get("proteinPerDoseInGrams"));

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

  await prisma.proteinBarInfo.update({
    where: { productId: id },
    data: {
      unitsPerBox,
      doseInGrams,
      proteinPerDoseInGrams,
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

  revalidatePath("/admin/barra");
}

/* ==========================================================================
   BULK UPDATE (EDIÇÃO EM LOTE)
   ========================================================================== */
export async function bulkUpdateBarraAction(ids: string[], data: {
  name?: string;
  brand?: string;
  unitsPerBox?: number;
  doseInGrams?: number;
  proteinPerDoseInGrams?: number;
}) {
  if (!ids.length) throw new Error("Nenhum produto selecionado.");

  // 1. Atualiza os dados na tabela Product (Nome e Marca)
  if (data.name || data.brand) {
    await prisma.product.updateMany({
      where: { id: { in: ids } },
      data: { 
        ...(data.name && { name: data.name }),
        ...(data.brand && { brand: data.brand }) 
      }
    });
  }

  // 2. Atualiza os dados nutricionais e de peso na tabela ProteinBarInfo
  const updatePromises = ids.map(id => 
    prisma.proteinBarInfo.update({
      where: { productId: id },
      data: {
        ...(data.unitsPerBox !== undefined && { unitsPerBox: data.unitsPerBox }),
        ...(data.doseInGrams !== undefined && { doseInGrams: data.doseInGrams }),
        ...(data.proteinPerDoseInGrams !== undefined && { proteinPerDoseInGrams: data.proteinPerDoseInGrams }),
      }
    })
  );

  await Promise.all(updatePromises);

  revalidatePath("/admin/barra");
}

/* ==========================================================================
   BULK DELETE (EXCLUSÃO EM LOTE)
   ========================================================================== */
export async function bulkDeleteBarraAction(ids: string[]) {
  if (!ids.length) throw new Error("Nenhum produto selecionado.");

  // O deleteMany do Prisma cuidará da remoção em massa 
  // (Certifique-se que o schema possui onDelete: Cascade para as relações)
  await prisma.product.deleteMany({
    where: { id: { in: ids } },
  });

  revalidatePath("/admin/barra");
}

/* ==========================================================================
   DELETE (BARRA INDIVIDUAL)
   ========================================================================== */
export async function deleteBarraAction(formData: FormData) {
  const id = formData.get("id") as string;
  if (!id) throw new Error("ID inválido.");

  await prisma.product.delete({
    where: { id },
  });

  revalidatePath("/admin/barra");
}