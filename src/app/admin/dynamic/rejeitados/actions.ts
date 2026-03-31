'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { enrichDynamicAttributesForCategory } from '@/lib/dynamicCategoryMetrics';
import { getDynamicVisibilityBoolean } from '@/lib/dynamicVisibility';
import { prisma } from '@/lib/prisma';

function getSafeRedirectTo(value: FormDataEntryValue | null) {
  const raw = typeof value === 'string' ? value.trim() : '';
  if (!raw.startsWith('/admin/dynamic/rejeitados')) {
    return '/admin/dynamic/rejeitados';
  }
  return raw;
}

function appendNoticeToRedirect(redirectTo: string, notice: string) {
  const url = new URL(redirectTo, 'https://local.invalid');
  url.searchParams.set('notice', notice);
  return `${url.pathname}${url.search}`;
}

export async function releaseRejectedSoftDecision(formData: FormData) {
  const decisionId = typeof formData.get('decisionId') === 'string'
    ? String(formData.get('decisionId')).trim()
    : '';
  const redirectTo = getSafeRedirectTo(formData.get('redirectTo'));

  if (!decisionId) {
    redirect(redirectTo);
  }

  await prisma.dynamicCategoryAsinDecision.deleteMany({
    where: {
      id: decisionId,
    },
  });

  revalidatePath('/admin/dynamic/rejeitados');
  redirect(redirectTo);
}

export async function releaseRejectedSoftDecisions(formData: FormData) {
  const redirectTo = getSafeRedirectTo(formData.get('redirectTo'));
  const categoryId =
    typeof formData.get('categoryId') === 'string'
      ? String(formData.get('categoryId')).trim()
      : '';

  await prisma.dynamicCategoryAsinDecision.deleteMany({
    where: {
      status: 'rejected_soft',
      ...(categoryId ? { categoryId } : {}),
    },
  });

  revalidatePath('/admin/dynamic/rejeitados');
  redirect(redirectTo);
}

export async function insertRejectedDecisionIntoCatalog(formData: FormData) {
  const decisionId = typeof formData.get('decisionId') === 'string'
    ? String(formData.get('decisionId')).trim()
    : '';
  const targetCategoryId = typeof formData.get('targetCategoryId') === 'string'
    ? String(formData.get('targetCategoryId')).trim()
    : '';
  const redirectTo = getSafeRedirectTo(formData.get('redirectTo'));

  if (!decisionId || !targetCategoryId) {
    redirect(appendNoticeToRedirect(redirectTo, 'Selecione uma categoria válida.'));
  }

  const decision = await prisma.dynamicCategoryAsinDecision.findUnique({
    where: { id: decisionId },
    include: {
      category: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (!decision) {
    redirect(appendNoticeToRedirect(redirectTo, 'Decisão rejeitada não encontrada.'));
  }

  const targetCategory = await prisma.dynamicCategory.findUnique({
    where: { id: targetCategoryId },
    select: { id: true, name: true, slug: true, displayConfig: true },
  });

  if (!targetCategory) {
    redirect(appendNoticeToRedirect(redirectTo, 'Categoria destino não encontrada.'));
  }

  const existingProduct = await prisma.dynamicProduct.findUnique({
    where: { asin: decision.asin },
    select: {
      id: true,
      category: {
        select: {
          name: true,
        },
      },
    },
  });

  if (existingProduct) {
    redirect(
      appendNoticeToRedirect(
        redirectTo,
        `O ASIN ${decision.asin} já está no banco em ${existingProduct.category.name}.`
      )
    );
  }

  const productName = decision.title?.trim() || `Produto Amazon ${decision.asin}`;
  const totalPrice = typeof decision.observedPrice === 'number' ? decision.observedPrice : 0;
  const visibilityStatus = 'pending' as const;

  const attributes = enrichDynamicAttributesForCategory({
    category: targetCategory,
    rawDisplayConfig: targetCategory.displayConfig,
    productName,
    totalPrice,
    attributes: {
      asin: decision.asin,
      brand: decision.brand || '',
      marca: decision.brand || '',
    },
  });

  const createdProduct = await prisma.dynamicProduct.create({
    data: {
      asin: decision.asin,
      name: productName,
      totalPrice,
      url: `https://www.amazon.com.br/dp/${decision.asin}`,
      imageUrl: decision.imageUrl || '',
      categoryId: targetCategory.id,
      visibilityStatus,
      isVisibleOnSite: getDynamicVisibilityBoolean(visibilityStatus),
      attributes,
    },
  });

  if (decision.categoryId !== targetCategory.id) {
    await prisma.dynamicCategoryAsinDecision.delete({
      where: { id: decision.id },
    });

    await prisma.dynamicCategoryAsinDecision.upsert({
      where: {
        categoryId_asin: {
          categoryId: targetCategory.id,
          asin: decision.asin,
        },
      },
      update: {
        status: 'imported',
        productId: createdProduct.id,
        title: productName,
        brand: decision.brand,
        imageUrl: decision.imageUrl,
        observedPrice: decision.observedPrice,
        reviewedAt: new Date(),
      },
      create: {
        categoryId: targetCategory.id,
        asin: decision.asin,
        status: 'imported',
        productId: createdProduct.id,
        title: productName,
        brand: decision.brand,
        imageUrl: decision.imageUrl,
        observedPrice: decision.observedPrice,
        reviewedAt: new Date(),
      },
    });
  } else {
    await prisma.dynamicCategoryAsinDecision.update({
      where: { id: decision.id },
      data: {
        status: 'imported',
        productId: createdProduct.id,
        reviewedAt: new Date(),
      },
    });
  }

  revalidatePath('/admin/dynamic/rejeitados');
  revalidatePath('/admin/dynamic/produtos');
  redirect(
    appendNoticeToRedirect(
      redirectTo,
      `${decision.asin} inserido no banco como pendente em ${targetCategory.name}.`
    )
  );
}
