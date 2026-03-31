'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';

function getSafeRedirectTo(value: FormDataEntryValue | null) {
  const raw = typeof value === 'string' ? value.trim() : '';
  if (!raw.startsWith('/admin/dynamic/rejeitados')) {
    return '/admin/dynamic/rejeitados';
  }
  return raw;
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
      status: 'rejected_soft',
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
