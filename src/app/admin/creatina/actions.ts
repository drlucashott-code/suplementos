"use server";

import { PrismaClient, Store, CreatineForm } from "@prisma/client";
import { extractAmazonASIN } from "@/lib/extractAmazonASIN";
import { revalidatePath } from "next/cache";

const prisma = new PrismaClient();

/* =========================
   CREATE (MANUAL)
   ========================= */
export async function createCreatineAction(formData: FormData) {
  const name = formData.get("name") as string;
  const brand = formData.get("brand") as string;
  const flavor = (formData.get("flavor") as string) || null;
  const imageUrl = (formData.get("imageUrl") as string) || "";

  const form = formData.get("form") as CreatineForm;
  const totalUnits = Number(formData.get("totalUnits"));
  const unitsPerDose = Number(formData.get("unitsPerDose"));

  const amazonAsinRaw =
    (formData.get("amazonAsin") as string | null)?.trim() || null;

  if (!name || !brand || !form || totalUnits <= 0) {
    throw new Error("Campos obrigatórios ausentes");
  }

  const product = await prisma.product.create({
    data: {
      category: "creatina",
      name,
      brand,
      flavor,
      imageUrl,
      creatineInfo: {
        create: {
          form,
          totalUnits,
          unitsPerDose: unitsPerDose || 0,
        },
      },
    },
  });

  if (amazonAsinRaw) {
    const asin = extractAmazonASIN(amazonAsinRaw);
    if (!asin) throw new Error("ASIN inválido");

    const exists = await prisma.offer.findFirst({
      where: {
        store: Store.AMAZON,
        externalId: asin,
      },
    });

    if (exists) {
      throw new Error("Este ASIN da Amazon já está cadastrado");
    }

    await prisma.offer.create({
      data: {
        productId: product.id,
        store: Store.AMAZON,
        externalId: asin,
        affiliateUrl: "",
        price: 0,
      },
    });
  }

  revalidatePath("/admin/creatina");
}

/* =========================
   UPDATE
   ========================= */
export async function updateCreatineAction(formData: FormData) {
  const id = formData.get("id") as string;

  const name = formData.get("name") as string;
  const brand = formData.get("brand") as string;
  const flavor = (formData.get("flavor") as string) || null;
  const imageUrl = (formData.get("imageUrl") as string) || "";

  const form = formData.get("form") as CreatineForm;
  const totalUnits = Number(formData.get("totalUnits"));
  const unitsPerDose = Number(formData.get("unitsPerDose"));

  if (!id || !name || !brand || !form || totalUnits <= 0) {
    throw new Error("Dados inválidos para edição");
  }

  await prisma.product.update({
    where: { id },
    data: {
      name,
      brand,
      flavor,
      imageUrl,
      creatineInfo: {
        update: {
          form,
          totalUnits,
          unitsPerDose: unitsPerDose || 0,
        },
      },
    },
  });

  revalidatePath("/admin/creatina");
}

/* =========================
   DELETE
   ========================= */
export async function deleteCreatineAction(formData: FormData) {
  const id = formData.get("id") as string;
  if (!id) {
    throw new Error("ID inválido");
  }

  await prisma.product.delete({
    where: { id },
  });

  revalidatePath("/admin/creatina");
}
