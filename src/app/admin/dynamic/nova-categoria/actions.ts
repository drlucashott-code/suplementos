"use server";

import type {
  DynamicCategoryMetricSettings,
  PrimaryMetricPresetId,
} from "@/lib/dynamicCategoryMetrics";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

export type FieldVisibility = "internal" | "public_table" | "public_highlight";
export type FieldType = "text" | "number" | "currency";
export type SortOptionValue =
  | "best_value"
  | "price_asc"
  | "discount"
  | "dose_price_asc"
  | "protein_pct_desc";

export type ConfigField = {
  key: string;
  label: string;
  type: FieldType;
  visibility: FieldVisibility;
  filterable?: boolean;
  prefix?: string;
  suffix?: string;
  hideLabel?: boolean;
};

export type CategorySettings = DynamicCategoryMetricSettings & {
  analysisTitleTemplate?: string;
  enabledSorts?: SortOptionValue[];
  defaultSort?: SortOptionValue;
  bestValueAttributeKey?: string;
  dosePriceAttributeKey?: string;
  hideFromHome?: boolean;
  customSorts?: Array<{
    value: string;
    label: string;
    attributeKey: string;
    direction: "asc" | "desc";
  }>;
};

export type { PrimaryMetricPresetId };

export type DisplayConfigPayload = {
  fields: ConfigField[];
  settings?: CategorySettings;
};

function sanitizePayload(data: {
  name: string;
  slug: string;
  group: string;
  groupName: string;
  imageUrl?: string;
  displayConfig: DisplayConfigPayload;
}) {
  return {
    name: data.name.trim(),
    slug: data.slug.trim(),
    group: data.group.trim().toLowerCase(),
    groupName: data.groupName.trim(),
    imageUrl: data.imageUrl?.trim() || null,
    displayConfig: data.displayConfig as Prisma.InputJsonValue,
  };
}

export async function createDynamicCategory(data: {
  name: string;
  slug: string;
  group: string;
  groupName: string;
  imageUrl?: string;
  displayConfig: DisplayConfigPayload;
}) {
  try {
    const payload = sanitizePayload(data);

    const existingCategory = await prisma.dynamicCategory.findFirst({
      where: {
        group: payload.group,
        slug: payload.slug,
      },
    });

    if (existingCategory) {
      return {
        error: `Ja existe a categoria "${payload.slug}" no grupo "${payload.group}".`,
      };
    }

    await prisma.dynamicCategory.create({
      data: payload,
    });

    revalidatePath("/admin/dynamic/categorias");
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Erro ao criar categoria:", error);
    return { error: "Ocorreu um erro ao salvar a categoria no banco de dados." };
  }
}

export async function updateDynamicCategory(
  id: string,
  data: {
    name: string;
    slug: string;
    group: string;
    groupName: string;
    imageUrl?: string;
    displayConfig: DisplayConfigPayload;
  }
) {
  try {
    const payload = sanitizePayload(data);

    const existingCategory = await prisma.dynamicCategory.findFirst({
      where: {
        group: payload.group,
        slug: payload.slug,
        NOT: { id },
      },
    });

    if (existingCategory) {
      return {
        error: "Este slug ja esta sendo usado por outra categoria neste grupo.",
      };
    }

    await prisma.dynamicCategory.update({
      where: { id },
      data: payload,
    });

    revalidatePath("/admin/dynamic/categorias");
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Erro ao atualizar categoria:", error);
    return { error: "Ocorreu um erro ao atualizar a categoria." };
  }
}

export async function getHomeCategories() {
  try {
    return await prisma.dynamicCategory.findMany({
      orderBy: [{ group: "asc" }, { name: "asc" }],
      include: {
        _count: {
          select: { products: true },
        },
      },
    });
  } catch (error) {
    console.error("Erro ao buscar categorias:", error);
    return [];
  }
}

export async function getDynamicCategoryById(id: string) {
  try {
    return await prisma.dynamicCategory.findUnique({
      where: { id },
    });
  } catch (error) {
    console.error("Erro ao buscar categoria por ID:", error);
    return null;
  }
}

export async function deleteDynamicCategory(id: string) {
  try {
    await prisma.dynamicCategory.delete({
      where: { id },
    });

    revalidatePath("/admin/dynamic/categorias");
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Erro ao excluir categoria:", error);
    return {
      error: "Nao foi possivel excluir. Verifique se existem produtos vinculados.",
    };
  }
}
