import { Prisma } from '@prisma/client';
import {
  buildPrimaryMetricFields,
  createPrimaryMetricDraftFromSettings,
  enrichDynamicAttributesForCategory,
  getPrimaryMetricManagedKeys,
  normalizeDynamicDisplayConfig,
  type DynamicDisplayField,
  type DynamicDisplayConfigPayloadLike,
} from '../src/lib/dynamicCategoryMetrics';
import { prisma } from '../src/lib/prisma';

type CategoryRow = {
  id: string;
  group: string;
  slug: string;
  name: string;
  displayConfig: Prisma.JsonValue;
};

function parseFlagValue(flag: string) {
  const arg = process.argv.find((entry) => entry.startsWith(`${flag}=`));
  return arg ? arg.slice(flag.length + 1) : '';
}

function insertOrReplaceField(params: {
  fields: DynamicDisplayField[];
  field: DynamicDisplayField;
  afterKey?: string;
}) {
  const withoutCurrent = params.fields.filter((item) => item.key !== params.field.key);

  if (!params.afterKey) {
    return [...withoutCurrent, params.field];
  }

  const nextFields: DynamicDisplayField[] = [];
  let inserted = false;

  for (const existing of withoutCurrent) {
    nextFields.push(existing);

    if (!inserted && existing.key === params.afterKey) {
      nextFields.push(params.field);
      inserted = true;
    }
  }

  if (!inserted) {
    nextFields.push(params.field);
  }

  return nextFields;
}

function getSuggestedSupplementFilterable(
  slug: string,
  field: DynamicDisplayField
) {
  const key = field.key;

  if (slug === 'whey') {
    if (key === 'sabor' || key === 'weightGrams') return true;
    if (key === 'proteinPerDoseInGrams' || key === 'proteinPercentage' || key === 'numberOfDoses' || key === 'doseInGrams') return false;
  }

  if (slug === 'barra') {
    if (key === 'sabor' || key === 'unitsPerBox' || key === 'weightGrams') return true;
    if (key === 'proteinPerDoseInGrams' || key === 'doseInGrams') return false;
  }

  if (slug === 'bebidaproteica') {
    if (key === 'sabor' || key === 'unitsPerPack' || key === 'volumePerUnitInMl') return true;
    if (key === 'proteinPerUnitInGrams') return false;
  }

  if (slug === 'creatina') {
    if (key === 'formLabel' || key === 'sabor' || key === 'weightGrams') return true;
    if (key === 'creatinaPorDose' || key === 'numberOfDoses' || key === 'unitsPerDose') return false;
  }

  if (slug === 'pre-treino') {
    if (key === 'sabor' || key === 'weightGrams') return true;
    if (key === 'caffeinePerDoseInMg' || key === 'numberOfDoses' || key === 'doseInGrams') return false;
  }

  if (slug === 'cafe-funcional') {
    if (key === 'sabor' || key === 'weightGrams') return true;
    if (key === 'cafeinaPorDoseMg' || key === 'doses' || key === 'doseInGrams') return false;
  }

  return undefined;
}

function applySuggestedFilterability(category: CategoryRow, fields: DynamicDisplayField[]) {
  return fields.map((field) => {
    const suggested =
      category.group === 'suplementos'
        ? getSuggestedSupplementFilterable(category.slug, field)
        : undefined;

    if (typeof suggested === 'boolean') {
      return {
        ...field,
        filterable: suggested,
      };
    }

    if (typeof field.filterable === 'boolean') {
      return field;
    }

    return {
      ...field,
      filterable:
        field.type !== 'currency' &&
        (field.visibility ?? 'public_table') !== 'internal',
    };
  });
}

function buildNormalizedCategoryConfig(category: CategoryRow) {
  const normalized = normalizeDynamicDisplayConfig(
    category.displayConfig
  ) as DynamicDisplayConfigPayloadLike;
  const nextSettings = { ...(normalized.settings ?? {}) };
  let nextFields = [...normalized.fields];

  const primaryDraft = createPrimaryMetricDraftFromSettings(nextSettings);
  const managedKeys = new Set(getPrimaryMetricManagedKeys(primaryDraft));
  const generatedPrimaryFields = buildPrimaryMetricFields(primaryDraft);

  if (primaryDraft.preset && generatedPrimaryFields.length > 0) {
    nextFields = [
      ...generatedPrimaryFields.map((field) => ({
        ...field,
        visibility: field.visibility ?? 'public_table',
      })),
      ...nextFields.filter((field) => !managedKeys.has(field.key)),
    ];
  }

  if (category.group === 'suplementos' && category.slug === 'whey') {
    nextFields = insertOrReplaceField({
      fields: nextFields,
      afterKey: 'sabor',
      field: {
        key: 'weightGrams',
        label: 'Peso (g)',
        type: 'number',
        visibility: 'public_highlight',
        filterable: true,
      },
    });
  }

  if (category.group === 'suplementos' && category.slug === 'barra') {
    nextFields = insertOrReplaceField({
      fields: nextFields,
      afterKey: 'unitsPerBox',
      field: {
        key: 'weightGrams',
        label: 'Peso (g)',
        type: 'number',
        visibility: 'public_highlight',
        filterable: true,
      },
    });
  }

  if (category.group === 'suplementos' && category.slug === 'creatina') {
    nextSettings.bestValueAttributeKey = 'precoPorDose';
    nextSettings.dosePriceAttributeKey = 'precoPorDose';
    nextFields = nextFields.filter((field) => field.key !== 'precoPorGramaCreatina');
    nextFields = insertOrReplaceField({
      fields: nextFields,
      afterKey: 'creatinaPorDose',
      field: {
        key: 'precoPorDose',
        label: 'Preço',
        type: 'currency',
        visibility: 'public_table',
        prefix: 'R$ ',
      },
    });
    nextFields = insertOrReplaceField({
      fields: nextFields,
      afterKey: 'formLabel',
      field: {
        key: 'sabor',
        label: 'Sabor',
        type: 'text',
        visibility: 'public_highlight',
        filterable: true,
      },
    });
    nextFields = insertOrReplaceField({
      fields: nextFields,
      afterKey: 'sabor',
      field: {
        key: 'weightGrams',
        label: 'Peso (g)',
        type: 'number',
        visibility: 'public_highlight',
        filterable: true,
      },
    });
  }

  if (category.group === 'suplementos' && category.slug === 'cafe-funcional') {
    nextFields = insertOrReplaceField({
      fields: nextFields,
      afterKey: 'sabor',
      field: {
        key: 'weightGrams',
        label: 'Peso (g)',
        type: 'number',
        visibility: 'public_highlight',
        filterable: true,
      },
    });
  }

  if (category.group === 'suplementos' && category.slug === 'pre-treino') {
    nextFields = insertOrReplaceField({
      fields: nextFields,
      afterKey: 'sabor',
      field: {
        key: 'weightGrams',
        label: 'Peso (g)',
        type: 'number',
        visibility: 'public_highlight',
        filterable: true,
      },
    });
  }

  nextFields = applySuggestedFilterability(category, nextFields);

  return {
    fields: nextFields,
    settings: nextSettings,
  };
}

async function main() {
  const groupFilter = parseFlagValue('--group');
  const slugFilter = parseFlagValue('--slug');

  const categories = await prisma.dynamicCategory.findMany({
    where: {
      ...(groupFilter ? { group: groupFilter } : {}),
      ...(slugFilter ? { slug: slugFilter } : {}),
    },
    select: {
      id: true,
      group: true,
      slug: true,
      name: true,
      displayConfig: true,
    },
    orderBy: [{ group: 'asc' }, { name: 'asc' }],
  });

  if (categories.length === 0) {
    console.log('Nenhuma categoria encontrada para normalizar.');
    return;
  }

  let updatedCategories = 0;
  let updatedProducts = 0;

  for (const category of categories as CategoryRow[]) {
    const nextDisplayConfig = buildNormalizedCategoryConfig(category);
    const currentDisplayConfig = normalizeDynamicDisplayConfig(category.displayConfig);

    if (JSON.stringify(currentDisplayConfig) !== JSON.stringify(nextDisplayConfig)) {
      await prisma.dynamicCategory.update({
        where: { id: category.id },
        data: {
          displayConfig: nextDisplayConfig as unknown as Prisma.InputJsonValue,
        },
      });
      updatedCategories += 1;
      console.log(
        `Categoria atualizada: ${category.group}/${category.slug} (${category.name})`
      );
    }

    const products = await prisma.dynamicProduct.findMany({
      where: { categoryId: category.id },
      select: {
        id: true,
        name: true,
        totalPrice: true,
        attributes: true,
      },
    });

    for (const product of products) {
      const currentAttributes =
        (product.attributes as Record<string, string | number | boolean | null | undefined>) ||
        {};
      const nextAttributes = enrichDynamicAttributesForCategory({
        category,
        rawDisplayConfig: nextDisplayConfig,
        productName: product.name,
        totalPrice: product.totalPrice,
        attributes: currentAttributes,
      });

      if (JSON.stringify(currentAttributes) === JSON.stringify(nextAttributes)) {
        continue;
      }

      await prisma.dynamicProduct.update({
        where: { id: product.id },
        data: {
          attributes: nextAttributes as Prisma.InputJsonValue,
        },
      });
      updatedProducts += 1;
    }
  }

  console.log(
    `Normalizacao concluida. Categorias atualizadas: ${updatedCategories}. Produtos atualizados: ${updatedProducts}.`
  );
}

main()
  .catch((error) => {
    console.error('Falha na normalizacao dinamica:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


