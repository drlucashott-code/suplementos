'use server';

import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client'; // 🚀 Importado para tipagem JSON oficial
import { revalidatePath } from 'next/cache';

// Interface para garantir a tipagem dos atributos dinâmicos no lado do cliente
export interface DynamicAttributes {
  [key: string]: string | number;
}

/**
 * BUSCAR PRODUTO POR ID
 */
export async function getProductById(id: string) {
  // ✅ Prisma Client usa inicial minúscula: dynamicProduct
  return await prisma.dynamicProduct.findUnique({
    where: { id },
    include: { category: true }
  });
}

/**
 * ATUALIZAR PRODUTO DINÂMICO
 */
export async function updateDynamicProduct(id: string, data: {
  name: string;
  totalPrice: number;
  imageUrl: string;
  url: string;
  attributes: DynamicAttributes;
}) {
  try {
    // ✅ Prisma Client usa inicial minúscula: dynamicProduct
    await prisma.dynamicProduct.update({
      where: { id },
      data: {
        name: data.name,
        totalPrice: data.totalPrice,
        imageUrl: data.imageUrl,
        url: data.url,
        // 🚀 CORREÇÃO ESLint: Usando InputJsonValue em vez de 'any'
        attributes: data.attributes as Prisma.InputJsonValue
      }
    });

    // ✅ Caminhos de revalidação atualizados para a nova estrutura /dynamic/
    revalidatePath('/admin/dynamic/produtos');
    revalidatePath('/[category]/[slug]', 'page'); 
    
    return { success: true };
  } catch (err) {
    // ✅ 'err' utilizado no log para evitar erro de variável não utilizada
    console.error("Erro ao atualizar produto:", err);
    return { error: "Erro ao atualizar produto no banco de dados." };
  }
}