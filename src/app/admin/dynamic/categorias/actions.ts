'use server';

import { prisma } from '@/lib/prisma';

export async function getNavGroups() {
  const categories = await prisma.dynamicCategory.findMany({
    orderBy: [
      { group: 'asc' },
      { name: 'asc' }
    ],
    select: {
      id: true,
      name: true,
      slug: true,
      group: true
    }
  });

  // Agrupa as categorias por nicho (Group)
  const groups = categories.reduce((acc, cat) => {
    if (!acc[cat.group]) acc[cat.group] = [];
    acc[cat.group].push(cat);
    return acc;
  }, {} as Record<string, typeof categories>);

  return groups;
}