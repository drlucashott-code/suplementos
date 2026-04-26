import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export async function createUniqueListSlug(_userId: string, title: string) {
  const base = slugify(title) || "minha-lista";
  let slug = base;
  let suffix = 1;

  while (
    (
      await prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
        SELECT "id"
        FROM "SiteUserList"
        WHERE "slug" = ${slug}
        LIMIT 1
      `)
    )[0]
  ) {
    suffix += 1;
    slug = `${base}-${suffix}`;
  }

  return slug;
}

export function buildPublicUserPath(username: string) {
  return `/user/${username}`;
}

export function buildPublicListPath(username: string, slug: string) {
  return `/user/${username}/${slug}`;
}
