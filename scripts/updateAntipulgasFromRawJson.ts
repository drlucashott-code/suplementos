import "dotenv/config";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { prisma } from "../src/lib/prisma";
import type { Prisma } from "@prisma/client";

type RawItem = {
  ASIN?: string;
  DetailPageURL?: string;
  ItemInfo?: {
    Title?: { DisplayValue?: string };
    ByLineInfo?: {
      Brand?: { DisplayValue?: string };
      Manufacturer?: { DisplayValue?: string };
    };
    ProductInfo?: {
      Size?: { DisplayValue?: string };
      UnitCount?: { DisplayValue?: number };
    };
  };
  BrowseNodeInfo?: {
    BrowseNodes?: Array<{ DisplayName?: string }>;
  };
};

const CATEGORY_GROUP = "casa";
const CATEGORY_SLUG = "antipulgas";

function parseFlagValue(flag: string) {
  const arg = process.argv.find((entry) => entry.startsWith(`${flag}=`));
  return arg ? arg.slice(flag.length + 1) : "";
}

function loadJson(): RawItem[] {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const dirArg = parseFlagValue("--dir");
  const filesArg = parseFlagValue("--files");
  const fileArg = parseFlagValue("--file");

  let paths: string[] = [];

  if (dirArg) {
    const dirPath = path.resolve(process.cwd(), dirArg);
    const entries = fs.readdirSync(dirPath);
    paths = entries
      .filter((entry) => entry.endsWith(".json"))
      .map((entry) => path.join(dirPath, entry));
  } else if (filesArg) {
    paths = filesArg
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean)
      .map((entry) => path.resolve(process.cwd(), entry));
  } else if (fileArg) {
    paths = [path.resolve(process.cwd(), fileArg)];
  } else {
    paths = [path.resolve(__dirname, "../produtos_raw.json")];
  }

  const items: RawItem[] = [];

  for (const jsonPath of paths) {
    const raw = fs.readFileSync(jsonPath, "utf-8");
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      throw new Error(`Arquivo invalido: ${jsonPath}`);
    }
    items.push(...(parsed as RawItem[]));
  }

  return items;
}

function fixEncoding(value?: string): string {
  if (!value) return "";
  if (!/[ÃÂ]/.test(value)) return value;
  return Buffer.from(value, "latin1").toString("utf8");
}

function normalizeText(value?: string): string {
  return fixEncoding(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function parseNumber(raw: string): number | null {
  const normalized = raw.replace(",", ".").replace(/\s/g, "");
  const num = Number(normalized);
  return Number.isFinite(num) ? num : null;
}

function parseWeightRange(text?: string) {
  const normalized = normalizeText(text).replace(/\+/g, "");
  if (!normalized) return { min: null as number | null, max: null as number | null };

  const rangeWithKgMatch = normalized.match(
    /(\d+(?:[.,]\d+)?)\s*kg\s*(?:a|-)\s*(\d+(?:[.,]\d+)?)\s*kg/
  );
  if (rangeWithKgMatch) {
    return {
      min: parseNumber(rangeWithKgMatch[1]),
      max: parseNumber(rangeWithKgMatch[2]),
    };
  }

  const rangeMatch =
    normalized.match(/(\d+(?:[.,]\d+)?)\s*(?:a|-)\s*(\d+(?:[.,]\d+)?)\s*kg/) ||
    normalized.match(/de\s*(\d+(?:[.,]\d+)?)\s*kg?\s*a\s*(\d+(?:[.,]\d+)?)\s*kg/);
  if (rangeMatch) {
    return {
      min: parseNumber(rangeMatch[1]),
      max: parseNumber(rangeMatch[2]),
    };
  }

  const minOnlyMatch = normalized.match(/(\d+(?:[.,]\d+)?)\s*kg\s*\+/);
  if (minOnlyMatch) {
    return { min: parseNumber(minOnlyMatch[1]), max: null };
  }

  const uptoMatch =
    normalized.match(/ate\s*(\d+(?:[.,]\d+)?)\s*kg/) ||
    normalized.match(/ate\s*(\d+(?:[.,]\d+)?)kg/);
  if (uptoMatch) {
    return { min: null, max: parseNumber(uptoMatch[1]) };
  }

  const fromMatch = normalized.match(/acima\s*de\s*(\d+(?:[.,]\d+)?)\s*kg/);
  if (fromMatch) {
    return { min: parseNumber(fromMatch[1]), max: null };
  }

  return { min: null, max: null };
}

function parseUnits(title: string, unitCount?: number | null): number | null {
  if (typeof unitCount === "number" && Number.isFinite(unitCount) && unitCount > 0) {
    return unitCount;
  }

  const normalized = normalizeText(title);
  const kitMatch = normalized.match(/kit\s*(\d+)\s*(?:un|unidades)/);
  const packShortMatch = normalized.match(/c\/?\s*(\d+)/);
  const packMatch = normalized.match(
    /c\/?\s*(\d+)\s*(tablete|tabletes|comprimido|comprimidos|aplicador|aplicadores|pipeta|pipetas)/i
  );
  const singleMatch = normalized.match(
    /(\d+)\s*(tablete|tabletes|comprimido|comprimidos|aplicador|aplicadores|pipeta|pipetas)/i
  );
  if (kitMatch && packMatch) {
    return Number(kitMatch[1]) * Number(packMatch[1]);
  }
  if (kitMatch && singleMatch) {
    return Number(kitMatch[1]) * Number(singleMatch[1]);
  }
  if (kitMatch && packShortMatch) {
    return Number(kitMatch[1]) * Number(packShortMatch[1]);
  }
  if (packMatch) {
    return Number(packMatch[1]);
  }
  if (singleMatch) {
    return Number(singleMatch[1]);
  }
  if (packShortMatch) {
    return Number(packShortMatch[1]);
  }
  if (kitMatch) {
    return Number(kitMatch[1]);
  }

  return null;
}

function parseForma(title: string): string | null {
  const normalized = normalizeText(title);
  if (!normalized) return null;
  if (normalized.includes("pipeta") || normalized.includes("aplicador")) {
    return "pipeta";
  }
  if (normalized.includes("coleira")) {
    return "coleira";
  }
  if (normalized.includes("tablete") || normalized.includes("comprimido") || normalized.includes("mastig")) {
    return "comprimido";
  }
  return null;
}

function parseTipoPet(title: string, browseNodes?: Array<{ DisplayName?: string }>) {
  const normalized = normalizeText(title);
  if (normalized.includes("gato")) return "gato";
  if (normalized.includes("cao") || normalized.includes("cachorro") || normalized.includes("caes")) {
    return "cachorro";
  }
  const nodeMatch = browseNodes
    ?.map((node) => normalizeText(node.DisplayName))
    .find((name) => name.includes("gatos") || name.includes("caes"));
  if (nodeMatch?.includes("gatos")) return "gato";
  if (nodeMatch?.includes("caes")) return "cachorro";
  return null;
}

function parseLinha(title: string, brand?: string | null): string | null {
  const normalized = normalizeText(title);
  if (normalized.includes("spectra")) return "nexgard spectra";
  if (normalized.includes("combo")) return "nexgard combo";
  if (normalized.includes("nexgard")) return "nexgard";
  if (brand) return normalizeText(brand) || null;
  return null;
}

async function main() {
  const items = loadJson();
  if (items.length === 0) {
    console.log("Nenhum item no JSON.");
    return;
  }

  const category = await prisma.dynamicCategory.findFirst({
    where: { group: CATEGORY_GROUP, slug: CATEGORY_SLUG },
    select: { id: true },
  });

  if (!category) {
    throw new Error(`Categoria ${CATEGORY_GROUP}/${CATEGORY_SLUG} nao encontrada.`);
  }

  let updated = 0;
  let missing = 0;
  const missingAsins: string[] = [];

  for (const item of items) {
    const asin = item.ASIN?.trim();
    if (!asin) continue;

    const titleRaw = item.ItemInfo?.Title?.DisplayValue ?? "";
    const title = fixEncoding(titleRaw);
    const brandRaw =
      item.ItemInfo?.ByLineInfo?.Brand?.DisplayValue ??
      item.ItemInfo?.ByLineInfo?.Manufacturer?.DisplayValue ??
      null;
    const brand = fixEncoding(brandRaw || "");
    const sizeRaw = item.ItemInfo?.ProductInfo?.Size?.DisplayValue;
    const sizeText = sizeRaw ? fixEncoding(sizeRaw) : "";
    const unitCount = item.ItemInfo?.ProductInfo?.UnitCount?.DisplayValue ?? null;

    const { min: pesoMin, max: pesoMax } = parseWeightRange(sizeText || title);
    const unidades = parseUnits(title, unitCount);
    const forma = parseForma(title);
    const tipoPet = parseTipoPet(title, item.BrowseNodeInfo?.BrowseNodes);
    const linha = parseLinha(title, brand);

    const existing = await prisma.dynamicProduct.findUnique({
      where: { asin },
      select: { id: true, attributes: true, totalPrice: true },
    });

    if (!existing) {
      missing += 1;
      missingAsins.push(asin);
      continue;
    }

    const currentAttrs = (existing.attributes as Record<string, unknown>) || {};
    const nextAttrs: Record<string, unknown> = { ...currentAttrs };

    if (brand) nextAttrs.brand = brand;
    if (tipoPet) nextAttrs.tipo_pet = tipoPet;
    if (forma) nextAttrs.forma = forma;
    if (typeof unidades === "number" && unidades > 0) nextAttrs.unidades = unidades;
    if (typeof pesoMin === "number") nextAttrs.peso_pet_min = pesoMin;
    if (typeof pesoMax === "number") nextAttrs.peso_pet_max = pesoMax;
    if (linha) nextAttrs.linha = linha;

    await prisma.dynamicProduct.update({
      where: { id: existing.id },
      data: {
        categoryId: category.id,
        attributes: nextAttrs as Prisma.InputJsonValue,
      },
    });

    updated += 1;
  }

  if (missingAsins.length > 0) {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const outPath = path.resolve(__dirname, "../data/antipulgas-missing.json");
    fs.writeFileSync(outPath, JSON.stringify(missingAsins, null, 2));
  }

  console.log(
    JSON.stringify(
      {
        total: items.length,
        updated,
        missing,
        missingPath: missing > 0 ? "data/antipulgas-missing.json" : null,
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
