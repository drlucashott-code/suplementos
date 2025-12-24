"use server";

import { PrismaClient, Store, CreatineForm } from "@prisma/client";
import { extractAmazonASIN } from "@/lib/extractAmazonASIN";
import { resolveMLBFromAffiliateUrl } from "@/lib/resolveMercadoLivreAffiliate";
import { revalidatePath } from "next/cache";

const prisma = new PrismaClient();

/* =========================
   CREATE
   ========================= */
export async function createCreatineAction(
  formData: FormData
) {
  const name = formData.get("name") as string;
  const brand = formData.get("brand") as string;
  const flavor =
    (formData.get("flavor") as string) || null;
  const imageUrl =
    (formData.get("imageUrl") as string) || "";

  const form = formData.get("form") as CreatineForm;

  const totalUnits = Number(
    formData.get("totalUnits")
  );
  const unitsPerDose = Number(
    formData.get("unitsPerDose")
  );

  const amazonAsinRaw =
    (formData.get("amazonAsin") as string | null)
      ?.trim() || null;

  const mlAffiliateUrl =
    (formData.get(
      "mercadoLivreAffiliate"
    ) as string | null)?.trim() || null;

  /* ---------- validação ---------- */
  if (
    !name ||
    !brand ||
    !form ||
    totalUnits <= 0 ||
    unitsPerDose <= 0
  ) {
    throw new Error("Campos obrigatórios ausentes");
  }

  /* ---------- cria produto ---------- */
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
          unitsPerDose,
        },
      },
    },
  });

  /* ---------- oferta Amazon (opcional) ---------- */
  if (amazonAsinRaw) {
    const asin = extractAmazonASIN(amazonAsinRaw);

    if (asin) {
      await prisma.offer.create({
        data: {
          productId: product.id,
          store: Store.AMAZON,
          externalId: asin,
          price: 0,
          affiliateUrl: "",
        },
      });
    }
  }

  /* ---------- oferta Mercado Livre (opcional) ---------- */
  if (mlAffiliateUrl) {
    const mlb =
      await resolveMLBFromAffiliateUrl(
        mlAffiliateUrl
      );

    await prisma.offer.create({
      data: {
        productId: product.id,
        store: Store.MERCADO_LIVRE,
        externalId: mlb,
        affiliateUrl: mlAffiliateUrl,
        price: 0,
      },
    });
  }

  revalidatePath("/admin/creatina");
}

/* =========================
   UPDATE — EDITA TUDO
   ========================= */
export async function updateCreatineAction(
  formData: FormData
) {
  const id = formData.get("id") as string;

  const name = formData.get("name") as string;
  const brand = formData.get("brand") as string;
  const flavor =
    (formData.get("flavor") as string) || null;
  const imageUrl =
    (formData.get("imageUrl") as string) || "";

  const form = formData.get("form") as CreatineForm;

  const totalUnits = Number(
    formData.get("totalUnits")
  );
  const unitsPerDose = Number(
    formData.get("unitsPerDose")
  );

  const amazonAsinRaw =
    (formData.get("amazonAsin") as string | null)
      ?.trim() || null;

  const mlAffiliateUrl =
    (formData.get(
      "mercadoLivreAffiliate"
    ) as string | null)?.trim() || null;

  if (
    !id ||
    !name ||
    !brand ||
    !form ||
    totalUnits <= 0 ||
    unitsPerDose <= 0
  ) {
    throw new Error("Dados inválidos para edição");
  }

  /* ---------- produto ---------- */
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
          unitsPerDose,
        },
      },
    },
  });

  /* ---------- AMAZON ---------- */
  const existingAmazonOffer =
    await prisma.offer.findFirst({
      where: {
        productId: id,
        store: Store.AMAZON,
      },
    });

  if (amazonAsinRaw) {
    const asin = extractAmazonASIN(amazonAsinRaw);

    if (asin) {
      if (existingAmazonOffer) {
        await prisma.offer.update({
          where: { id: existingAmazonOffer.id },
          data: {
            externalId: asin,
          },
        });
      } else {
        await prisma.offer.create({
          data: {
            productId: id,
            store: Store.AMAZON,
            externalId: asin,
            price: 0,
            affiliateUrl: "",
          },
        });
      }
    }
  } else if (existingAmazonOffer) {
    await prisma.offer.delete({
      where: { id: existingAmazonOffer.id },
    });
  }

  /* ---------- MERCADO LIVRE ---------- */
  const existingMLOffer =
    await prisma.offer.findFirst({
      where: {
        productId: id,
        store: Store.MERCADO_LIVRE,
      },
    });

  if (mlAffiliateUrl) {
    const mlb =
      await resolveMLBFromAffiliateUrl(
        mlAffiliateUrl
      );

    if (existingMLOffer) {
      await prisma.offer.update({
        where: { id: existingMLOffer.id },
        data: {
          externalId: mlb,
          affiliateUrl: mlAffiliateUrl,
        },
      });
    } else {
      await prisma.offer.create({
        data: {
          productId: id,
          store: Store.MERCADO_LIVRE,
          externalId: mlb,
          affiliateUrl: mlAffiliateUrl,
          price: 0,
        },
      });
    }
  } else if (existingMLOffer) {
    await prisma.offer.delete({
      where: { id: existingMLOffer.id },
    });
  }

  revalidatePath("/admin/creatina");
}

/* =========================
   DELETE
   ========================= */
export async function deleteCreatineAction(
  formData: FormData
) {
  const id = formData.get("id") as string;

  if (!id) {
    throw new Error("ID inválido");
  }

  await prisma.product.delete({
    where: { id },
  });

  revalidatePath("/admin/creatina");
}
