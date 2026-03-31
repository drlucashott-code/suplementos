'use server';

import { enrichDynamicAttributesForCategory } from '@/lib/dynamicCategoryMetrics';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { revalidatePath } from 'next/cache';

export interface DynamicAttributes {
  [key: string]: string | number | boolean | null;
}

export interface AmazonImportResult {
  asin: string;
  name: string;
  totalPrice: number;
  imageUrl: string;
  url: string;
  error?: string;
}

export async function getHomeCategories() {
  return await prisma.dynamicCategory.findMany({
    orderBy: { name: 'asc' },
  });
}

export async function fetchAmazonProductData(
  asin: string
): Promise<AmazonImportResult | { error: string }> {
  try {
    return {
      asin,
      name: `Produto Amazon ${asin}`,
      totalPrice: 0,
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
          totalPrice: 0,
          categoryId: data.categoryId,
          attributes: enrichDynamicAttributesForCategory({
            category,
            rawDisplayConfig: category.displayConfig,
            productName: scraped.name,
            totalPrice: 0,
            attributes: { asin },
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

export async function createDynamicProduct(data: {
  asin: string;
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

    const existing = await prisma.dynamicProduct.findUnique({
      where: { asin: data.asin },
    });

    if (existing) {
      return { error: 'Este ASIN já está cadastrado.' };
    }

    await prisma.dynamicProduct.create({
      data: {
        asin: data.asin,
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
          attributes: data.attributes,
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
  return await prisma.dynamicProduct.findMany({
    include: { category: true },
    orderBy: { createdAt: 'desc' },
  });
}

export async function deleteDynamicProduct(id: string) {
  try {
    await prisma.dynamicProduct.delete({ where: { id } });
    revalidatePath('/admin/dynamic/produtos');
    return { success: true };
  } catch (err) {
    console.error('Erro ao deletar produto:', err);
    return { error: 'Erro ao deletar produto.' };
  }
}
