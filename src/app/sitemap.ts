import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { buildAbsoluteUrl } from "@/lib/siteUrl";

const STATIC_ROUTES = ["/", "/ofertas", "/top10", "/listas", "/salvos"] as const;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [categories, publicLists] = await Promise.all([
    prisma.dynamicCategory.findMany({
      select: {
        group: true,
        slug: true,
        updatedAt: true,
      },
    }),
    prisma.siteUserList.findMany({
      where: {
        isPublic: true,
        user: {
          username: {
            not: null,
          },
        },
      },
      select: {
        slug: true,
        updatedAt: true,
        user: {
          select: {
            username: true,
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
      take: 5000,
    }),
  ]);

  const entries: MetadataRoute.Sitemap = [
    ...STATIC_ROUTES.map((path) => ({
      url: buildAbsoluteUrl(path),
      lastModified: new Date(),
      changeFrequency: (path === "/" ? "daily" : "hourly") as
        | "daily"
        | "hourly",
      priority: path === "/" ? 1 : 0.8,
    })),
    ...categories.flatMap((category) => [
      {
        url: buildAbsoluteUrl(`/${category.group}`),
        lastModified: category.updatedAt,
        changeFrequency: "daily" as const,
        priority: 0.75,
      },
      {
        url: buildAbsoluteUrl(`/${category.group}/${category.slug}`),
        lastModified: category.updatedAt,
        changeFrequency: "hourly" as const,
        priority: 0.9,
      },
    ]),
    ...publicLists
      .filter((list) => Boolean(list.user.username))
      .map((list) => ({
        url: buildAbsoluteUrl(`/user/${list.user.username}/${list.slug}`),
        lastModified: list.updatedAt,
        changeFrequency: "daily" as const,
        priority: 0.7,
      })),
  ];

  const deduped = new Map<string, MetadataRoute.Sitemap[number]>();

  for (const entry of entries) {
    const current = deduped.get(entry.url);
    if (!current) {
      deduped.set(entry.url, entry);
      continue;
    }

    if (
      entry.lastModified &&
      (!current.lastModified || entry.lastModified > current.lastModified)
    ) {
      deduped.set(entry.url, entry);
    }
  }

  return Array.from(deduped.values());
}
