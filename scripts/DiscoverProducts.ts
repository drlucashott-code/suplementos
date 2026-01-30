/**
 * DiscoverProducts v2.2
 * Filtro Nativo por Marca + Palavra-Chave + Paginação
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

async function run() {
  const brand = process.argv[2];
  const keyword = process.argv[3] || "barra de proteína";
  const maxPages = 10; 

  if (!brand) {
    console.log("❌ Uso: npx ts-node scripts/DiscoverProducts.ts \"Integralmedica\" \"barra\"");
    process.exit(1);
  }

  console.log(`🔍 Buscando produtos da marca [${brand}] com o termo "${keyword}"...`);
  let allAsins: string[] = [];

  for (let page = 1; page <= maxPages; page++) {
    console.log(`📄 Carregando página ${page}...`);

    try {
      const res = await paapi.SearchItems(commonParameters, {
        // Filtros combinados
        Keywords: keyword, 
        Brand: brand,       // <--- FILTRO NATIVO POR MARCA
        SearchIndex: "All",
        
        ItemCount: 10,
        ItemPage: page,
        Resources: ["ItemInfo.Title", "ItemInfo.ByLineInfo"], // Incluído ByLine para conferência
      });

      const items = res?.SearchResult?.Items || [];
      
      if (items.length === 0) {
        console.log("🏁 Fim dos resultados.");
        break;
      }

      items.forEach((item: any) => {
        const itemBrand = item.ItemInfo?.ByLineInfo?.Brand?.DisplayValue || "N/A";
        console.log(`   [${item.ASIN}] (${itemBrand}) ${item.ItemInfo.Title.DisplayValue.substring(0, 50)}...`);
        allAsins.push(item.ASIN);
      });

      // Delay de 1.5s para evitar Throttling (Erro 429)
      await new Promise(resolve => setTimeout(resolve, 1500));

    } catch (err: any) {
      if (err.message.includes("429")) {
        console.log("⚠️ Limite de requisições atingido. O script parou para segurança.");
      } else {
        console.error(`❌ Erro na página ${page}:`, err.message);
      }
      break;
    }
  }

  if (allAsins.length > 0) {
    // Garante que a lista final não tenha duplicatas
    const uniqueAsins = Array.from(new Set(allAsins));
    
    console.log("\n--- LISTA PARA O IMPORTADOR ---");
    console.log(uniqueAsins.join(", "));
    console.log(`\n✅ Total de ASINs únicos da ${brand}: ${uniqueAsins.length}`);
  }
}

run();