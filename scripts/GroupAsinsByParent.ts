/**
 * GroupAsinsByParent
 * Ferramenta para organizar ASINs por família antes da importação.
 * Versão: 1.1 - Exibição de Nome Completo
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

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function run() {
  const asinsRaw = process.argv[2];
  if (!asinsRaw) return console.log("❌ Uso: npx ts-node scripts/GroupAsinsByParent.ts \"ASIN1,ASIN2...\"");

  const asinList = asinsRaw.split(",").map(a => a.trim()).filter(Boolean);
  const groups: Record<string, { title: string, children: string[] }> = {};

  console.log(`🔍 Analisando ${asinList.length} ASINs e agrupando por família...`);

  for (const asin of asinList) {
    try {
      // Respiro para evitar erro 429 (Too Many Requests)
      await delay(1200); 

      const res = await paapi.GetItems(commonParameters, {
        ItemIds: [asin],
        Resources: ["ParentASIN", "ItemInfo.Title"],
      });

      const item = res?.ItemsResult?.Items?.[0];
      if (!item) {
        console.log(`   ⚠️ ${asin} não encontrado.`);
        continue;
      }

      // Se não tiver pai (ParentASIN), o produto é o próprio mestre da família
      const parentAsin = item.ParentASIN || asin; 
      
      // Captura o título completo sem truncar (removido o substring)
      const title = item.ItemInfo?.Title?.DisplayValue;

      if (!groups[parentAsin]) {
        groups[parentAsin] = { title: title || "Sem Título", children: [] };
      }

      groups[parentAsin].children.push(asin);
      console.log(`   📌 ${asin} -> Pertence à família ${parentAsin}`);

    } catch (err: any) {
      console.error(`   ❌ Erro no ${asin}: ${err.message}`);
    }
  }

  // EXIBIÇÃO DO RESULTADO FINAL
  console.log("\n" + "=".repeat(80));
  console.log("📂 GRUPOS ORGANIZADOS POR FAMÍLIA (PAI)");
  console.log("=".repeat(80));

  Object.entries(groups).forEach(([parent, data]) => {
    console.log(`\n📦 FAMÍLIA: ${data.title}`);
    console.log(`🔑 ParentASIN: ${parent}`);
    console.log(`🔗 Lista de Filhos (${data.children.length} itens):`);
    console.log(data.children.join(", "));
    console.log("-".repeat(40));
  });

  console.log("\n💡 Dica de Ouro:");
  console.log("1. Copie a 'Lista de Filhos' de um grupo.");
  console.log("2. Cole no seu Importador Universal.");
  console.log("3. Configure os dados nutricionais e clique em 'Importar'.");
  console.log("4. Repita para o próximo grupo.");
}

run();