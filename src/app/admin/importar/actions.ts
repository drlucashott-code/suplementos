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

// Tipagem expandida para suportar Bebidas
type ImportInput = {
  asins: string;
  mode: "getItem" | "getVariation";
  // ✅ Garante que a string corresponda exatamente ao valor enviado pelo front-end
  category: "whey" | "creatina" | "barra" | "bebida_proteica";
  titlePattern: string;
  brand: string;
  
  // Campos Genéricos / Específicos
  totalWeight: number;       // Whey, Creatina
  dose: number;              // Whey, Creatina, Barra (peso unitário)
  protein: number;           // Whey, Barra, Bebida
  
  unitsPerBox: number;       // Barra
  unitsPerPack: number;      // Bebida
  volumePerUnitInMl: number; // Bebida
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
    const asinsJoined = asins.join(",");

    // Lógica de Unificação de Parâmetros para o CLI
    // O script espera: category brand totalWeight units dose protein
    
    let paramUnits = input.unitsPerBox;
    let paramDoseOrVolume = input.dose;

    // ✅ Lógica específica para mapear os campos de bebida
    if (input.category === "bebida_proteica") {
      paramUnits = input.unitsPerPack;          // Mapeia Pack -> Units
      paramDoseOrVolume = input.volumePerUnitInMl; // Mapeia Volume -> Dose
    }

    // ✅ ALTERAÇÃO IMPORTANTE: Usando 'tsx' em vez de 'ts-node' para melhor compatibilidade com Prisma Adapter
    const command = `npx tsx ${scriptPath} "${asinsJoined}" "${input.titlePattern}" "${input.category}" "${input.brand}" ${input.totalWeight} ${paramUnits} ${paramDoseOrVolume} ${input.protein}`;

    logs.push(`🚀 [${input.category.toUpperCase()}] Iniciando processamento de lote (${asins.length} ASINs)...`);

    // 4. Execução única
    const { stdout, stderr } = await execAsync(command);

    if (stdout) {
      logs.push(...stdout.trim().split("\n"));
    }
    
    if (stderr) {
      logs.push(`⚠️ Alertas do sistema: ${stderr.trim()}`);
    }

    // 5. Revalidação das rotas
    revalidatePath("/admin/whey");
    revalidatePath("/admin/creatina");
    revalidatePath("/admin/barra");
    revalidatePath("/admin/bebidaproteica"); // ✅ Atualiza a tabela de bebidas

    return {
      ok: true,
      logs,
    };
  } catch (err) {
    // ✅ Tratamento de erro tipado corretamente
    const errorMessage = err instanceof Error ? err.message : "Erro desconhecido";
    logs.push(`❌ Erro crítico na execução do lote: ${errorMessage}`);

    return {
      ok: false,
      logs,
      error: errorMessage,
    };
  }
}