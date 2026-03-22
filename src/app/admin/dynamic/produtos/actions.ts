'use server';

import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client'; 
import { revalidatePath } from 'next/cache';

/**
 * TIPAGEM CORRIGIDA
 */
export type DynamicAttributes = {
  [key: string]: string | number | boolean | null | undefined;
};

function extractVolumeMlFromTitle(title: string): number | null {
  const normalizedTitle = title
    .toLowerCase()
    .replace(/,/g, '.')
    .replace(/\s+/g, ' ')
    .trim();

  const packMatch = normalizedTitle.match(
    /(\d+)\s*(?:x|un(?:id(?:ades?)?)?|frascos?|embalagens?)\s*(?:de\s*)?(\d+(?:\.\d+)?)\s*(ml|l)\b/
  );

  if (packMatch) {
    const units = Number(packMatch[1]);
    const amount = Number(packMatch[2]);
    const unit = packMatch[3];

    if (!Number.isNaN(units) && !Number.isNaN(amount)) {
      const totalMl = unit === 'l' ? units * amount * 1000 : units * amount;
      return Math.round(totalMl);
    }
  }

  const singleMatch = normalizedTitle.match(/(\d+(?:\.\d+)?)\s*(ml|l)\b/);

  if (!singleMatch) {
    return null;
  }

  const amount = Number(singleMatch[1]);
  if (Number.isNaN(amount)) {
    return null;
  }

  return Math.round(singleMatch[2] === 'l' ? amount * 1000 : amount);
}

function isHairVolumeCategory(category: { name?: string | null; slug?: string | null }) {
  const normalizedName = category.name?.toLowerCase() ?? '';
  const normalizedSlug = category.slug?.toLowerCase() ?? '';

  return (
    normalizedName.includes('condicionador') ||
    normalizedSlug.includes('condicionador') ||
    normalizedName.includes('shampoo') ||
    normalizedSlug.includes('shampoo')
  );
}

function enrichAttributesForCategory(params: {
  category: { name?: string | null; slug?: string | null };
  productName: string;
  attributes: DynamicAttributes;
}): DynamicAttributes {
  const enrichedAttributes = { ...params.attributes };

  if (isHairVolumeCategory(params.category)) {
    const currentVolume = Number(enrichedAttributes.volumeMl);
    if (!Number.isFinite(currentVolume) || currentVolume <= 0) {
      const extractedVolumeMl = extractVolumeMlFromTitle(params.productName);
      if (extractedVolumeMl) {
        enrichedAttributes.volumeMl = extractedVolumeMl;
      }
    }
  }

  return enrichedAttributes;
}

// Interface para o retorno da busca Amazon
export interface AmazonImportResult {
  asin: string; // âœ… ASIN agora Ã© obrigatÃ³rio no retorno
  name: string;
  totalPrice: number;
  imageUrl: string;
  url: string;
  brand?: string;
  error?: string;
}

/**
 * BUSCAR PRODUTO POR ID
 */
export async function getProductById(id: string) {
  try {
    return await prisma.dynamicProduct.findUnique({
      where: { id },
      include: { 
        category: true 
      }
    });
  } catch (error) {
    console.error("Erro ao buscar produto por ID:", error);
    return null;
  }
}

/**
 * BUSCAR DADOS DA AMAZON (Individual)
 */
export async function fetchAmazonProductData(asin: string): Promise<AmazonImportResult | { error: string }> {
  try {
    // SimulaÃ§Ã£o de busca - aqui entra sua lÃ³gica de scraper
    return {
      asin: asin,
      name: `Produto Amazon ${asin}`, 
      totalPrice: 63.99, 
      brand: "Marca Amazon", 
      imageUrl: `https://m.media-amazon.com/images/I/${asin}.jpg`,
      url: `https://www.amazon.com.br/dp/${asin}?tag=lucas-picks-20`
    };
  } catch (err) {
    console.error("Erro ao buscar dados da Amazon:", err);
    return { error: "Erro ao buscar ASIN." };
  }
}

/**
 * IMPORTAÇÃO EM MASSA (Bulk Import)
 * CORRIGIDO: Agora envia o ''asin'' na raiz do objeto
 */
export async function importBulkProducts(data: { asins: string; categoryId: string }) {
  const asinList = data.asins.split(',').map(a => a.trim()).filter(a => a !== '');
  const results = [];
  const category = await prisma.dynamicCategory.findUnique({
    where: { id: data.categoryId },
    select: { id: true, name: true, slug: true }
  });

  if (!category) {
    return { error: "Categoria não encontrada." };
  }

  for (const asin of asinList) {
    try {
      const alreadyExists = await prisma.dynamicProduct.findUnique({
        where: { asin }
      });

      if (alreadyExists) {
        results.push({ asin, status: 'skipped', message: 'Já cadastrado' });
        continue;
      }

      const scraped = await fetchAmazonProductData(asin);
      if ('error' in scraped) throw new Error(scraped.error);

      await prisma.dynamicProduct.create({
        data: {
          asin,
          name: scraped.name,
          imageUrl: scraped.imageUrl,
          url: scraped.url,
          totalPrice: scraped.totalPrice || 0,
          categoryId: data.categoryId,
          attributes: enrichAttributesForCategory({
            category,
            productName: scraped.name,
            attributes: {
              marca: scraped.brand || "Não Informada",
              asin,
            },
          }) as Prisma.InputJsonValue,
        }
      });
      results.push({ asin, status: 'success' });
    } catch (err) {
      console.error(`Erro ao importar ASIN ${asin}:`, err);
      results.push({ asin, status: 'error' });
    }
  }

  revalidatePath('/admin/dynamic/produtos');
  return { success: true, results };
}

/**
 * ATUALIZAÇÃO EM MASSA (Bulk Edit)
 */
export async function updateManyProducts(ids: string[], key: string, value: string | number) {
  try {
    await Promise.all(
      ids.map(async (id) => {
        const product = await prisma.dynamicProduct.findUnique({ 
          where: { id },
          select: { attributes: true } 
        });
        const currentAttributes = (product?.attributes as Record<string, Prisma.JsonValue>) || {};

        return prisma.dynamicProduct.update({
          where: { id },
          data: {
            attributes: {
              ...currentAttributes,
              [key]: value, 
            } as Prisma.InputJsonValue,
          },
        });
      })
    );

    revalidatePath('/admin/dynamic/produtos');
    return { success: true };
  } catch (err) {
    console.error("Erro no Bulk Edit:", err);
    return { error: "Falha ao atualizar em massa." };
  }
}

/**
 * ATUALIZAR PRODUTO (Individual / In-line)
 */

/**
 * ATUALIZAR PRODUTO (Individual / In-line)
 */
export async function updateDynamicProduct(id: string, data: {
  name?: string;
  totalPrice?: number;
  imageUrl?: string;
  url?: string;
  isVisibleOnSite?: boolean;
  attributes?: DynamicAttributes;
}) {
  try {
    const current = await prisma.dynamicProduct.findUnique({ where: { id } });
    const currentAttrs = (current?.attributes as Record<string, Prisma.JsonValue>) || {};

    await (prisma.dynamicProduct as unknown as {
      update: (args: {
        where: { id: string };
        data: Record<string, unknown>;
      }) => Promise<unknown>;
    }).update({
      where: { id },
      data: {
        name: data.name,
        totalPrice: data.totalPrice,
        imageUrl: data.imageUrl,
        url: data.url,
        isVisibleOnSite: data.isVisibleOnSite,
        attributes: data.attributes 
          ? { ...currentAttrs, ...data.attributes } as Prisma.InputJsonValue
          : undefined
      }
    });

    revalidatePath('/admin/dynamic/produtos');
    return { success: true };
  } catch (err) {
    console.error("Erro ao atualizar produto:", err);
    return { error: "Falha ao salvar alteraÃ§Ãµes." };
  }
}

/**
 * CRIAR PRODUTO (Individual via FormulÃ¡rio)
 * ðŸš€ CORRIGIDO: ExtraÃ§Ã£o e envio do 'asin' obrigatÃ³rio
 */
export async function createDynamicProduct(data: {
  name: string;
  totalPrice: number;
  url: string;
  imageUrl: string;
  categoryId: string;
  attributes: DynamicAttributes;
}) {
  try {
    const category = await prisma.dynamicCategory.findUnique({
      where: { id: data.categoryId },
      select: { id: true, name: true, slug: true }
    });

    if (!category) {
      return { error: "Categoria não encontrada." };
    }

    const asinMatch = data.url.match(/\/dp\/([A-Z0-9]{10})/);
    const extractedAsin = asinMatch ? asinMatch[1] : undefined;
    const finalAsin = (data.attributes?.asin as string) || extractedAsin;

    if (!finalAsin) {
      return { error: "Não foi possível identificar o ASIN do produto." };
    }

    const exists = await prisma.dynamicProduct.findUnique({ where: { asin: finalAsin } });
    if (exists) return { error: "Este produto (ASIN) já está cadastrado." };

    await prisma.dynamicProduct.create({ 
      data: {
        asin: finalAsin,
        name: data.name,
        totalPrice: data.totalPrice,
        url: data.url,
        imageUrl: data.imageUrl,
        categoryId: data.categoryId,
        attributes: enrichAttributesForCategory({
          category,
          productName: data.name,
          attributes: {
            ...data.attributes,
            asin: finalAsin,
          },
        }) as Prisma.InputJsonValue
      } 
    });
    
    revalidatePath('/admin/dynamic/produtos');
    return { success: true };
  } catch (err) {
    console.error("Erro ao salvar produto:", err);
    return { error: "Erro ao salvar produto no banco." };
  }
}

/**
 * BUSCAR TODOS OS PRODUTOS
 */
export async function getDynamicProducts() {
  try {
    return await prisma.dynamicProduct.findMany({
      include: {
        category: {
          select: { id: true, name: true, group: true, displayConfig: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  } catch (error) {
    console.error("Erro ao buscar produtos:", error);
    return [];
  }
}

export async function updateManyProductsVisibility(
  ids: string[],
  isVisibleOnSite: boolean
) {
  try {
    await Promise.all(
      ids.map((id) =>
        (prisma.dynamicProduct as unknown as {
          update: (args: {
            where: { id: string };
            data: Record<string, unknown>;
          }) => Promise<unknown>;
        }).update({
          where: { id },
          data: {
            isVisibleOnSite,
          },
        })
      )
    );

    revalidatePath('/admin/dynamic/produtos');
    return { success: true };
  } catch (err) {
    console.error("Erro ao atualizar visibilidade em massa:", err);
    return { error: "Falha ao atualizar a visibilidade em massa." };
  }
}

/**
 * EXCLUIR PRODUTO (Individual)
 */
export async function deleteDynamicProduct(id: string) {
  try {
    await prisma.dynamicProduct.delete({ where: { id } });
    revalidatePath('/admin/dynamic/produtos');
    return { success: true };
  } catch (err) {
    console.error("Erro ao excluir:", err);
    return { error: "Erro ao excluir produto." };
  }
}

/**
 * EXCLUIR MÃšLTIPLOS PRODUTOS (Bulk Delete)
 */
export async function deleteManyProducts(ids: string[]) {
  try {
    await prisma.dynamicProduct.deleteMany({
      where: { id: { in: ids } }
    });
    revalidatePath('/admin/dynamic/produtos');
    return { success: true };
  } catch (err) {
    console.error("Erro ao excluir em massa:", err);
    return { error: "Erro ao excluir produtos selecionados." };
  }
}

/**
 * BUSCAR CATEGORIAS
 */
export async function getHomeCategories() {
  try {
    return await prisma.dynamicCategory.findMany({
      orderBy: { name: 'asc' }
    });
  } catch (err) {
    console.error("Erro ao buscar categorias:", err);
    return [];
  }
}


