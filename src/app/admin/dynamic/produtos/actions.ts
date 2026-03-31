'use server';

import { enrichDynamicAttributesForCategory } from '@/lib/dynamicCategoryMetrics';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { revalidatePath } from 'next/cache';

export type DynamicAttributes = {
  [key: string]: string | number | boolean | null | undefined;
};

export interface AmazonImportResult {
  asin: string;
  name: string;
  totalPrice: number;
  imageUrl: string;
  url: string;
  brand?: string;
  error?: string;
}

export async function getProductById(id: string) {
  try {
    return await prisma.dynamicProduct.findUnique({
      where: { id },
      include: {
        category: true,
      },
    });
  } catch (error) {
    console.error('Erro ao buscar produto por ID:', error);
    return null;
  }
}

export async function fetchAmazonProductData(
  asin: string
): Promise<AmazonImportResult | { error: string }> {
  try {
    return {
      asin,
      name: `Produto Amazon ${asin}`,
      totalPrice: 63.99,
      brand: 'Marca Amazon',
      imageUrl: `https://m.media-amazon.com/images/I/${asin}.jpg`,
      url: `https://www.amazon.com.br/dp/${asin}?tag=lucas-picks-20`,
    };
  } catch (err) {
    console.error('Erro ao buscar dados da Amazon:', err);
    return { error: 'Erro ao buscar ASIN.' };
  }
}

export async function importBulkProducts(data: {
  asins: string;
  categoryId: string;
}) {
  const asinList = data.asins
    .split(',')
    .map((asin) => asin.trim())
    .filter(Boolean);
  const results: Array<{ asin: string; status: string; message?: string }> = [];

  const category = await prisma.dynamicCategory.findUnique({
    where: { id: data.categoryId },
    select: { id: true, name: true, slug: true, displayConfig: true },
  });

  if (!category) {
    return { error: 'Categoria não encontrada.' };
  }

  for (const asin of asinList) {
    try {
      const alreadyExists = await prisma.dynamicProduct.findUnique({
        where: { asin },
      });

      if (alreadyExists) {
        results.push({ asin, status: 'skipped', message: 'Já cadastrado' });
        continue;
      }

      const scraped = await fetchAmazonProductData(asin);
      if ('error' in scraped) {
        throw new Error(scraped.error);
      }

      await prisma.dynamicProduct.create({
        data: {
          asin,
          name: scraped.name,
          imageUrl: scraped.imageUrl,
          url: scraped.url,
          totalPrice: scraped.totalPrice || 0,
          categoryId: data.categoryId,
          attributes: enrichDynamicAttributesForCategory({
            category,
            rawDisplayConfig: category.displayConfig,
            productName: scraped.name,
            totalPrice: scraped.totalPrice || 0,
            attributes: {
              marca: scraped.brand || 'Não Informada',
              asin,
            },
          }) as Prisma.InputJsonValue,
        },
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

export async function updateManyProducts(
  ids: string[],
  key: string,
  value: string | number
) {
  try {
    await Promise.all(
      ids.map(async (id) => {
        const product = await prisma.dynamicProduct.findUnique({
          where: { id },
          select: { attributes: true },
        });
        const currentAttributes =
          (product?.attributes as Record<string, Prisma.JsonValue>) || {};

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
    console.error('Erro no Bulk Edit:', err);
    return { error: 'Falha ao atualizar em massa.' };
  }
}

export async function updateDynamicProduct(
  id: string,
  data: {
    name?: string;
    totalPrice?: number;
    imageUrl?: string;
    url?: string;
    isVisibleOnSite?: boolean;
    attributes?: DynamicAttributes;
  }
) {
  try {
    const current = await prisma.dynamicProduct.findUnique({
      where: { id },
      select: {
        category: {
          select: { id: true, name: true, slug: true, displayConfig: true },
        },
        attributes: true,
        name: true,
        totalPrice: true,
      },
    });

    const currentAttrs =
      (current?.attributes as Record<string, Prisma.JsonValue>) || {};
    const mergedAttributes = data.attributes
      ? ({
          ...currentAttrs,
          ...data.attributes,
        } as DynamicAttributes)
      : undefined;

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
        attributes:
          mergedAttributes && current?.category
            ? (enrichDynamicAttributesForCategory({
                category: current.category,
                rawDisplayConfig: current.category.displayConfig,
                productName: data.name ?? current.name,
                totalPrice: data.totalPrice ?? current.totalPrice,
                attributes: mergedAttributes,
              }) as Prisma.InputJsonValue)
            : undefined,
      },
    });

    revalidatePath('/admin/dynamic/produtos');
    return { success: true };
  } catch (err) {
    console.error('Erro ao atualizar produto:', err);
    return { error: 'Falha ao salvar alterações.' };
  }
}

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
      select: { id: true, name: true, slug: true, displayConfig: true },
    });

    if (!category) {
      return { error: 'Categoria não encontrada.' };
    }

    const asinMatch = data.url.match(/\/dp\/([A-Z0-9]{10})/);
    const extractedAsin = asinMatch ? asinMatch[1] : undefined;
    const finalAsin = (data.attributes?.asin as string) || extractedAsin;

    if (!finalAsin) {
      return { error: 'Não foi possível identificar o ASIN do produto.' };
    }

    const existing = await prisma.dynamicProduct.findUnique({
      where: { asin: finalAsin },
    });
    if (existing) {
      return { error: 'Este produto (ASIN) já está cadastrado.' };
    }

    await prisma.dynamicProduct.create({
      data: {
        asin: finalAsin,
        name: data.name,
        totalPrice: data.totalPrice,
        url: data.url,
        imageUrl: data.imageUrl,
        categoryId: data.categoryId,
        attributes: enrichDynamicAttributesForCategory({
          category,
          rawDisplayConfig: category.displayConfig,
          productName: data.name,
          totalPrice: data.totalPrice,
          attributes: {
            ...data.attributes,
            asin: finalAsin,
          },
        }) as Prisma.InputJsonValue,
      },
    });

    revalidatePath('/admin/dynamic/produtos');
    return { success: true };
  } catch (err) {
    console.error('Erro ao salvar produto:', err);
    return { error: 'Erro ao salvar produto no banco.' };
  }
}

export async function getDynamicProducts() {
  try {
    return await prisma.dynamicProduct.findMany({
      include: {
        category: {
          select: { id: true, name: true, group: true, displayConfig: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  } catch (error) {
    console.error('Erro ao buscar produtos:', error);
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
    console.error('Erro ao atualizar visibilidade em massa:', err);
    return { error: 'Falha ao atualizar a visibilidade em massa.' };
  }
}

export async function deleteDynamicProduct(id: string) {
  try {
    await prisma.dynamicProduct.delete({ where: { id } });
    revalidatePath('/admin/dynamic/produtos');
    return { success: true };
  } catch (err) {
    console.error('Erro ao excluir:', err);
    return { error: 'Erro ao excluir produto.' };
  }
}

export async function deleteManyProducts(ids: string[]) {
  try {
    await prisma.dynamicProduct.deleteMany({
      where: { id: { in: ids } },
    });
    revalidatePath('/admin/dynamic/produtos');
    return { success: true };
  } catch (err) {
    console.error('Erro ao excluir em massa:', err);
    return { error: 'Erro ao excluir produtos selecionados.' };
  }
}

export async function getHomeCategories() {
  try {
    return await prisma.dynamicCategory.findMany({
      orderBy: { name: 'asc' },
    });
  } catch (err) {
    console.error('Erro ao buscar categorias:', err);
    return [];
  }
}
