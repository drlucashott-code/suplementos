/**
 * DiscoverAndExpand v1.0 (Unified)
 * * FASE 1: Busca produtos por Múltiplas Marcas + Múltiplas Palavras-chave.
 * FASE 2: Expande automaticamente as variações (sabores, tamanhos) de tudo que encontrou.
 */

import "dotenv/config";
import paapi from "amazon-paapi";

// --- CONFIGURAÇÃO ---
const commonParameters = {
  AccessKey: process.env.AMAZON_ACCESS_KEY!,
  SecretKey: process.env.AMAZON_SECRET_KEY!,
  PartnerTag: process.env.AMAZON_PARTNER_TAG!,
  PartnerType: "Associates",
  Marketplace: "www.amazon.com.br",
};

const MAX_PAGES_SEARCH = 10; // Páginas de busca por termo
const MAX_PAGES_VARIATIONS = 10; // Páginas de variação por família

// --- UTILITÁRIOS ---
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// --- INTERFACES ---
interface AmazonSearchItem {
  ASIN: string;
  ItemInfo: {
    Title: { DisplayValue: string; };
  };
}

interface AmazonVariationItem {
  ASIN: string;
}

// ==========================================
// FUNÇÃO PRINCIPAL
// ==========================================
async function run() {
  // 1. Leitura de Argumentos
  const rawBrands = process.argv[2];
  const rawKeywords = process.argv[3];

  if (!rawBrands || !rawKeywords) {
    console.log("❌ Uso incorreto.");
    console.log("👉 Exemplo: npx ts-node scripts/UnifiedScript.ts \"Integralmedica, Max Titanium\" \"whey, creatina\"");
    process.exit(1);
  }

  // Tratamento de inputs (Separar por vírgula e limpar espaços)
  const brandsList = rawBrands.split(",").map(b => b.trim()).filter(Boolean);
  const keywordsList = rawKeywords.split(",").map(k => k.trim()).filter(Boolean);

  // Sets para armazenar resultados únicos
  const seedAsins = new Set<string>(); // Resultados da busca
  const finalAsins = new Set<string>(); // Resultados finais expandidos
  const processedParents = new Set<string>(); // Controle de famílias processadas

  console.log("===========================================");
  console.log("🚀 INICIANDO SCRIPT UNIFICADO");
  console.log(`🏭 Marcas: [${brandsList.join(" | ")}]`);
  console.log(`🔑 Keywords: [${keywordsList.join(" | ")}]`);
  console.log("===========================================\n");

  // ########################################################################
  // FASE 1: DESCOBERTA (SEARCH)
  // ########################################################################
  console.log("🔎 --- FASE 1: BUSCA DE PRODUTOS ---");

  for (const currentBrand of brandsList) {
    console.log(`\n🏭 Focando na marca: [${currentBrand}]`);

    for (const currentKeyword of keywordsList) {
      console.log(`   🔑 Termo: "${currentKeyword}"`);
      let foundCount = 0;

      for (let page = 1; page <= MAX_PAGES_SEARCH; page++) {
        try {
          // Busca na API
          const res = await paapi.SearchItems(commonParameters, {
            Keywords: currentKeyword,
            Brand: currentBrand,
            SearchIndex: "All",
            ItemCount: 10,
            ItemPage: page,
            Resources: ["ItemInfo.Title"],
          });

          const items = res?.SearchResult?.Items || [];

          if (items.length === 0) break; // Acabou os resultados para esse termo

          items.forEach((item: AmazonSearchItem) => {
            if (!seedAsins.has(item.ASIN)) {
              console.log(`      Found: [${item.ASIN}] ${item.ItemInfo.Title.DisplayValue.substring(0, 30)}...`);
              seedAsins.add(item.ASIN);
              foundCount++;
            }
          });

          // Delay entre páginas de busca
          await delay(1500);

        } catch (err: unknown) {
          const msg = (err as Error).message;
          if (msg.includes("429")) {
            console.log("      ⚠️ 429 Too Many Requests - Pausando 5s...");
            await delay(5000);
            page--; // Tenta a mesma página de novo
          } else {
            console.log(`      ❌ Erro busca pág ${page}: ${msg}`);
            break; 
          }
        }
      }
      console.log(`   ✅ Fim do termo. Total acumulado até agora: ${seedAsins.size} ASINs.`);
      await delay(1000); // Delay entre keywords
    }
  }

  if (seedAsins.size === 0) {
    console.log("\n❌ Nenhum produto encontrado na Fase 1. Encerrando.");
    return;
  }

  // ########################################################################
  // FASE 2: EXPANSÃO (VARIATIONS)
  // ########################################################################
  console.log("\n===========================================");
  console.log(`🧬 --- FASE 2: EXPANSÃO DE VARIAÇÕES ---`);
  console.log(`📦 Processando ${seedAsins.size} ASINs encontrados na busca...`);
  console.log("===========================================\n");

  const seedsArray = Array.from(seedAsins);

  for (let i = 0; i < seedsArray.length; i++) {
    const currentAsin = seedsArray[i];
    console.log(`[${i + 1}/${seedsArray.length}] Analisando: ${currentAsin}`);

    try {
      await delay(1500); // Delay obrigatório para não estourar API

      // 1. Descobrir se tem Pai
      const lookup = await paapi.GetItems(commonParameters, {
        ItemIds: [currentAsin],
        Resources: ["ParentASIN"]
      });

      const baseItem = lookup?.ItemsResult?.Items?.[0];
      
      // Se o item não existe mais, pula (ou mantém o original se preferir ser conservador)
      if (!baseItem) {
        console.log(`   ⚠️ ASIN não retornado pela API. Mantendo original.`);
        finalAsins.add(currentAsin);
        continue;
      }

      const parentAsin = baseItem.ParentASIN || currentAsin;

      // 2. Se já processamos esse Pai, ignoramos (pois já pegamos todos os filhos antes)
      if (processedParents.has(parentAsin)) {
        console.log(`   ⏭️ Família ${parentAsin} já processada. Pulando...`);
        continue;
      }

      // 3. Buscar Variações
      let vPage = 1;
      let hasMoreV = true;
      let foundAnyVariation = false;
      const isFamily = !!baseItem.ParentASIN;

      console.log(`   🔗 Tipo: ${isFamily ? `Família (Pai: ${parentAsin})` : "Standalone"}`);

      while (hasMoreV && vPage <= MAX_PAGES_VARIATIONS) {
        if (vPage > 1) await delay(1500);

        const vRes = await paapi.GetVariations(commonParameters, {
          ASIN: parentAsin,
          Resources: ["ItemInfo.Title"],
          VariationPage: vPage
        });

        const children = vRes?.VariationsResult?.Items || [];

        if (children.length > 0) {
          foundAnyVariation = true;
          console.log(`      📄 Pág Variação ${vPage}: +${children.length} itens.`);
          
          children.forEach((c: AmazonVariationItem) => {
             // Adiciona tudo (exceto o próprio Pai se ele vier na lista e for um container abstrato)
             if (c.ASIN !== parentAsin) {
                finalAsins.add(c.ASIN);
             }
          });

          hasMoreV = children.length === 10; // Se vier 10, provavelmente tem mais
          vPage++;
        } else {
          hasMoreV = false;
        }
      }

      // Se não achou variações (ou deu erro na busca de variações mas o item existe), salva o item original
      if (!foundAnyVariation) {
        console.log(`   ℹ️ Sem variações extras. Salvando item original.`);
        finalAsins.add(currentAsin);
      }

      // Marca família como processada
      processedParents.add(parentAsin);

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`   ❌ ERRO ao expandir ${currentAsin}: ${msg}`);
      console.log(`   🛡️ Fail-Safe: Adicionando ${currentAsin} à lista final para garantir.`);
      finalAsins.add(currentAsin);
    }
  }

  // ########################################################################
  // RESULTADO FINAL
  // ########################################################################
  console.log("\n" + "=".repeat(60));
  console.log("🏆 LISTA FINAL CONSOLIDADA");
  console.log(`Total de ASINs Únicos: ${finalAsins.size}`);
  console.log("=".repeat(60));
  
  const finalArray = Array.from(finalAsins);
  console.log(finalArray.join(", "));
  
  console.log("\n📦 Copie a lista acima para o seu importador.");
}

run();