import "dotenv/config";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import type { Prisma } from "@prisma/client";
import { prisma } from "../src/lib/prisma";

type ParsedRow = {
  asin: string;
  unidades: number | null;
  tipo: string | null;
  forma: string | null;
  pesoMin: number | null;
  pesoMax: number | null;
  linha: string | null;
};

const CATEGORY_GROUP = "casa";
const CATEGORY_SLUG = "antipulgas";

function parseFlagValue(flag: string) {
  const arg = process.argv.find((entry) => entry.startsWith(`${flag}=`));
  return arg ? arg.slice(flag.length + 1) : "";
}

function fixEncoding(value?: string): string {
  if (!value) return "";
  if (!/[ÃƒÃ‚]/.test(value)) return value;
  return Buffer.from(value, "latin1").toString("utf8");
}

function normalizeText(value?: string): string {
  return fixEncoding(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function parseNumber(raw?: string): number | null {
  if (!raw) return null;
  const normalized = raw.replace(",", ".").trim();
  if (!normalized) return null;
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

function normalizeTipo(raw?: string): string | null {
  const normalized = normalizeText(raw);
  if (!normalized) return null;
  if (normalized.includes("ambiente")) return "ambiente";
  if (normalized.includes("cao") && normalized.includes("gato")) {
    return "cachorro/gato";
  }
  if (normalized === "cao" || normalized === "cachorro") return "cachorro";
  if (normalized === "gato") return "gato";
  return normalized;
}

function normalizeForma(raw?: string): string | null {
  const normalized = normalizeText(raw);
  if (!normalized) return null;
  if (normalized.includes("comprimido")) return "comprimido";
  if (normalized.includes("pipeta")) return "pipeta";
  if (normalized.includes("coleira")) return "coleira";
  if (normalized.includes("shampoo")) return "shampoo";
  if (normalized.includes("spray")) return "spray";
  if (normalized.includes("po")) return "po";
  return normalized;
}

function normalizeLinha(raw?: string): string | null {
  const fixed = fixEncoding(raw || "").trim();
  if (!fixed) return null;
  return fixed.toLowerCase();
}

function loadRows(): ParsedRow[] {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const fileArg = parseFlagValue("--file");
  const filePath = fileArg
    ? path.resolve(process.cwd(), fileArg)
    : path.resolve(__dirname, "../data/imports/ASIN.txt");

  const raw = fs.readFileSync(filePath, "utf-8");
  const lines = raw.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);

  const rows: ParsedRow[] = [];

  for (const line of lines) {
    if (line.toUpperCase().startsWith("ASIN")) {
      continue;
    }
    const parts = line.split("\t").map((part) => part.trim());
    if (parts.length < 7) {
      continue;
    }
    const [asinRaw, unidadesRaw, tipoRaw, formaRaw, pesoMinRaw, pesoMaxRaw, linhaRaw] = parts;
    const asin = asinRaw.trim();
    if (!asin) continue;

    const unidades = parseNumber(unidadesRaw);
    const pesoMin = parseNumber(pesoMinRaw);
    const pesoMax = parseNumber(pesoMaxRaw);

    rows.push({
      asin,
      unidades: unidades && unidades > 0 ? unidades : null,
      tipo: normalizeTipo(tipoRaw),
      forma: normalizeForma(formaRaw),
      pesoMin: pesoMin && pesoMin > 0 ? pesoMin : null,
      pesoMax: pesoMax && pesoMax > 0 ? pesoMax : null,
      linha: normalizeLinha(linhaRaw),
    });
  }

  return rows;
}

function setOrDelete(
  attrs: Record<string, unknown>,
  key: string,
  value: unknown
) {
  if (value === null || value === undefined || value === "") {
    delete attrs[key];
    return;
  }
  attrs[key] = value;
}

async function main() {
  const rows = loadRows();
  if (rows.length === 0) {
    console.log("Nenhum item para atualizar.");
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

  for (const row of rows) {
    const existing = await prisma.dynamicProduct.findUnique({
      where: { asin: row.asin },
      select: { id: true, attributes: true },
    });

    if (!existing) {
      missing += 1;
      missingAsins.push(row.asin);
      continue;
    }

    const currentAttrs = (existing.attributes as Record<string, unknown>) || {};
    const nextAttrs: Record<string, unknown> = { ...currentAttrs };

    setOrDelete(nextAttrs, "tipo_pet", row.tipo);
    setOrDelete(nextAttrs, "forma", row.forma);
    setOrDelete(nextAttrs, "unidades", row.unidades);
    setOrDelete(nextAttrs, "peso_pet_min", row.pesoMin);
    setOrDelete(nextAttrs, "peso_pet_max", row.pesoMax);
    setOrDelete(nextAttrs, "linha", row.linha);

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
    const outPath = path.resolve(__dirname, "../data/antipulgas-asin-missing.json");
    fs.writeFileSync(outPath, JSON.stringify(missingAsins, null, 2));
  }

  console.log(
    JSON.stringify(
      {
        total: rows.length,
        updated,
        missing,
        missingPath: missing > 0 ? "data/antipulgas-asin-missing.json" : null,
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
