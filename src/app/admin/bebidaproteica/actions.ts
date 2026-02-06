"use server";

import { prisma } from "@/lib/prisma";
import { extractAmazonASIN } from "@/lib/extractAmazonASIN";
import { revalidatePath } from "next/cache";

// AJUSTE AQUI SE SUA ROTA FOR DIFERENTE (Ex: /admin/bebida)
const PATH_TO_REVALIDATE = "/admin/bebidaproteica";

/* ==========================================================================
   CREATE (BEBIDA)
   ========================================================================== */
export async function createBebidaAction(formData: FormData) {
  const name = formData.get("name") as string;
  const brand = formData.get("brand") as string;
  const flavor = (formData.get("flavor") as string) || null;
  const imageUrl = (formData.get("imageUrl") as string) || "";

  // Conversão dos novos campos numéricos
  const unitsPerPack = Math.floor(Number(formData.get("unitsPerPack"))); // Int
  const volumePerUnitInMl = Number(formData.get("volumePerUnitInMl"));   // Float
  const proteinPerUnitInGrams = Number(formData.get("proteinPerUnitInGrams")); // Float

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
      category: "bebida_proteica", // Categoria fixa
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

  // Lógica de criação de Oferta (ASIN)
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

  revalidatePath(PATH_TO_REVALIDATE);
}

/* ==========================================================================
   UPDATE (BEBIDA INDIVIDUAL)
   ========================================================================== */
export async function updateBebidaAction(formData: FormData) {
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

  // Atualiza dados base do Produto
  await prisma.product.update({
    where: { id },
    data: {
      name,
      brand,
      flavor,
      imageUrl,
    },
  });

  // Atualiza dados específicos da Bebida (Upsert garante que cria se não existir)
  await prisma.proteinDrinkInfo.upsert({
    where: { productId: id },
    update: {
      unitsPerPack,
      volumePerUnitInMl,
      proteinPerUnitInGrams,
    },
    create: {
      productId: id,
      unitsPerPack,
      volumePerUnitInMl,
      proteinPerUnitInGrams,
    },
  });

  // Lógica de atualização de Oferta (ASIN)
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

  revalidatePath(PATH_TO_REVALIDATE);
}

/* ==========================================================================
   BULK UPDATE (EDIÇÃO EM LOTE - BEBIDA)
   ========================================================================== */
export async function bulkUpdateBebidaAction(ids: string[], data: {
  name?: string;
  brand?: string;
  unitsPerPack?: number;
  volumePerUnitInMl?: number;
  proteinPerUnitInGrams?: number;
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

  // 2. Atualiza os dados nutricionais e de volume na tabela ProteinDrinkInfo
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

  revalidatePath(PATH_TO_REVALIDATE);
}

/* ==========================================================================
   BULK DELETE (EXCLUSÃO EM LOTE)
   ========================================================================== */
export async function bulkDeleteBebidaAction(ids: string[]) {
  if (!ids.length) throw new Error("Nenhum produto selecionado.");

  await prisma.product.deleteMany({
    where: { id: { in: ids } },
  });

  revalidatePath(PATH_TO_REVALIDATE);
}

/* ==========================================================================
   DELETE (BEBIDA INDIVIDUAL)
   ========================================================================== */
export async function deleteBebidaAction(formData: FormData) {
  const id = formData.get("id") as string;
  if (!id) throw new Error("ID inválido.");

  await prisma.product.delete({
    where: { id },
  });

  revalidatePath(PATH_TO_REVALIDATE);
}