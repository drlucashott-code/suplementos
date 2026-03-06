'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

// Tipagem para os campos de configuração dinâmicos (evita o erro de 'any')
export type ConfigField = {
  key: string;
  label: string;
  type: string;
};

/**
 * CRIA UMA NOVA CATEGORIA
 */
export async function createHomeCategory(data: {
  name: string;
  slug: string;
  displayConfig: ConfigField[];
}) {
  try {
    const existingCategory = await prisma.homeCategory.findUnique({
      where: { slug: data.slug },
    });

    if (existingCategory) {
      return { error: 'Já existe uma categoria com esta URL (slug).' };
    }

    await prisma.homeCategory.create({
      data: {
        name: data.name,
        slug: data.slug,
        displayConfig: data.displayConfig,
      },
    });

    revalidatePath('/admin/casa/categorias');
    return { success: true };

  } catch (error) {
    console.error("Erro ao criar categoria:", error);
    return { error: 'Ocorreu um erro ao salvar a categoria no banco de dados.' };
  }
}

/**
 * BUSCA TODAS AS CATEGORIAS (Para a tabela de gerenciamento)
 */
export async function getHomeCategories() {
  try {
    return await prisma.homeCategory.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { products: true }
        }
      }
    });
  } catch (error) {
    console.error("Erro ao buscar categorias:", error);
    return [];
  }
}

/**
 * EXCLUI UMA CATEGORIA
 */
export async function deleteHomeCategory(id: string) {
  try {
    await prisma.homeCategory.delete({
      where: { id }
    });
    
    revalidatePath('/admin/casa/categorias');
    return { success: true };
  } catch (error) {
    console.error("Erro ao excluir categoria:", error);
    return { error: "Não foi possível excluir. Verifique se existem produtos vinculados a esta categoria." };
  }
}