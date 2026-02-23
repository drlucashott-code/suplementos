/**
 * DiscoverProducts v3.0
 * Filtro Nativo por Marca + Múltiplas Palavras-Chave Independentes + Paginação
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

// Interface mínima para satisfazer o TypeScript no loop de itens
interface AmazonItem {
  ASIN: string;
  ItemInfo: {
    Title: {
      DisplayValue: string;
    };
  };
}

async function run() {
  const brand = process.argv[2];
  // Aceita palavras separadas por vírgula. Ex: "barra, whey, creatina"
  const rawKeywords = process.argv[3] || "barra de proteína";
  
  // Transforma a string em array e limpa espaços extras
  const keywordsList = rawKeywords.split(",").map(k => k.trim());
  
  const maxPages = 10; // Reduzi para 5 por palavra para não estourar o limite rápido, ajuste se necessário.

  if (!brand) {
    console.log("❌ Uso: npx ts-node scripts/DiscoverProducts.ts \"Integralmedica\" \"barra, whey\"");
    process.exit(1);
  }

  // Set global para evitar duplicatas entre palavras-chave diferentes
  const globalAsins = new Set<string>();

  console.log(`🚀 Iniciando busca para a marca [${brand}]`);
  console.log(`📋 Palavras-chave: ${keywordsList.join(" | ")}\n`);

  // --- LOOP EXTERNO: Itera sobre cada palavra-chave ---
  for (const currentKeyword of keywordsList) {
    console.log(`\n🔍 --- Buscando termo: "${currentKeyword}" ---`);
    
    let foundForThisKeyword = 0;

    // --- LOOP INTERNO: Paginação ---
    for (let page = 1; page <= maxPages; page++) {
      console.log(`   📄 Pág ${page} (${currentKeyword})...`);

      try {
        const res = await paapi.SearchItems(commonParameters, {
          Keywords: currentKeyword, // Usa a palavra da vez
          Brand: brand,
          SearchIndex: "All",
          ItemCount: 10,
          ItemPage: page,
          Resources: ["ItemInfo.Title", "ItemInfo.ByLineInfo"],
        });

        const items = res?.SearchResult?.Items || [];
        
        if (items.length === 0) {
          console.log("      🏁 Sem mais resultados para este termo.");
          break;
        }

        items.forEach((item: AmazonItem) => {
          // Só loga no console para visualização, a limpeza final é no fim do script
          console.log(`      [${item.ASIN}] ${item.ItemInfo.Title.DisplayValue.substring(0, 40)}...`);
          
          globalAsins.add(item.ASIN); // Adiciona ao Set global (o Set já ignora duplicatas automaticamente)
          foundForThisKeyword++;
        });

        // Delay de segurança entre páginas
        await new Promise(resolve => setTimeout(resolve, 1500));

      } catch (err: unknown) {
        const errorMessage = (err as Error).message;
        if (errorMessage.includes("429")) {
          console.log("⚠️ Limite de requisições (429). Aguardando 5s antes de continuar...");
          await new Promise(resolve => setTimeout(resolve, 5000));
        } else {
          console.error(`❌ Erro na página ${page}:`, errorMessage);
          break; // Sai do loop de páginas se der erro grave, mas tenta a próxima palavra-chave
        }
      }
    }
    console.log(`   ✅ Termo "${currentKeyword}" finalizado. Encontrados: ${foundForThisKeyword}`);
    
    // Delay extra entre mudança de palavras-chave para ser gentil com a API
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  // --- FINALIZAÇÃO ---
  const uniqueAsins = Array.from(globalAsins);

  if (uniqueAsins.length > 0) {
    console.log("\n===========================================");
    console.log("🏁 LISTA CONSOLIDADA PARA O IMPORTADOR");
    console.log("===========================================");
    console.log(uniqueAsins.join(", "));
    console.log(`\n📦 Total de ASINs únicos coletados: ${uniqueAsins.length}`);
  } else {
    console.log("\n❌ Nenhum produto encontrado para os termos informados.");
  }
}

run();