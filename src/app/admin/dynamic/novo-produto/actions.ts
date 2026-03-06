'use server';

import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { revalidatePath } from 'next/cache';

// Tipagem para os atributos dinâmicos
export interface DynamicAttributes {
  [key: string]: string | number | boolean | null;
}

// Tipagem para o retorno da importação Amazon
export interface AmazonImportResult {
  asin: string;
  name: string;
  totalPrice: number;
  imageUrl: string;
  url: string;
  error?: string;
}

/**
 * BUSCAR CATEGORIAS
 */
export async function getHomeCategories() {
  return await prisma.dynamicCategory.findMany({
    orderBy: { name: 'asc' }
  });
}

/**
 * BUSCAR DADOS DA AMAZON (Individual)
 */
export async function fetchAmazonProductData(asin: string): Promise<AmazonImportResult | { error: string }> {
  try {
    // Aqui entra sua lógica de scraper ou API
    return {
      asin: asin,
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
 * 🚀 CORREÇÃO: Agora salva o ASIN na coluna fixa e evita duplicatas
 */
export async function importBulkProducts(data: { asins: string; categoryId: string }) {
  const asinList = data.asins.split(',').map(a => a.trim()).filter(a => a !== '');
  const results = [];

  for (const asin of asinList) {
    try {
      // 1. Verificar se o ASIN já existe no banco (Prevenção de Erro P2002)
      const alreadyExists = await prisma.dynamicProduct.findUnique({
        where: { asin: asin }
      });

      if (alreadyExists) {
        results.push({ asin, status: 'skipped', message: 'Já cadastrado' });
        continue; // Pula para o próximo sem tentar criar
      }

      // 2. Busca os dados na Amazon
      const scraped = await fetchAmazonProductData(asin);
      if ('error' in scraped) throw new Error(scraped.error);

      // 3. Cria o registro incluindo a nova coluna obrigatória 'asin'
      await prisma.dynamicProduct.create({
        data: {
          asin: asin, // ✅ Salva na coluna fixa única
          name: scraped.name,
          imageUrl: scraped.imageUrl,
          url: scraped.url,
          totalPrice: 0, 
          categoryId: data.categoryId,
          attributes: { asin: asin }, // Mantém no JSON também para retrocompatibilidade
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
 * 🚀 CORREÇÃO: Incluído campo 'asin' obrigatório
 */
export async function createDynamicProduct(data: {
  asin: string; // ✅ Agora faz parte da interface obrigatória
  name: string;
  totalPrice: number;
  url: string;
  imageUrl: string;
  categoryId: string;
  attributes: DynamicAttributes;
}) {
  try {
    // Verifica duplicidade antes de criar individualmente
    const check = await prisma.dynamicProduct.findUnique({ where: { asin: data.asin } });
    if (check) return { error: "Este ASIN já está cadastrado." };

    await prisma.dynamicProduct.create({ 
      data: {
        asin: data.asin, // ✅ Obrigatório para o banco
        name: data.name,
        totalPrice: data.totalPrice,
        url: data.url,
        imageUrl: data.imageUrl,
        categoryId: data.categoryId,
        attributes: data.attributes as Prisma.InputJsonValue
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