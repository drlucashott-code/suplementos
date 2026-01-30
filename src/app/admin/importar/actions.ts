"use server";

import { exec } from "child_process";
import path from "path";
import { promisify } from "util";
import { revalidatePath } from "next/cache";

const execAsync = promisify(exec);

export type ImportResult = {
  ok: boolean;
  logs: string[];
  error?: string;
};

type ImportInput = {
  asins: string;
  mode: "getItem" | "getVariation";
  category: "whey" | "creatina" | "barra";
  titlePattern: string;
  brand: string;
  totalWeight: number;
  unitsPerBox: number; // Sincronizado com o Schema
  dose: number;
  protein: number;
};

export async function importarAmazonAction(
  input: ImportInput
): Promise<ImportResult> {
  const logs: string[] = [];

  // 1. Limpeza e separação da lista de ASINs
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

  // 2. Definição do script
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
    // 3. Preparação do comando em lote
    // Unimos os ASINs por vírgula para que o script v1.8 processe tudo em uma única execução
    const asinsJoined = asins.join(",");

    const command = `npx ts-node ${scriptPath} "${asinsJoined}" "${input.titlePattern}" "${input.category}" "${input.brand}" ${input.totalWeight} ${input.unitsPerBox} ${input.dose} ${input.protein}`;

    logs.push(`🚀 [${input.category.toUpperCase()}] Iniciando processamento de lote (${asins.length} ASINs)...`);

    // 4. Execução única (para suportar a memória de ParentASIN)
    const { stdout, stderr } = await execAsync(command);

    if (stdout) {
      // Divide o stdout por linhas para popular os logs da interface
      logs.push(...stdout.trim().split("\n"));
    }
    
    if (stderr) {
      logs.push(`⚠️ Alertas do sistema: ${stderr.trim()}`);
    }

    // 5. Revalidação das rotas para atualizar as tabelas de administração
    revalidatePath("/admin/whey");
    revalidatePath("/admin/creatina");
    revalidatePath("/admin/barra");

    return {
      ok: true,
      logs,
    };
  } catch (err: any) {
    logs.push(`❌ Erro crítico na execução do lote: ${err.message}`);

    return {
      ok: false,
      logs,
      error: err.message,
    };
  }
}