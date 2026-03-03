"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// Se você não tiver esse arquivo, pode remover a linha e usar a lógica simples abaixo
import { extractAmazonASIN } from "@/lib/extractAmazonASIN";

const PATH_TO_REVALIDATE = "/admin/cafe-funcional"; // Adaptado

/* ==========================================================================
   CREATE (CAFÉ FUNCIONAL)
   ========================================================================== */
export async function createCafeFuncionalAction(formData: FormData) {
  const name = formData.get("name") as string;
  const brand = formData.get("brand") as string;
  const flavor = (formData.get("flavor") as string) || null;
  const imageUrl = (formData.get("imageUrl") as string) || "";
  const amazonAsinRaw = (formData.get("amazonAsin") as string | null)?.trim() || null;

  // Campos numéricos
  const totalWeightInGrams = Number(formData.get("totalWeightInGrams"));
  const doseInGrams = Number(formData.get("doseInGrams"));
  const caffeinePerDoseInMg = Number(formData.get("caffeinePerDoseInMg"));

  if (!name || !brand || totalWeightInGrams <= 0 || doseInGrams <= 0) {
    throw new Error("Preencha os campos obrigatórios corretamente.");
  }

  // 1. Cria o Produto
  const product = await prisma.product.create({
    data: {
      category: "cafe-funcional", // Categoria no banco
      name,
      brand,
      flavor, 
      imageUrl,
      functionalCoffeeInfo: {
        create: {
          totalWeightInGrams,
          doseInGrams,
          caffeinePerDoseInMg,
        },
      },
    },
  });

  // 2. Cria a Oferta Amazon (se tiver ASIN)
  if (amazonAsinRaw) {
    const asin = extractAmazonASIN(amazonAsinRaw) || amazonAsinRaw;
    
    if (asin) {
      const exists = await prisma.offer.findFirst({
        where: { store: "AMAZON", externalId: asin },
      });

      if (!exists) {
        await prisma.offer.create({
          data: {
            productId: product.id,
            store: "AMAZON",
            externalId: asin,
            affiliateUrl: `https://amazon.com.br/dp/${asin}`, 
            price: 0,
          },
        });
      }
    }
  }

  revalidatePath(PATH_TO_REVALIDATE);
}

/* ==========================================================================
   UPDATE (CAFÉ FUNCIONAL INDIVIDUAL)
   ========================================================================== */
export async function updateCafeFuncionalAction(formData: FormData) {
  const id = formData.get("id") as string;
  const name = formData.get("name") as string;
  const brand = formData.get("brand") as string;
  const flavor = (formData.get("flavor") as string) || null;
  const imageUrl = (formData.get("imageUrl") as string) || "";
  const amazonAsinRaw = (formData.get("amazonAsin") as string | null)?.trim() || null;

  const totalWeightInGrams = Number(formData.get("totalWeightInGrams"));
  const doseInGrams = Number(formData.get("doseInGrams"));
  const caffeinePerDoseInMg = Number(formData.get("caffeinePerDoseInMg"));

  if (!id || !name) throw new Error("ID e nome são obrigatórios.");

  // 1. Atualiza Produto Base
  await prisma.product.update({
    where: { id },
    data: { 
      name, 
      brand, 
      flavor, 
      imageUrl 
    },
  });

  // 2. Atualiza Info Técnica (Upsert garante que cria se não existir)
  await prisma.functionalCoffeeInfo.upsert({
    where: { productId: id },
    update: {
      totalWeightInGrams,
      doseInGrams,
      caffeinePerDoseInMg,
    },
    create: {
      productId: id,
      totalWeightInGrams,
      doseInGrams,
      caffeinePerDoseInMg,
    },
  });

  // 3. Atualiza ASIN da Amazon
  if (amazonAsinRaw) {
    const asin = extractAmazonASIN(amazonAsinRaw) || amazonAsinRaw;
    
    if (asin) {
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
            affiliateUrl: `https://amazon.com.br/dp/${asin}`,
            price: 0,
          },
        });
      }
    }
  }

  revalidatePath(PATH_TO_REVALIDATE);
}

/* ==========================================================================
   BULK UPDATE (LOTE)
   ========================================================================== */
export async function bulkUpdateCafeFuncionalAction(
  ids: string[], 
  data: {
    name?: string;
    brand?: string;
    flavor?: string;
    totalWeightInGrams?: number;
    doseInGrams?: number;
    caffeinePerDoseInMg?: number;
  }
) {
  if (!ids.length) return;

  const { name, brand, flavor, ...techData } = data;

  // 1. Atualiza dados da tabela PRODUCT (Nome, Marca, Sabor)
  if (name || brand || flavor !== undefined) {
    await prisma.product.updateMany({
      where: { id: { in: ids } },
      data: {
        ...(name && { name }),
        ...(brand && { brand }),
        ...(flavor !== undefined && { flavor }),
      },
    });
  }

  // 2. Atualiza dados da tabela FUNCTIONAL COFFEE INFO (Pesos, Cafeína)
  if (Object.keys(techData).length > 0) {
    const products = await prisma.product.findMany({
      where: { id: { in: ids } },
      select: { functionalCoffeeInfo: { select: { id: true } } }
    });

    const infoIds = products
      .map(p => p.functionalCoffeeInfo?.id)
      .filter((id): id is string => !!id);

    if (infoIds.length > 0) {
      await prisma.functionalCoffeeInfo.updateMany({
        where: { id: { in: infoIds } },
        data: {
          ...(techData.totalWeightInGrams && { totalWeightInGrams: techData.totalWeightInGrams }),
          ...(techData.doseInGrams && { doseInGrams: techData.doseInGrams }),
          ...(techData.caffeinePerDoseInMg !== undefined && { caffeinePerDoseInMg: techData.caffeinePerDoseInMg }),
        }
      });
    }
  }

  revalidatePath(PATH_TO_REVALIDATE);
}

/* ==========================================================================
   DELETE (INDIVIDUAL E LOTE)
   ========================================================================== */
export async function deleteCafeFuncionalAction(formData: FormData) {
  const id = formData.get("id") as string;
  if (id) {
    await prisma.product.delete({ where: { id } });
    revalidatePath(PATH_TO_REVALIDATE);
  }
}

export async function bulkDeleteCafeFuncionalAction(ids: string[]) {
  if (ids.length) {
    await prisma.product.deleteMany({ where: { id: { in: ids } } });
    revalidatePath(PATH_TO_REVALIDATE);
  }
}