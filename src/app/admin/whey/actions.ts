"use server";

import { prisma } from "@/lib/prisma";
import { extractAmazonASIN } from "@/lib/extractAmazonASIN";
import { revalidatePath } from "next/cache";

export async function createWheyAction(formData: FormData) {
  const name = formData.get("name") as string;
  const brand = formData.get("brand") as string;
  const flavor = (formData.get("flavor") as string) || null;
  const imageUrl = (formData.get("imageUrl") as string) || "";

  const totalWeightInGrams = Number(formData.get("totalWeightInGrams"));
  const doseInGrams = Number(formData.get("doseInGrams"));
  const proteinPerDoseInGrams = Number(
    formData.get("proteinPerDoseInGrams")
  );

  const amazonAsinRaw =
    (formData.get("amazonAsin") as string | null)?.trim() || null;

  if (
    !name ||
    !brand ||
    totalWeightInGrams <= 0 ||
    doseInGrams <= 0 ||
    proteinPerDoseInGrams <= 0
  ) {
    throw new Error("Campos obrigatórios inválidos");
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
      where: {
        store: "AMAZON",
        externalId: asin,
      },
    });

    if (exists) {
      throw new Error("Este ASIN da Amazon já está cadastrado");
    }

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

export async function deleteWheyAction(formData: FormData) {
  const id = formData.get("id") as string;
  if (!id) throw new Error("ID inválido");

  await prisma.product.delete({
    where: { id },
  });

  revalidatePath("/admin/whey");
}
