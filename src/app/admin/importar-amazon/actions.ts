"use server";

import { exec } from "child_process";
import path from "path";
import { promisify } from "util";

const execAsync = promisify(exec);

export type ImportResult = {
  ok: boolean;
  logs: string[];
  error?: string;
};

type ImportInput = {
  asins: string;
  mode: "getItem" | "getVariation";
  titlePattern: string;
  dose: number;
  proteinPerDose: number;
};

export async function importarAmazonAction(
  input: ImportInput
): Promise<ImportResult> {
  const logs: string[] = [];

  const asins = input.asins
    .split(/\r?\n|,|\s+/)
    .map((a) => a.trim())
    .filter(Boolean);

  if (!asins.length) {
    return {
      ok: false,
      logs,
      error: "Nenhum ASIN informado",
    };
  }

  const scriptName =
    input.mode === "getVariation"
      ? "ImportAmazonGetVariation.ts"
      : "ImportAmazonGetItem.ts";

  const scriptPath = path.resolve(
    process.cwd(),
    "scripts",
    scriptName
  );

  try {
    for (const asin of asins) {
      const command = `npx ts-node ${scriptPath} "${asin}" "${input.titlePattern}" ${input.dose} ${input.proteinPerDose}`;

      logs.push(`🚀 Executando:\n${command}`);

      const { stdout, stderr } = await execAsync(command);

      if (stdout) logs.push(stdout.trim());
      if (stderr) logs.push(`⚠️ ${stderr.trim()}`);

      logs.push(`✅ ASIN ${asin} importado com sucesso\n`);
    }

    return {
      ok: true,
      logs,
    };
  } catch (err: any) {
    logs.push(`❌ Erro: ${err.message}`);

    return {
      ok: false,
      logs,
      error: err.message,
    };
  }
}
