export type DynamicFieldType = "text" | "number" | "currency";
export type DynamicFieldVisibility = "internal" | "public_table" | "public_highlight";

export type DynamicDisplayField = {
  key: string;
  label: string;
  type: DynamicFieldType;
  visibility?: DynamicFieldVisibility;
  filterable?: boolean;
  prefix?: string;
  suffix?: string;
  hideLabel?: boolean;
};

export type PrimaryMetricPresetId =
  | ""
  | "units"
  | "weight_grams"
  | "meters"
  | "volume_ml"
  | "doses"
  | "washes"
  | "capsules"
  | "custom";

export type DynamicCategoryMetricSettings = {
  primaryMetricPreset?: PrimaryMetricPresetId;
  primaryMetricLabel?: string;
  primaryMetricUnitLabel?: string;
  primaryMetricAttributeKey?: string;
  primaryMetricPriceKey?: string;
  primaryMetricPriceLabel?: string;
};

export type DynamicCategorySettingsLike = DynamicCategoryMetricSettings & {
  analysisTitleTemplate?: string;
  bestValueAttributeKey?: string;
  dosePriceAttributeKey?: string;
  hideFromHome?: boolean;
  enabledSorts?: string[];
  defaultSort?: string;
  customSorts?: Array<{
    value: string;
    label: string;
    attributeKey: string;
    direction: "asc" | "desc";
  }>;
};

export type DynamicDisplayConfigPayloadLike = {
  fields: DynamicDisplayField[];
  settings?: DynamicCategorySettingsLike;
};

type KnownMetricKind =
  | "units"
  | "weight_grams"
  | "meters"
  | "volume_ml"
  | "doses"
  | "washes"
  | "capsules"
  | "flavor"
  | "color"
  | "size";

type KnownPriceKind =
  | "preco_por_unidade"
  | "preco_por_grama"
  | "preco_por_metro"
  | "preco_por_ml"
  | "preco_por_dose"
  | "preco_por_lavagem"
  | "preco_por_capsula";

type PrimaryMetricPresetDefinition = {
  id: Exclude<PrimaryMetricPresetId, "">;
  label: string;
  unitLabel: string;
  attributeKey: string;
  priceKey: string;
  priceLabel: string;
  analysisTitleTemplate: string;
  extractorKind: Exclude<KnownMetricKind, "flavor" | "color" | "size">;
  showUnitInLabel?: boolean;
};

export type PrimaryMetricDraft = {
  preset: PrimaryMetricPresetId;
  label: string;
  unitLabel: string;
  attributeKey: string;
  priceKey: string;
  priceLabel: string;
};

export type DynamicAttributeValue =
  | string
  | number
  | boolean
  | null
  | undefined;

export type DynamicAttributesMap = Record<string, DynamicAttributeValue>;

const SUPPLEMENT_DERIVED_ATTRIBUTES_BY_SLUG: Record<string, string[]> = {
  barra: ["weightGrams", "precoPorBarra", "precoPorGramaProteina"],
  bebidaproteica: ["precoPorUnidade", "precoPorGramaProteina"],
  "cafe-funcional": ["precoPorDose", "precoPor100MgCafeina"],
  "pre-treino": ["precoPorDose"],
  whey: ["precoPorDose", "precoPorGramaProteina", "proteinPercentage"],
  creatina: ["gramasCreatinaPuraNoPote", "precoPorDose", "precoPorGramaCreatina"],
};

function clearSupplementDerivedAttributes(
  slug: string | null | undefined,
  enriched: DynamicAttributesMap
) {
  if (!slug) return;

  for (const key of SUPPLEMENT_DERIVED_ATTRIBUTES_BY_SLUG[slug] ?? []) {
    delete enriched[key];
  }
}

function applySupplementDerivedMetrics(
  slug: string | null | undefined,
  enriched: DynamicAttributesMap,
  totalPrice: number
) {
  if (!slug) {
    return;
  }

  const numberOfDoses = getNumericValue(enriched.numberOfDoses) || getNumericValue(enriched.doses);
  const totalProteinInGrams = getNumericValue(enriched.totalProteinInGrams);
  const cafeinaTotalMg = getNumericValue(enriched.cafeinaTotalMg);
  const creatinaPorDose = getNumericValue(enriched.creatinaPorDose);
  const unitsPerBox = getNumericValue(enriched.unitsPerBox);
  const unitsPerPack = getNumericValue(enriched.unitsPerPack);
  const proteinPerDoseInGrams = getNumericValue(enriched.proteinPerDoseInGrams);
  const doseInGrams = getNumericValue(enriched.doseInGrams);

  if (slug === "whey" && proteinPerDoseInGrams > 0 && doseInGrams > 0) {
    enriched.proteinPercentage = toRoundedMetricValue(
      (proteinPerDoseInGrams / doseInGrams) * 100
    );
  }

  if (!Number.isFinite(totalPrice) || totalPrice <= 0) {
    return;
  }

  switch (slug) {
    case "barra":
      if (unitsPerBox > 0) {
        enriched.precoPorBarra = toRoundedMetricValue(totalPrice / unitsPerBox);
      }
      if (totalProteinInGrams > 0) {
        enriched.precoPorGramaProteina = toRoundedMetricValue(totalPrice / totalProteinInGrams);
      }
      return;
    case "bebidaproteica":
      if (unitsPerPack > 0) {
        enriched.precoPorUnidade = toRoundedMetricValue(totalPrice / unitsPerPack);
      }
      if (totalProteinInGrams > 0) {
        enriched.precoPorGramaProteina = toRoundedMetricValue(totalPrice / totalProteinInGrams);
      }
      return;
    case "cafe-funcional":
      if (numberOfDoses > 0) {
        enriched.precoPorDose = toRoundedMetricValue(totalPrice / numberOfDoses);
      }
      if (cafeinaTotalMg > 0) {
        enriched.precoPor100MgCafeina = toRoundedMetricValue((totalPrice / cafeinaTotalMg) * 100);
      }
      return;
    case "pre-treino":
      if (numberOfDoses > 0) {
        enriched.precoPorDose = toRoundedMetricValue(totalPrice / numberOfDoses);
      }
      return;
    case "whey":
      if (numberOfDoses > 0) {
        enriched.precoPorDose = toRoundedMetricValue(totalPrice / numberOfDoses);
      }
      if (totalProteinInGrams > 0) {
        enriched.precoPorGramaProteina = toRoundedMetricValue(totalPrice / totalProteinInGrams);
      }
      return;
    case "creatina": {
      const precoPorDose = numberOfDoses > 0 ? totalPrice / numberOfDoses : 0;
      if (precoPorDose > 0) {
        enriched.precoPorDose = toRoundedMetricValue(precoPorDose);
      }
      if (precoPorDose > 0 && creatinaPorDose > 0) {
        enriched.precoPorGramaCreatina = toRoundedMetricValue(precoPorDose / creatinaPorDose);
      }
      return;
    }
    default:
      return;
  }
}

const PRIMARY_METRIC_PRESETS: PrimaryMetricPresetDefinition[] = [
  {
    id: "units",
    label: "Unidades",
    unitLabel: "un",
    attributeKey: "units",
    priceKey: "precoPorUnidade",
    priceLabel: "Por unidade",
    analysisTitleTemplate: "ANALISE POR UNIDADE ({units}UN)",
    extractorKind: "units",
  },
  {
    id: "weight_grams",
    label: "Peso",
    unitLabel: "g",
    attributeKey: "weightGrams",
    priceKey: "precoPorGrama",
    priceLabel: "Por g",
    analysisTitleTemplate: "ANALISE POR PESO ({weightGrams}G)",
    extractorKind: "weight_grams",
    showUnitInLabel: true,
  },
  {
    id: "meters",
    label: "Metros",
    unitLabel: "m",
    attributeKey: "meters",
    priceKey: "precoPorMetro",
    priceLabel: "Por metro",
    analysisTitleTemplate: "ANALISE POR METRAGEM ({meters}M)",
    extractorKind: "meters",
  },
  {
    id: "volume_ml",
    label: "Volume",
    unitLabel: "ml",
    attributeKey: "volumeMl",
    priceKey: "precoPorMl",
    priceLabel: "Por ml",
    analysisTitleTemplate: "ANALISE POR VOLUME ({volumeMl}ML)",
    extractorKind: "volume_ml",
    showUnitInLabel: true,
  },
  {
    id: "doses",
    label: "Doses",
    unitLabel: "",
    attributeKey: "doses",
    priceKey: "precoPorDose",
    priceLabel: "Por dose",
    analysisTitleTemplate: "ANALISE POR DOSE ({doses} DOSES)",
    extractorKind: "doses",
  },
  {
    id: "washes",
    label: "Lavagens",
    unitLabel: "",
    attributeKey: "washes",
    priceKey: "precoPorLavagem",
    priceLabel: "Por lavagem",
    analysisTitleTemplate: "ANALISE POR LAVAGEM ({washes} LAVAGENS)",
    extractorKind: "washes",
  },
  {
    id: "capsules",
    label: "Capsulas",
    unitLabel: "",
    attributeKey: "capsules",
    priceKey: "precoPorCapsula",
    priceLabel: "Por capsula",
    analysisTitleTemplate: "ANALISE POR CAPSULA ({capsules} CAPS)",
    extractorKind: "capsules",
  },
];

const FLAVOR_TERMS = [
  "baunilha",
  "chocolate",
  "morango",
  "banana",
  "cookies",
  "cookies and cream",
  "coco",
  "uva",
  "limao",
  "limao siciliano",
  "limonada",
  "laranja",
  "maca verde",
  "chiclete",
  "natural",
  "neutro",
  "sem sabor",
  "tradicional",
  "menta",
  "hortela",
  "frutas vermelhas",
  "melancia",
  "manga",
  "pessego",
  "maracuja",
  "tropical",
  "acai",
  "pink lemonade",
];

const COLOR_TERMS = [
  "preto",
  "branco",
  "azul",
  "vermelho",
  "verde",
  "rosa",
  "roxo",
  "lilas",
  "amarelo",
  "cinza",
  "bege",
  "marrom",
  "dourado",
  "prata",
  "transparente",
];

const EXACT_METRIC_ALIASES: Record<KnownMetricKind, string[]> = {
  units: ["units", "unit", "unidades", "unidade", "quantidade"],
  weight_grams: ["weightgrams", "peso", "pesoemgramas", "pesograms", "gramas"],
  meters: ["meters", "meter", "metros", "metro", "metragem"],
  volume_ml: ["volumeml", "volume", "volumeemml"],
  doses: ["doses", "dose", "numberofdoses", "numerodedoses"],
  washes: ["washes", "washescount", "lavagens", "lavagem"],
  capsules: ["capsules", "capsule", "capsulas", "capsula"],
  flavor: ["sabor", "flavor"],
  color: ["cor", "color"],
  size: ["tamanho", "size"],
};

const EXACT_PRICE_ALIASES: Record<KnownPriceKind, string[]> = {
  preco_por_unidade: ["precoporunidade"],
  preco_por_grama: ["precoporgrama"],
  preco_por_metro: ["precopormetro"],
  preco_por_ml: ["precoporml"],
  preco_por_dose: ["precopordose"],
  preco_por_lavagem: ["precoporlavagem"],
  preco_por_capsula: ["precoporcapsula"],
};

const PRICE_TO_METRIC_KIND: Record<KnownPriceKind, KnownMetricKind> = {
  preco_por_unidade: "units",
  preco_por_grama: "weight_grams",
  preco_por_metro: "meters",
  preco_por_ml: "volume_ml",
  preco_por_dose: "doses",
  preco_por_lavagem: "washes",
  preco_por_capsula: "capsules",
};

function normalizeToken(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function normalizeTitle(title: string) {
  return title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/,/g, ".")
    .replace(/\s+/g, " ")
    .trim();
}

function formatPrimaryMetricLabel(label: string, unitLabel: string) {
  const cleanLabel = label.trim();
  const cleanUnit = unitLabel.trim();
  if (!cleanLabel) return "";
  if (!cleanUnit) return cleanLabel;
  return `${cleanLabel} (${cleanUnit})`;
}

function toRoundedMetricValue(value: number) {
  return Number(value.toFixed(4));
}

function extractPackTotalMetric(
  normalizedTitle: string,
  unitsPattern: string,
  metricPattern: string
) {
  const regex = new RegExp(
    `(\\d+)\\s*(?:x|${unitsPattern})\\s*(?:de\\s*)?(\\d+(?:\\.\\d+)?)\\s*(?:${metricPattern})\\b`,
    "i"
  );
  const packMatch = normalizedTitle.match(regex);

  if (!packMatch) {
    return null;
  }

  const units = Number(packMatch[1]);
  const amount = Number(packMatch[2]);

  if (!Number.isFinite(units) || !Number.isFinite(amount) || units <= 0 || amount <= 0) {
    return null;
  }

  return { units, amount };
}

function extractVolumeMl(normalizedTitle: string): number | null {
  const packed = extractPackTotalMetric(
    normalizedTitle,
    "un(?:id(?:ades?)?)?|frascos?|embalagens?|latas?|tubos?",
    "ml|l"
  );

  if (packed) {
    const unitMatch = normalizedTitle.match(
      new RegExp(`${packed.amount}(?:\\.0+)?\\s*(ml|l)`, "i")
    );
    const unit = unitMatch?.[1] ?? "ml";
    const totalMl = unit === "l" ? packed.units * packed.amount * 1000 : packed.units * packed.amount;
    return Math.round(totalMl);
  }

  const singleMatch = normalizedTitle.match(/(\d+(?:\.\d+)?)\s*(ml|l)\b/i);
  if (!singleMatch) return null;

  const amount = Number(singleMatch[1]);
  if (!Number.isFinite(amount) || amount <= 0) return null;

  return Math.round(singleMatch[2].toLowerCase() === "l" ? amount * 1000 : amount);
}

function extractWeightGrams(normalizedTitle: string): number | null {
  const packed = extractPackTotalMetric(
    normalizedTitle,
    "un(?:id(?:ades?)?)?|saches?|pacotes?|barras?|capsulas?|caps?",
    "g|kg"
  );

  if (packed) {
    const unitMatch = normalizedTitle.match(
      new RegExp(`${packed.amount}(?:\\.0+)?\\s*(g|kg)`, "i")
    );
    const unit = unitMatch?.[1] ?? "g";
    const totalGrams = unit === "kg" ? packed.units * packed.amount * 1000 : packed.units * packed.amount;
    return Math.round(totalGrams);
  }

  const singleMatch = normalizedTitle.match(/(\d+(?:\.\d+)?)\s*(g|kg)\b/i);
  if (!singleMatch) return null;

  const amount = Number(singleMatch[1]);
  if (!Number.isFinite(amount) || amount <= 0) return null;

  return Math.round(singleMatch[2].toLowerCase() === "kg" ? amount * 1000 : amount);
}

function extractMeters(normalizedTitle: string): number | null {
  const packed = extractPackTotalMetric(
    normalizedTitle,
    "rolos?|un(?:id(?:ades?)?)?|pacotes?",
    "m|metros?"
  );

  if (packed) {
    return Math.round(packed.units * packed.amount * 100) / 100;
  }

  const singleMatch = normalizedTitle.match(/(\d+(?:\.\d+)?)\s*(m|metros?)\b/i);
  if (!singleMatch) return null;

  const amount = Number(singleMatch[1]);
  return Number.isFinite(amount) && amount > 0 ? Math.round(amount * 100) / 100 : null;
}

function extractUnits(normalizedTitle: string): number | null {
  const match =
    normalizedTitle.match(/(?:c\/|com\s+)?(\d+)\s*(?:un(?:id(?:ades?)?)?|unds?|und\b)\b/i) ??
    normalizedTitle.match(/(?:kit|pack)\s*(?:com\s+)?(\d+)\b/i);

  if (!match) return null;

  const amount = Number(match[1]);
  return Number.isFinite(amount) && amount > 0 ? Math.round(amount) : null;
}

function extractDoses(normalizedTitle: string): number | null {
  const match = normalizedTitle.match(
    /(\d+)\s*(?:doses?|porcoes?|porcoes?|servings?)\b/i
  );

  if (!match) return null;

  const amount = Number(match[1]);
  return Number.isFinite(amount) && amount > 0 ? Math.round(amount) : null;
}

function extractWashes(normalizedTitle: string): number | null {
  const match = normalizedTitle.match(/(\d+)\s*(?:lavagens?|washes)\b/i);

  if (!match) return null;

  const amount = Number(match[1]);
  return Number.isFinite(amount) && amount > 0 ? Math.round(amount) : null;
}

function extractCapsules(normalizedTitle: string): number | null {
  const match = normalizedTitle.match(/(\d+)\s*(?:capsulas?|caps|tabletes?|tablets)\b/i);

  if (!match) return null;

  const amount = Number(match[1]);
  return Number.isFinite(amount) && amount > 0 ? Math.round(amount) : null;
}

function extractFlavor(normalizedTitle: string): string | null {
  const explicitMatch = normalizedTitle.match(/sabor\s*[:\-]?\s*([a-z0-9 ]{2,40})/i);
  if (explicitMatch?.[1]) {
    return explicitMatch[1].trim();
  }

  return FLAVOR_TERMS.find((item) => normalizedTitle.includes(item)) ?? null;
}

function extractColor(normalizedTitle: string): string | null {
  return COLOR_TERMS.find((item) => normalizedTitle.includes(item)) ?? null;
}

function extractSize(normalizedTitle: string): string | null {
  const namedMatch = normalizedTitle.match(
    /tamanho\s*[:\-]?\s*(pp|p|m|g|gg|xg|xxg|extra grande|grande|medio|medio|pequeno)\b/i
  );
  if (namedMatch?.[1]) {
    return namedMatch[1].trim().toUpperCase();
  }

  const shorthandMatch = normalizedTitle.match(/\b(pp|p|m|g|gg|xg|xxg)\b/i);
  return shorthandMatch?.[1] ? shorthandMatch[1].trim().toUpperCase() : null;
}

function extractKnownValue(kind: KnownMetricKind, normalizedTitle: string) {
  switch (kind) {
    case "volume_ml":
      return extractVolumeMl(normalizedTitle);
    case "weight_grams":
      return extractWeightGrams(normalizedTitle);
    case "meters":
      return extractMeters(normalizedTitle);
    case "units":
      return extractUnits(normalizedTitle);
    case "doses":
      return extractDoses(normalizedTitle);
    case "washes":
      return extractWashes(normalizedTitle);
    case "capsules":
      return extractCapsules(normalizedTitle);
    case "flavor":
      return extractFlavor(normalizedTitle);
    case "color":
      return extractColor(normalizedTitle);
    case "size":
      return extractSize(normalizedTitle);
    default:
      return null;
  }
}

function isValuePresent(value: DynamicAttributeValue) {
  if (value === undefined || value === null) return false;
  if (typeof value === "string") return value.trim() !== "";
  if (typeof value === "number") return Number.isFinite(value) && value > 0;
  return true;
}

function getNumericValue(value: DynamicAttributeValue) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function maybeDeriveCreatineWeightGrams(
  slug: string | null | undefined,
  enriched: DynamicAttributesMap
) {
  if (slug !== "creatina" || isValuePresent(enriched.weightGrams)) {
    return;
  }

  const totalUnits = getNumericValue(enriched.totalUnits);
  const numberOfDoses = getNumericValue(enriched.numberOfDoses) || getNumericValue(enriched.doses);
  const unitsPerDose = getNumericValue(enriched.unitsPerDose) || getNumericValue(enriched.doseInGrams);

  if (numberOfDoses > 0 && unitsPerDose > 0) {
    enriched.weightGrams = Math.round(numberOfDoses * unitsPerDose);
    return;
  }

  if (totalUnits <= 0) {
    return;
  }

  const formToken =
    typeof enriched.form === "string"
      ? normalizeToken(enriched.form)
      : typeof enriched.formLabel === "string"
        ? normalizeToken(enriched.formLabel)
        : "";

  if (formToken === "powder" || formToken === "po") {
    enriched.weightGrams = Math.round(totalUnits);
  }
}

function maybeDeriveProteinBarWeightGrams(
  slug: string | null | undefined,
  enriched: DynamicAttributesMap
) {
  if (slug !== "barra" || isValuePresent(enriched.weightGrams)) {
    return;
  }

  const unitsPerBox = getNumericValue(enriched.unitsPerBox);
  const doseInGrams = getNumericValue(enriched.doseInGrams);

  if (unitsPerBox > 0 && doseInGrams > 0) {
    enriched.weightGrams = Math.round(unitsPerBox * doseInGrams);
  }
}

function maybeDeriveFunctionalCoffeeWeightGrams(
  slug: string | null | undefined,
  enriched: DynamicAttributesMap
) {
  if (slug !== "cafe-funcional" || isValuePresent(enriched.weightGrams)) {
    return;
  }

  const totalWeightInGrams = getNumericValue(enriched.totalWeightInGrams);
  const numberOfDoses = getNumericValue(enriched.numberOfDoses) || getNumericValue(enriched.doses);
  const doseInGrams = getNumericValue(enriched.doseInGrams) || getNumericValue(enriched.unitsPerDose);

  if (totalWeightInGrams > 0) {
    enriched.weightGrams = Math.round(totalWeightInGrams);
    return;
  }

  if (numberOfDoses > 0 && doseInGrams > 0) {
    enriched.weightGrams = Math.round(numberOfDoses * doseInGrams);
  }
}

function maybeDerivePreWorkoutWeightGrams(
  slug: string | null | undefined,
  enriched: DynamicAttributesMap
) {
  if (slug !== "pre-treino" || isValuePresent(enriched.weightGrams)) {
    return;
  }

  const totalWeightInGrams = getNumericValue(enriched.totalWeightInGrams);
  const numberOfDoses = getNumericValue(enriched.numberOfDoses) || getNumericValue(enriched.doses);
  const doseInGrams = getNumericValue(enriched.doseInGrams) || getNumericValue(enriched.unitsPerDose);

  if (totalWeightInGrams > 0) {
    enriched.weightGrams = Math.round(totalWeightInGrams);
    return;
  }

  if (numberOfDoses > 0 && doseInGrams > 0) {
    enriched.weightGrams = Math.round(numberOfDoses * doseInGrams);
  }
}

function maybeDeriveDosesFromWeight(enriched: DynamicAttributesMap) {
  const currentNumberOfDoses = getNumericValue(enriched.numberOfDoses);
  const currentDoses = getNumericValue(enriched.doses);

  if (currentNumberOfDoses > 0 || currentDoses > 0) {
    const canonical = currentNumberOfDoses > 0 ? currentNumberOfDoses : currentDoses;
    if (!isValuePresent(enriched.numberOfDoses)) {
      enriched.numberOfDoses = canonical;
    }
    if (!isValuePresent(enriched.doses)) {
      enriched.doses = canonical;
    }
    return;
  }

  const weightInGrams =
    getNumericValue(enriched.weightGrams) || getNumericValue(enriched.totalWeightInGrams);
  const doseInGrams =
    getNumericValue(enriched.doseInGrams) || getNumericValue(enriched.unitsPerDose);

  if (weightInGrams <= 0 || doseInGrams <= 0) {
    return;
  }

  const derivedDoses = weightInGrams / doseInGrams;
  if (!Number.isFinite(derivedDoses) || derivedDoses <= 0) {
    return;
  }

  const roundedDoses =
    Math.abs(derivedDoses - Math.round(derivedDoses)) < 0.001
      ? Math.round(derivedDoses)
      : toRoundedMetricValue(derivedDoses);

  enriched.numberOfDoses = roundedDoses;
  enriched.doses = roundedDoses;
}

function detectKnownMetricKind(field: Pick<DynamicDisplayField, "key" | "label">) {
  const tokens = [normalizeToken(field.key), normalizeToken(field.label)];

  for (const [kind, aliases] of Object.entries(EXACT_METRIC_ALIASES) as Array<
    [KnownMetricKind, string[]]
  >) {
    if (tokens.some((token) => aliases.includes(token))) {
      return kind;
    }
  }

  return null;
}

function detectKnownPriceKind(field: Pick<DynamicDisplayField, "key" | "label">) {
  const tokens = [normalizeToken(field.key), normalizeToken(field.label)];

  for (const [kind, aliases] of Object.entries(EXACT_PRICE_ALIASES) as Array<
    [KnownPriceKind, string[]]
  >) {
    if (tokens.some((token) => aliases.includes(token))) {
      return kind;
    }
  }

  return null;
}

function findPresetById(id: PrimaryMetricPresetId) {
  if (!id) return null;
  return PRIMARY_METRIC_PRESETS.find((preset) => preset.id === id) ?? null;
}

function inferPresetIdFromKeys(metricKey?: string, priceKey?: string): PrimaryMetricPresetId {
  const normalizedMetricKey = normalizeToken(metricKey ?? "");
  const normalizedPriceKey = normalizeToken(priceKey ?? "");

  const found = PRIMARY_METRIC_PRESETS.find(
    (preset) =>
      normalizeToken(preset.attributeKey) === normalizedMetricKey ||
      normalizeToken(preset.priceKey) === normalizedPriceKey
  );

  return found?.id ?? "";
}

export function getPrimaryMetricPresetOptions() {
  return [
    ...PRIMARY_METRIC_PRESETS.map((preset) => ({
      value: preset.id,
      label: preset.label,
    })),
    {
      value: "custom" as PrimaryMetricPresetId,
      label: "Customizada",
    },
  ];
}

export function createPrimaryMetricDraft(
  presetId: PrimaryMetricPresetId,
  overrides?: Partial<PrimaryMetricDraft>
): PrimaryMetricDraft {
  const preset = findPresetById(presetId);

  return {
    preset: presetId,
    label: overrides?.label ?? preset?.label ?? "",
    unitLabel: overrides?.unitLabel ?? preset?.unitLabel ?? "",
    attributeKey: overrides?.attributeKey ?? preset?.attributeKey ?? "",
    priceKey: overrides?.priceKey ?? preset?.priceKey ?? "",
    priceLabel: overrides?.priceLabel ?? preset?.priceLabel ?? "",
  };
}

export function createPrimaryMetricDraftFromSettings(
  settings?: DynamicCategoryMetricSettings | null
) {
  const presetId =
    settings?.primaryMetricPreset ||
    inferPresetIdFromKeys(
      settings?.primaryMetricAttributeKey,
      settings?.primaryMetricPriceKey
    );

  return createPrimaryMetricDraft(presetId, {
    label: settings?.primaryMetricLabel,
    unitLabel: settings?.primaryMetricUnitLabel,
    attributeKey: settings?.primaryMetricAttributeKey,
    priceKey: settings?.primaryMetricPriceKey,
    priceLabel: settings?.primaryMetricPriceLabel,
  });
}

export function buildPrimaryMetricFields(draft: PrimaryMetricDraft): DynamicDisplayField[] {
  if (!draft.preset || !draft.attributeKey.trim() || !draft.priceKey.trim()) {
    return [];
  }

  const preset = findPresetById(draft.preset);
  const metricLabel =
    !preset && draft.unitLabel.trim()
      ? formatPrimaryMetricLabel(draft.label, draft.unitLabel)
      : preset?.showUnitInLabel === false || !draft.unitLabel.trim()
      ? draft.label.trim()
      : preset?.showUnitInLabel
        ? formatPrimaryMetricLabel(draft.label, draft.unitLabel)
        : draft.label.trim();

  return [
    {
      key: draft.attributeKey.trim(),
      label: metricLabel,
      type: "number",
      visibility: "public_table",
      filterable: true,
    },
    {
      key: draft.priceKey.trim(),
      label: draft.priceLabel.trim(),
      type: "currency",
      visibility: "public_table",
      filterable: false,
    },
  ];
}

export function getPrimaryMetricManagedKeys(draft: PrimaryMetricDraft) {
  return [draft.attributeKey.trim(), draft.priceKey.trim()].filter(Boolean);
}

export function getPrimaryMetricAnalysisTemplate(
  presetId: PrimaryMetricPresetId,
  draft: PrimaryMetricDraft
) {
  const preset = findPresetById(presetId);
  if (!preset || !draft.attributeKey.trim()) {
    return "";
  }

  const cleanLabel = (draft.label || preset.label).trim().toUpperCase();
  const cleanUnit = (draft.unitLabel || preset.unitLabel).trim().toUpperCase();
  const placeholder = `{${draft.attributeKey.trim()}}`;
  return `ANALISE POR ${cleanLabel} (${placeholder}${cleanUnit ? cleanUnit : ""})`;
}

export function normalizeDynamicDisplayConfig(
  rawConfig: unknown
): DynamicDisplayConfigPayloadLike {
  if (Array.isArray(rawConfig)) {
    return {
      fields: rawConfig as DynamicDisplayField[],
      settings: {},
    };
  }

  if (
    rawConfig &&
    typeof rawConfig === "object" &&
    Array.isArray((rawConfig as DynamicDisplayConfigPayloadLike).fields)
  ) {
    return rawConfig as DynamicDisplayConfigPayloadLike;
  }

  return {
    fields: [],
    settings: {},
  };
}

export function enrichDynamicAttributesForCategory(params: {
  category?: { name?: string | null; slug?: string | null } | null;
  rawDisplayConfig?: unknown;
  productName: string;
  totalPrice?: number | null;
  attributes: DynamicAttributesMap;
  allowTitleExtraction?: boolean;
}): DynamicAttributesMap {
  const shouldExtractFromTitle = params.allowTitleExtraction !== false;
  const normalizedTitle = shouldExtractFromTitle ? normalizeTitle(params.productName) : "";
  const normalizedConfig = normalizeDynamicDisplayConfig(params.rawDisplayConfig);
  const settings = normalizedConfig.settings ?? {};
  const enriched: DynamicAttributesMap = { ...params.attributes };
  clearSupplementDerivedAttributes(params.category?.slug, enriched);
  maybeDerivePreWorkoutWeightGrams(params.category?.slug, enriched);
  maybeDeriveFunctionalCoffeeWeightGrams(params.category?.slug, enriched);
  maybeDeriveProteinBarWeightGrams(params.category?.slug, enriched);
  maybeDeriveCreatineWeightGrams(params.category?.slug, enriched);
  maybeDeriveDosesFromWeight(enriched);

  const primaryDraft = createPrimaryMetricDraftFromSettings(settings);
  const primaryPreset = findPresetById(primaryDraft.preset);

  if (shouldExtractFromTitle) {
    if (
      primaryPreset &&
      primaryDraft.attributeKey.trim() &&
      !isValuePresent(enriched[primaryDraft.attributeKey.trim()])
    ) {
      const extractedMetric = extractKnownValue(primaryPreset.extractorKind, normalizedTitle);
      if (isValuePresent(extractedMetric)) {
        enriched[primaryDraft.attributeKey.trim()] = extractedMetric as
          | string
          | number;
      }
    }

    for (const field of normalizedConfig.fields) {
      if (isValuePresent(enriched[field.key])) {
        continue;
      }

      const metricKind = detectKnownMetricKind(field);
      if (metricKind) {
        const extractedValue = extractKnownValue(metricKind, normalizedTitle);
        if (isValuePresent(extractedValue)) {
          enriched[field.key] = extractedValue as string | number;
        }
      }
    }
  }

  const totalPrice = Number(params.totalPrice);
  if (!Number.isFinite(totalPrice) || totalPrice <= 0) {
    applySupplementDerivedMetrics(params.category?.slug, enriched, totalPrice);
    return enriched;
  }

  const priceTargets = new Map<string, KnownMetricKind>();

  if (primaryPreset && primaryDraft.priceKey.trim() && primaryDraft.attributeKey.trim()) {
    priceTargets.set(primaryDraft.priceKey.trim(), primaryPreset.extractorKind);
  }

  for (const field of normalizedConfig.fields) {
    const priceKind = detectKnownPriceKind(field);
    if (priceKind) {
      priceTargets.set(field.key, PRICE_TO_METRIC_KIND[priceKind]);
    }
  }

  for (const [priceKey, metricKind] of priceTargets) {

    const metricValue =
      primaryDraft.attributeKey.trim() &&
      priceKey === primaryDraft.priceKey.trim() &&
      primaryDraft.attributeKey.trim()
        ? getNumericValue(enriched[primaryDraft.attributeKey.trim()])
        : (() => {
            const targetField = normalizedConfig.fields.find(
              (field) => detectKnownMetricKind(field) === metricKind
            );
            return targetField ? getNumericValue(enriched[targetField.key]) : 0;
          })();

    if (metricValue > 0) {
      enriched[priceKey] = toRoundedMetricValue(totalPrice / metricValue);
    }
  }

  applySupplementDerivedMetrics(params.category?.slug, enriched, totalPrice);

  return enriched;
}

