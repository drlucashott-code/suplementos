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

// Tipagem expandida para suportar Bebidas e Pré-Treino
type ImportInput = {
  asins: string;
  mode: "getItem" | "getVariation";
  // ✅ Incluído pre_treino
  category: "whey" | "creatina" | "barra" | "bebida_proteica" | "pre_treino";
  titlePattern: string;
  brand: string;
  
  // Campos Genéricos / Específicos
  totalWeight: number;       // Whey, Creatina, Pré-Treino
  dose: number;              // Whey, Creatina, Barra, Pré-Treino
  protein: number;           // Whey, Barra, Bebida
  
  unitsPerBox: number;       // Barra
  unitsPerPack: number;      // Bebida
  volumePerUnitInMl: number; // Bebida
  caffeine: number;          // ✅ Pré-Treino (Novo)
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

    // =================================================================
    // Lógica de Unificação de Parâmetros (CLI Mapping)
    // O script espera a ordem: 
    // category brand weight units dose nutrient(prot/caffeine)
    // =================================================================
    
    // Valores padrão (Whey/Creatina/Barra)
    let paramUnits = input.unitsPerBox || 0;
    let paramDoseOrVolume = input.dose || 0;
    let paramNutrient = input.protein || 0; // Por padrão é proteína

    // Caso 1: Bebida Proteica
    if (input.category === "bebida_proteica") {
      paramUnits = input.unitsPerPack || 0;          // Units = Fardo
      paramDoseOrVolume = input.volumePerUnitInMl || 0; // Dose = Volume ML
      paramNutrient = input.protein || 0;            // Nutrient = Proteína
    }

    // Caso 2: Pré-Treino
    if (input.category === "pre_treino") {
      paramUnits = 0;                                // Não usa unidades
      paramDoseOrVolume = input.dose || 0;           // Dose = Tamanho do Scoop (g)
      paramNutrient = input.caffeine || 0;           // ✅ Nutrient = Cafeína (mg)
    }

    // Montagem do Comando
    // A ordem dos argumentos aqui DEVE bater com o que seu script TS espera receber em process.argv
    const command = `npx tsx ${scriptPath} "${asinsJoined}" "${input.titlePattern}" "${input.category}" "${input.brand}" ${input.totalWeight || 0} ${paramUnits} ${paramDoseOrVolume} ${paramNutrient}`;

    logs.push(`🚀 [${input.category.toUpperCase()}] Iniciando processamento de lote (${asins.length} ASINs)...`);
    logs.push(`⚙️ Params: Peso=${input.totalWeight}, Units=${paramUnits}, Dose/Vol=${paramDoseOrVolume}, Prot/Caf=${paramNutrient}`);

    // 4. Execução única
    const { stdout, stderr } = await execAsync(command);

    if (stdout) {
      logs.push(...stdout.trim().split("\n"));
    }
    
    if (stderr) {
      // Filtrar warnings chatos do node se quiser, ou exibir tudo
      logs.push(`⚠️ Alertas do sistema: ${stderr.trim()}`);
    }

    // 5. Revalidação das rotas
    revalidatePath("/admin/whey");
    revalidatePath("/admin/creatina");
    revalidatePath("/admin/barra");
    revalidatePath("/admin/bebidaproteica");
    revalidatePath("/admin/pre-treino"); // ✅ Atualiza a nova página

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