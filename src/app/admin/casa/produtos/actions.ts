'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

// Interface para garantir a tipagem dos atributos dinâmicos
export interface DynamicAttributes {
  [key: string]: string | number;
}

export async function getProductById(id: string) {
  return await prisma.homeProduct.findUnique({
    where: { id },
    include: { category: true }
  });
}

export async function updateHomeProduct(id: string, data: {
  name: string;
  totalPrice: number;
  imageUrl: string;
  url: string;
  attributes: DynamicAttributes;
}) {
  try {
    await prisma.homeProduct.update({
      where: { id },
      data
    });
    revalidatePath('/admin/casa/produtos');
    revalidatePath('/casa/[slug]', 'page');
    return { success: true };
  } catch (err) {
    // Usando a variável 'err' no log para satisfazer o ESLint
    console.error("Erro ao atualizar produto:", err);
    return { error: "Erro ao atualizar produto." };
  }
}