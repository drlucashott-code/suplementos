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
  const flavor = (formData.get("flavor") as string) || null;
  const imageUrl = (formData.get("imageUrl") as string) || "";
  const weightInGrams = Number(formData.get("weightInGrams"));
  const purityPercent = Number(formData.get("purityPercent"));
  const form = formData.get("form") as CreatineForm;

  const amazonAsinRaw =
    (formData.get("amazonAsin") as string | null)?.trim() || null;

  const mlAffiliateUrl =
    (formData.get("mercadoLivreAffiliate") as string | null)?.trim() || null;

  if (!name || !brand || !weightInGrams || !purityPercent) {
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
      weightInGrams,
      creatineInfo: {
        create: {
          form,
          purityPercent,
        },
      },
    },
  });

  /* ---------- oferta Amazon (OPCIONAL) ---------- */
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

  /* ---------- oferta Mercado Livre (OPCIONAL) ---------- */
  if (mlAffiliateUrl) {
    const mlb = await resolveMLBFromAffiliateUrl(
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
  const flavor = (formData.get("flavor") as string) || null;
  const imageUrl = (formData.get("imageUrl") as string) || "";
  const weightInGrams = Number(formData.get("weightInGrams"));
  const purityPercent = Number(formData.get("purityPercent"));
  const form = formData.get("form") as CreatineForm;

  const amazonAsinRaw =
    (formData.get("amazonAsin") as string | null)?.trim() || null;

  const mlAffiliateUrl =
    (formData.get("mercadoLivreAffiliate") as string | null)?.trim() || null;

  if (!id || !name || !brand) {
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
      weightInGrams,
      creatineInfo: {
        update: {
          form,
          purityPercent,
        },
      },
    },
  });

  /* ---------- AMAZON ---------- */
  const existingAmazonOffer = await prisma.offer.findFirst({
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
    // remove oferta se campo foi apagado
    await prisma.offer.delete({
      where: { id: existingAmazonOffer.id },
    });
  }

  /* ---------- MERCADO LIVRE ---------- */
  const existingMLOffer = await prisma.offer.findFirst({
    where: {
      productId: id,
      store: Store.MERCADO_LIVRE,
    },
  });

  if (mlAffiliateUrl) {
    const mlb = await resolveMLBFromAffiliateUrl(
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
    // remove oferta se campo foi apagado
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
