'use server';

import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client'; // 🚀 Para tipagem JSON oficial
import { revalidatePath } from 'next/cache';

// Tipagem para os campos de configuração dinâmicos
export type ConfigField = {
  key: string;
  label: string;
  type: string;
};

/**
 * CRIA UMA NOVA CATEGORIA DINÂMICA
 */
export async function createDynamicCategory(data: {
  name: string;
  slug: string;
  group: string; // 🚀 NOVO CAMPO
  displayConfig: ConfigField[];
}) {
  try {
    // 🚀 CORREÇÃO: Verificação de duplicidade baseada no par [Grupo, Slug]
    const existingCategory = await prisma.dynamicCategory.findFirst({
      where: { 
        group: data.group,
        slug: data.slug 
      },
    });

    if (existingCategory) {
      return { error: `Já existe a categoria "${data.slug}" no grupo "${data.group}".` };
    }

    await prisma.dynamicCategory.create({
      data: {
        name: data.name,
        slug: data.slug,
        group: data.group.toLowerCase(), // Normaliza para minúsculo
        displayConfig: data.displayConfig as Prisma.InputJsonValue, 
      },
    });

    revalidatePath('/admin/dynamic/categorias');
    return { success: true };

  } catch (error) {
    console.error("Erro ao criar categoria:", error);
    return { error: 'Ocorreu um erro ao salvar a categoria no banco de dados.' };
  }
}

/**
 * ATUALIZA UMA CATEGORIA EXISTENTE
 */
export async function updateDynamicCategory(id: string, data: {
  name: string;
  slug: string;
  group: string; // 🚀 NOVO CAMPO
  displayConfig: ConfigField[];
}) {
  try {
    // 🚀 CORREÇÃO: Verifica se o novo par [Grupo, Slug] já pertence a outra categoria
    const existingCategory = await prisma.dynamicCategory.findFirst({
      where: { 
        group: data.group,
        slug: data.slug,
        NOT: { id: id }
      },
    });

    if (existingCategory) {
      return { error: 'Este slug já está sendo usado por outra categoria neste grupo.' };
    }

    await prisma.dynamicCategory.update({
      where: { id },
      data: {
        name: data.name,
        slug: data.slug,
        group: data.group.toLowerCase(),
        displayConfig: data.displayConfig as Prisma.InputJsonValue,
      },
    });

    revalidatePath('/admin/dynamic/categorias');
    return { success: true };

  } catch (error) {
    console.error("Erro ao atualizar categoria:", error);
    return { error: 'Ocorreu um erro ao atualizar a categoria.' };
  }
}

/**
 * BUSCA TODAS AS CATEGORIAS
 */
export async function getHomeCategories() {
  try {
    return await prisma.dynamicCategory.findMany({
      orderBy: [
        { group: 'asc' }, // Agrupa por nicho primeiro
        { name: 'asc' }
      ],
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
 * BUSCA UMA ÚNICA CATEGORIA PELO ID
 */
export async function getDynamicCategoryById(id: string) {
  try {
    return await prisma.dynamicCategory.findUnique({
      where: { id }
    });
  } catch (error) {
    console.error("Erro ao buscar categoria por ID:", error);
    return null;
  }
}

/**
 * EXCLUI UMA CATEGORIA
 */
export async function deleteDynamicCategory(id: string) {
  try {
    await prisma.dynamicCategory.delete({
      where: { id }
    });
    
    revalidatePath('/admin/dynamic/categorias');
    return { success: true };
  } catch (error) {
    console.error("Erro ao excluir categoria:", error);
    return { error: "Não foi possível excluir. Verifique se existem produtos vinculados." };
  }
}