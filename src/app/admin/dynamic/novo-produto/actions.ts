'use server';

import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client'; // 🚀 Importado para tipagem JSON oficial
import { revalidatePath } from 'next/cache';

// Tipagem para os atributos dinâmicos (ex: quantidade de rolos, lavagens, marca)
export interface DynamicAttributes {
  [key: string]: string | number;
}

// Tipagem para o retorno da importação Amazon
export interface AmazonImportResult {
  name: string;
  totalPrice: number;
  imageUrl: string;
  url: string;
  error?: string;
}

/**
 * BUSCAR CATEGORIAS
 * Usado no Select para vincular o produto à categoria correta
 */
export async function getHomeCategories() {
  return await prisma.dynamicCategory.findMany({
    orderBy: { name: 'asc' }
  });
}

/**
 * BUSCAR DADOS DA AMAZON (Individual)
 * Simula a busca de dados para preenchimento automático via ASIN
 */
export async function fetchAmazonProductData(asin: string): Promise<AmazonImportResult | { error: string }> {
  try {
    // Aqui entra sua lógica de scraper ou API que já roda no projeto
    return {
      name: `Produto Amazon ${asin}`, 
      totalPrice: 0.0,
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
 * Processa uma string de ASINs separados por vírgula
 */
export async function importBulkProducts(data: { asins: string; categoryId: string }) {
  const asinList = data.asins.split(',').map(a => a.trim()).filter(a => a !== '');
  const results = [];

  for (const asin of asinList) {
    try {
      // 1. Busca os dados (Nome e Imagem)
      const scraped = await fetchAmazonProductData(asin);
      
      if ('error' in scraped) throw new Error(scraped.error);

      // 2. Cria o registro no banco
      await prisma.dynamicProduct.create({
        data: {
          name: scraped.name,
          imageUrl: scraped.imageUrl,
          url: scraped.url,
          totalPrice: 0, 
          categoryId: data.categoryId,
          attributes: {}, // Objeto vazio é um InputJsonValue válido
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
 * CRIAR PRODUTO (Individual)
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
    await prisma.dynamicProduct.create({ 
      data: {
        ...data,
        // 🚀 CORREÇÃO: Usando Prisma.InputJsonValue em vez de 'any' para satisfazer o ESLint
        attributes: data.attributes as Prisma.InputJsonValue
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
 * LISTAR PRODUTOS (Para o Admin)
 */
export async function getDynamicProducts() {
  return await prisma.dynamicProduct.findMany({
    include: { category: true },
    orderBy: { createdAt: 'desc' }
  });
}

/**
 * EXCLUIR PRODUTO
 */
export async function deleteDynamicProduct(id: string) {
  try {
    await prisma.dynamicProduct.delete({ where: { id } });
    revalidatePath('/admin/dynamic/produtos');
    return { success: true };
  } catch (err) {
    console.error("Erro ao deletar produto:", err);
    return { error: "Erro ao deletar produto." };
  }
}