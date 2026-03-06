'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export type ConfigField = {
  key: string;
  label: string;
  type: string;
};

export async function createHomeCategory(data: { name: string; slug: string; displayConfig: ConfigField[]; }) {
  try {
    const existingCategory = await prisma.homeCategory.findUnique({ where: { slug: data.slug } });
    if (existingCategory) return { error: 'Já existe uma categoria com esta URL (slug).' };

    await prisma.homeCategory.create({
      data: { name: data.name, slug: data.slug, displayConfig: data.displayConfig as any },
    });

    revalidatePath('/admin/casa/categorias');
    return { success: true };
  } catch (error) {
    return { error: 'Ocorreu um erro ao salvar a categoria no banco de dados.' };
  }
}

// 🚀 NOVA FUNÇÃO: Atualiza a categoria existente
export async function updateHomeCategory(id: string, data: { name: string; slug: string; displayConfig: ConfigField[]; }) {
  try {
    const existingCategory = await prisma.homeCategory.findUnique({ where: { slug: data.slug } });
    if (existingCategory && existingCategory.id !== id) {
      return { error: 'Já existe outra categoria usando esta URL (slug).' };
    }

    await prisma.homeCategory.update({
      where: { id },
      data: { name: data.name, slug: data.slug, displayConfig: data.displayConfig as any },
    });

    revalidatePath('/admin/casa/categorias');
    return { success: true };
  } catch (error) {
    return { error: 'Ocorreu um erro ao atualizar a categoria.' };
  }
}

export async function getHomeCategories() {
  try {
    return await prisma.homeCategory.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { products: true } } }
    });
  } catch (error) {
    return [];
  }
}

// 🚀 NOVA FUNÇÃO: Busca apenas uma categoria para preencher o form
export async function getHomeCategoryById(id: string) {
  try {
    return await prisma.homeCategory.findUnique({ where: { id } });
  } catch (error) {
    return null;
  }
}

export async function deleteHomeCategory(id: string) {
  try {
    await prisma.homeCategory.delete({ where: { id } });
    revalidatePath('/admin/casa/categorias');
    return { success: true };
  } catch (error) {
    return { error: "Não foi possível excluir. Verifique se existem produtos vinculados." };
  }
}