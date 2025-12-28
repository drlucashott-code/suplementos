/**
 * Tipos compartilhados da importação Amazon (Whey)
 * Usado apenas dentro da pasta /scripts
 * NÃO é importado pelo Next.js
 */

/* =========================
   INPUT (vindo da UI)
========================= */

export type ImportMode = "getItem" | "getVariation";

export interface ImportAmazonInput {
  asins: string[];

  /** getItem = simples | getVariation = com variações */
  mode: ImportMode;

  /**
   * Template do nome do produto
   * Ex:
   * Whey Protein Concentrado {brand} {weight} / {title}
   */
  titleTemplate: string;

  /** Dose em gramas (ex: 30) */
  dose: number;

  /** Proteína por dose em gramas (ex: 24) */
  proteinPerDose: number;
}

/* =========================
   LOGS
========================= */

export type ImportStatus =
  | "imported"
  | "skipped"
  | "error";

export interface ImportLog {
  asin: string;
  status: ImportStatus;
  message: string;
}

/* =========================
   RESULTADO FINAL
========================= */

export interface ImportResult {
  imported: number;
  skipped: number;
  errors: number;
  logs: ImportLog[];
}
