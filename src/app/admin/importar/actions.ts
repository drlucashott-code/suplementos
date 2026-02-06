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
  category: "whey" | "creatina" | "barra" | "bebidaproteica";
  titlePattern: string;
  brand: string;
  totalWeight: number;
  unitsPerBox: number;
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
    const asinsJoined = asins.join(",");

    // ✅ A GRANDE CORREÇÃO:
    // Adicionamos "-r dotenv/config" para forçar o carregamento do .env 
    // ANTES do script do Prisma tentar rodar os imports.
    const command = `npx ts-node -r dotenv/config ${scriptPath} "${asinsJoined}" "${input.titlePattern}" "${input.category}" "${input.brand}" ${input.totalWeight} ${input.unitsPerBox} ${input.dose} ${input.protein}`;

    logs.push(`🚀 [${input.category.toUpperCase()}] Iniciando processamento de lote (${asins.length} ASINs)...`);

    // 3. Execução do comando
    const { stdout, stderr } = await execAsync(command);

    if (stdout) {
      logs.push(...stdout.trim().split("\n"));
    }
    
    if (stderr) {
      logs.push(`⚠️ Alertas do sistema: ${stderr.trim()}`);
    }

    // 4. Revalidação de cache (importante para Next.js)
    revalidatePath("/admin/whey");
    revalidatePath("/admin/creatina");
    revalidatePath("/admin/barra");
    revalidatePath("/admin/bebidaproteica");
    revalidatePath("/bebidaproteica");

    return {
      ok: true,
      logs,
    };

  } catch (err: unknown) {
    // ✅ CORREÇÃO DE ANY: Tipagem segura para o ESLint
    const errorMessage = err instanceof Error ? err.message : "Erro desconhecido na execução do comando shell";
    
    logs.push(`❌ Erro crítico na execução do lote: ${errorMessage}`);

    return {
      ok: false,
      logs,
      error: errorMessage,
    };
  }
}