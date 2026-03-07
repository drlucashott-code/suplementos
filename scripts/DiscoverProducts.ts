/**
 * DiscoverProducts v4.2 - ESLint Clean Version
 * Fix "Bad Request" e Remoção de 'any' para conformidade com o TS rigoroso
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

interface AmazonItem {
  ASIN: string;
  ItemInfo: {
    Title: {
      DisplayValue: string;
    };
  };
}

// 🚀 Faixas otimizadas: min 1 evita o "Bad Request" da Amazon (preço zero não é aceito)
const priceRanges = [
  { min: 1, max: 15, label: "Super Econômico" },
  { min: 16, max: 40, label: "Econômico" },
  { min: 41, max: 80, label: "Intermediário" },
  { min: 81, max: 200, label: "Premium" },
  { min: 201, max: 2000, label: "Fardos/Kits" }
];

async function run() {
  const rawBrands = process.argv[2];
  const rawKeywords = process.argv[3] || "creme dental";
  
  const keywordsList = rawKeywords.split(",").map(k => k.trim());
  const brandsList = rawBrands ? rawBrands.split(",").map(b => b.trim()) : [];
  
  const maxPages = 10; 

  if (!rawBrands) {
    console.log("❌ Uso: npx ts-node scripts/DiscoverProducts.ts \"Colgate\" \"creme dental, escova\"");
    process.exit(1);
  }

  const globalAsins = new Set<string>();

  console.log(`🚀 Iniciando Escavação Profunda para [${brandsList.join(" | ")}]`);
  console.log(`📋 Termos: ${keywordsList.join(" | ")}`);
  console.log(`💰 Fatiamento: ${priceRanges.length} faixas de preço\n`);

  for (const brand of brandsList) {
    for (const currentKeyword of keywordsList) {
      console.log(`\n🔍 --- Buscando: "${currentKeyword}" de "${brand}" ---`);

      for (const range of priceRanges) {
        console.log(`  💸 Faixa: R$${range.min} - R$${range.max} (${range.label})`);
        
        let foundInThisRange = 0;

        for (let page = 1; page <= maxPages; page++) {
          console.log(`    📄 Pág ${page}...`);

          try {
            const res = await paapi.SearchItems(commonParameters, {
              Keywords: currentKeyword,
              Brand: brand,
              MinPrice: range.min * 100, 
              MaxPrice: range.max * 100,
              SearchIndex: "All",
              ItemCount: 10,
              ItemPage: page,
              Resources: ["ItemInfo.Title", "ItemInfo.ByLineInfo"],
            });

            const items = res?.SearchResult?.Items || [];
            
            if (items.length === 0) {
              console.log("      🏁 Fim da faixa.");
              break;
            }

            items.forEach((item: AmazonItem) => {
              if (!globalAsins.has(item.ASIN)) {
                console.log(`      [NEW] [${item.ASIN}] ${item.ItemInfo.Title.DisplayValue.substring(0, 35)}...`);
                globalAsins.add(item.ASIN);
                foundInThisRange++;
              }
            });

            await new Promise(resolve => setTimeout(resolve, 2000));

          } catch (err: unknown) {
            // 🚀 CORREÇÃO ESLINT: Tipagem de erro segura sem 'any'
            const error = err as { message?: string; ErrorData?: unknown };
            const msg = error.message || "Erro desconhecido";

            if (msg.includes("429")) {
              console.log("⚠️ 429 - Limite de requisições. Pausando 10s...");
              await new Promise(resolve => setTimeout(resolve, 10000));
              page--; 
            } else if (msg.includes("400") || msg.includes("Bad Request")) {
              console.log("      🏁 Limite de páginas ou erro de parâmetro.");
              break;
            } else {
              console.error(`❌ Erro:`, msg);
              break; 
            }
          }
        }
        console.log(`    ✅ +${foundInThisRange} novos itens.`);
      }
    }
  }

  const uniqueAsins = Array.from(globalAsins);
  if (uniqueAsins.length > 0) {
    console.log("\n===========================================");
    console.log("🏁 LISTA CONSOLIDADA");
    console.log(uniqueAsins.join(", "));
    console.log(`\n📦 Total de ASINs únicos: ${uniqueAsins.length}`);
  } else {
    console.log("\n❌ Nenhum produto encontrado.");
  }
}

run();