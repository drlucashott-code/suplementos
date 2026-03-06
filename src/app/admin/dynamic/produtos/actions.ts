'use server';

import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client'; 
import { revalidatePath } from 'next/cache';

/**
 * TIPAGEM CORRIGIDA
 * Adicionado 'boolean' e 'null' para total compatibilidade com Prisma.JsonValue
 */
export type DynamicAttributes = {
  [key: string]: string | number | boolean | null | undefined;
};

// Interface para o retorno da busca Amazon
export interface AmazonImportResult {
  name: string;
  totalPrice: number;
  imageUrl: string;
  url: string;
  brand?: string;
  error?: string;
}

/**
 * 🚀 BUSCAR PRODUTO POR ID
 * Adicionado para resolver o erro: "Export getProductById doesn't exist"
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
    return {
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
 */
export async function importBulkProducts(data: { asins: string; categoryId: string }) {
  const asinList = data.asins.split(',').map(a => a.trim()).filter(a => a !== '');
  const results = [];

  for (const asin of asinList) {
    try {
      const scraped = await fetchAmazonProductData(asin);
      
      if ('error' in scraped) throw new Error(scraped.error);

      await prisma.dynamicProduct.create({
        data: {
          name: scraped.name,
          imageUrl: scraped.imageUrl,
          url: scraped.url,
          totalPrice: scraped.totalPrice || 0, 
          categoryId: data.categoryId,
          attributes: {
            marca: scraped.brand || "Não Informada",
            asin: asin,
          } as Prisma.InputJsonValue,
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
export async function updateDynamicProduct(id: string, data: {
  name?: string;
  totalPrice?: number;
  imageUrl?: string;
  url?: string;
  attributes?: DynamicAttributes;
}) {
  try {
    const current = await prisma.dynamicProduct.findUnique({ where: { id } });
    const currentAttrs = (current?.attributes as Record<string, Prisma.JsonValue>) || {};

    await prisma.dynamicProduct.update({
      where: { id },
      data: {
        name: data.name,
        totalPrice: data.totalPrice,
        imageUrl: data.imageUrl,
        url: data.url,
        attributes: data.attributes 
          ? { ...currentAttrs, ...data.attributes } as Prisma.InputJsonValue
          : undefined
      }
    });

    revalidatePath('/admin/dynamic/produtos');
    return { success: true };
  } catch (err) {
    console.error("Erro ao atualizar produto:", err);
    return { error: "Falha ao salvar alterações." };
  }
}

/**
 * CRIAR PRODUTO (Individual via Formulário)
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
    const asinMatch = data.url.match(/\/dp\/([A-Z0-9]{10})/);
    const extractedAsin = asinMatch ? asinMatch[1] : undefined;

    await prisma.dynamicProduct.create({ 
      data: {
        name: data.name,
        totalPrice: data.totalPrice,
        url: data.url,
        imageUrl: data.imageUrl,
        categoryId: data.categoryId,
        attributes: {
          ...data.attributes,
          asin: data.attributes?.asin || extractedAsin 
        } as Prisma.InputJsonValue
      } 
    });
    
    revalidatePath('/admin/dynamic/produtos');
    return { success: true };
  } catch (err) {
    console.error("Erro ao salvar produto:", err);
    return { error: "Erro ao salvar produto." };
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
 * EXCLUIR MÚLTIPLOS PRODUTOS (Bulk Delete)
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