/**
 * ExpandVariations v2.3 - Deep Scan & Fail-Safe
 * - Correção: Se houver erro na API, o ASIN é preservado na lista final.
 * - Correção: Standalone (sem pai) não é filtrado.
 * - Correção: Paginação infinita até 10 páginas (100 itens).
 */

import "dotenv/config";
import paapi from "amazon-paapi";

const commonParameters = {
  AccessKey: process.env.AMAZON_ACCESS_KEY!,
  SecretKey: process.env.AMAZON_SECRET_KEY!,
  PartnerTag: process.env.AMAZON_PARTNER_TAG!,
  PartnerType: "Associates",
  Marketplace: "www.amazon.com.br",
};

// Interface para evitar o uso de 'any' no loop
interface AmazonVariationItem {
  ASIN: string;
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const processedParents = new Set<string>();
const finalChildAsins = new Set<string>();

async function run() {
  const asinsRaw = process.argv[2];
  if (!asinsRaw) {
    console.log("❌ Uso: npx ts-node scripts/ExpandVariations.ts \"ASIN1,ASIN2...\"");
    return;
  }

  const asinList = asinsRaw.split(",").map(a => a.trim()).filter(Boolean);
  console.log(`🚀 Iniciando expansão de ${asinList.length} ASINs base (Modo Fail-Safe)...`);

  for (const currentAsin of asinList) {
    try {
      console.log(`\n🔍 Analisando: ${currentAsin}`);
      await delay(1500); // Respiro obrigatório

      // 1. Descobrir se tem Pai
      const lookup = await paapi.GetItems(commonParameters, {
        ItemIds: [currentAsin],
        Resources: ["ParentASIN"]
      });

      const baseItem = lookup?.ItemsResult?.Items?.[0];
      if (!baseItem) {
        console.log(`   ⚠️ ASIN não encontrado na Amazon. Mantendo original na lista.`);
        finalChildAsins.add(currentAsin);
        continue;
      }

      const actualParent = baseItem.ParentASIN; 
      const parentAsin = actualParent || currentAsin;

      // 2. Check de Memória
      if (processedParents.has(parentAsin)) {
        console.log(`   ⏭️ Família ${parentAsin} já processada. Pulando...`);
        continue;
      }

      console.log(`   🔗 Identificado: ${actualParent ? "Faz parte de família" : "Item Standalone"}`);

      let currentPage = 1;
      let hasMorePages = true;
      let foundAnyVariation = false;

      // 3. Loop de Variações
      while (hasMorePages && currentPage <= 10) {
        if (currentPage > 1) await delay(1500);

        const variations = await paapi.GetVariations(commonParameters, {
          ASIN: parentAsin,
          Resources: ["ItemInfo.Title"],
          VariationPage: currentPage,
        });

        const children = variations?.VariationsResult?.Items || [];
        
        if (children.length > 0) {
          foundAnyVariation = true;
          console.log(`     📄 Página ${currentPage}: +${children.length} variações.`);
          
          children.forEach((c: AmazonVariationItem) => {
            // Filtra o Parent apenas se ele for um container (actualParent definido)
            if (c.ASIN !== actualParent) {
              finalChildAsins.add(c.ASIN);
            }
          });

          hasMorePages = children.length === 10;
          currentPage++;
        } else {
          hasMorePages = false;
        }
      }

      // Fallback: Se não achou nada, o próprio ASIN é a variação única
      if (!foundAnyVariation) {
        console.log(`   ℹ️ Nenhuma variação externa encontrada. Adicionando item original.`);
        finalChildAsins.add(currentAsin);
      }

      processedParents.add(parentAsin);

    } catch (err: unknown) {
      // CORREÇÃO: Tipagem segura de erro
      const errorMessage = err instanceof Error ? err.message : String(err);

      console.error(`   ❌ ERRO no ASIN ${currentAsin}: ${errorMessage}`);
      console.log(`   🛡️ Fail-Safe: Adicionando ${currentAsin} à lista final para garantir.`);
      finalChildAsins.add(currentAsin);
    }
  }

  // RESULTADO FINAL
  console.log("\n" + "=".repeat(60));
  console.log("🏆 EXPANSÃO FINALIZADA");
  console.log(`Total de ASINs para importação: ${finalChildAsins.size}`);
  console.log("=".repeat(60));
  
  console.log("\n📋 COPIE ESTA LISTA:");
  console.log(Array.from(finalChildAsins).join(", "));
  console.log("=".repeat(60));
}

run();