'use server';

import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { revalidatePath } from 'next/cache';

// Tipagem para os atributos dinÃ¢micos
export interface DynamicAttributes {
  [key: string]: string | number | boolean | null;
}

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
      const totalMl = unit === "l" ? units * amount * 1000 : units * amount;
      return Math.round(totalMl);
    }
  }

  const singleMatch = normalizedTitle.match(/(\d+(?:\.\d+)?)\s*(ml|l)\b/);
  if (!singleMatch) return null;

  const amount = Number(singleMatch[1]);
  if (Number.isNaN(amount)) return null;

  return Math.round(singleMatch[2] === "l" ? amount * 1000 : amount);
}

function isHairVolumeCategory(category: { name?: string | null; slug?: string | null }) {
  const normalizedName = category.name?.toLowerCase() ?? "";
  const normalizedSlug = category.slug?.toLowerCase() ?? "";

  return (
    normalizedName.includes("condicionador") ||
    normalizedSlug.includes("condicionador") ||
    normalizedName.includes("shampoo") ||
    normalizedSlug.includes("shampoo")
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

// Tipagem para o retorno da importaÃ§Ã£o Amazon
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
    // Aqui entra sua lÃ³gica de scraper ou API
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
 * IMPORTAÃ‡ÃƒO EM MASSA (Bulk Import)
 * ðŸš€ CORREÃ‡ÃƒO: Agora salva o ASIN na coluna fixa e evita duplicatas
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
      // 1. Verificar se o ASIN jÃ¡ existe no banco (PrevenÃ§Ã£o de Erro P2002)
      const alreadyExists = await prisma.dynamicProduct.findUnique({
        where: { asin: asin }
      });

      if (alreadyExists) {
        results.push({ asin, status: 'skipped', message: 'JÃ¡ cadastrado' });
        continue; // Pula para o prÃ³ximo sem tentar criar
      }

      // 2. Busca os dados na Amazon
      const scraped = await fetchAmazonProductData(asin);
      if ('error' in scraped) throw new Error(scraped.error);

      // 3. Cria o registro incluindo a nova coluna obrigatÃ³ria 'asin'
      await prisma.dynamicProduct.create({
        data: {
          asin: asin, // âœ… Salva na coluna fixa Ãºnica
          name: scraped.name,
          imageUrl: scraped.imageUrl,
          url: scraped.url,
          totalPrice: 0, 
          categoryId: data.categoryId,
          attributes: enrichAttributesForCategory({
            category,
            productName: scraped.name,
            attributes: { asin: asin },
          }) as Prisma.InputJsonValue, // Mantém no JSON também para retrocompatibilidade
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
 * ðŸš€ CORREÃ‡ÃƒO: IncluÃ­do campo 'asin' obrigatÃ³rio
 */
export async function createDynamicProduct(data: {
  asin: string; // âœ… Agora faz parte da interface obrigatÃ³ria
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

    // Verifica duplicidade antes de criar individualmente
    const check = await prisma.dynamicProduct.findUnique({ where: { asin: data.asin } });
    if (check) return { error: "Este ASIN jÃ¡ estÃ¡ cadastrado." };

    await prisma.dynamicProduct.create({ 
      data: {
        asin: data.asin, // âœ… ObrigatÃ³rio para o banco
        name: data.name,
        totalPrice: data.totalPrice,
        url: data.url,
        imageUrl: data.imageUrl,
        categoryId: data.categoryId,
        attributes: enrichAttributesForCategory({
          category,
          productName: data.name,
          attributes: data.attributes,
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
