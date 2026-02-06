/**
 * ImportAmazonGetVariation v1.8
 * - Memória de ParentASIN: Evita chamadas duplicadas para a mesma família
 * - Processamento em Lote: Recebe múltiplos ASINs de uma vez
 */

import "dotenv/config";
import paapi from "amazon-paapi";
import { PrismaClient, Store } from "@prisma/client"; // ✅ CreatineForm removido

const prisma = new PrismaClient();
const processedParents = new Set<string>(); // A nossa "Memória" da rodada

const commonParameters = {
  AccessKey: process.env.AMAZON_ACCESS_KEY!,
  SecretKey: process.env.AMAZON_SECRET_KEY!,
  PartnerTag: process.env.AMAZON_PARTNER_TAG!,
  PartnerType: "Associates",
  Marketplace: "www.amazon.com.br",
};

/* ======================= HELPERS ======================= */
function extractFlavor(text?: string): string | null {
  if (!text) return null;
  const flavors = ["chocolate", "baunilha", "morango", "cookies", "banana", "coco", "doce de leite", "neutro", "natural"];
  const n = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  for (const f of flavors) {
    if (n.includes(f)) return f.charAt(0).toUpperCase() + f.slice(1);
  }
  return null;
}

function extractWeight(text: string): number {
  const g = text.match(/(\d+)\s?g/i);
  return g ? parseInt(g[1], 10) : 0;
}

/* ======================= MAIN ======================= */
async function run() {
  const args = process.argv.slice(2);
  const [asinsRaw, titlePattern, category, brandInput, totalWeightInput, unitsBoxInput, doseInput, proteinInput] = args;

  const asinList = asinsRaw.split(",");
  const mUnitsPerBox = Math.floor(Number(unitsBoxInput)) || 0;
  const mDose = Number(doseInput) || 0;
  const mProtein = Number(proteinInput) || 0;

  for (const currentAsin of asinList) {
    try {
      console.log(`\n🔍 Analisando item: ${currentAsin}`);

      // 1. Descobrir quem é o pai
      const lookup = await paapi.GetItems(commonParameters, {
        ItemIds: [currentAsin],
        Resources: ["ParentASIN", "ItemInfo.ByLineInfo"]
      });

      const baseItem = lookup?.ItemsResult?.Items?.[0];
      if (!baseItem) {
        console.log(`❌ ASIN ${currentAsin} não encontrado.`);
        continue;
      }

      const parentAsin = baseItem.ParentASIN || currentAsin;

      // 2. CHECK DA MEMÓRIA: Se já processamos esse pai nesta rodada, pula!
      if (processedParents.has(parentAsin)) {
        console.log(`⏭️ Família ${parentAsin} já processada nesta rodada. Pulando para economizar API...`);
        continue;
      }

      console.log(`🔗 Nova Família Detectada: ${parentAsin}. Buscando variações...`);

      // 3. Buscar variações
      let itemsToProcess = [];
      try {
        const variations = await paapi.GetVariations(commonParameters, {
          ASIN: parentAsin,
          Resources: ["ItemInfo.Title", "ItemInfo.ByLineInfo", "Images.Primary.Large", "DetailPageURL"],
        });
        itemsToProcess = variations?.VariationsResult?.Items ?? [];
      } catch { // ✅ vErr removido pois não era usado
        console.log(`⚠️ GetVariations recusado. Usando apenas o item individual.`);
      }

      if (itemsToProcess.length === 0) itemsToProcess = [baseItem];

      // 4. Salvar no Banco
      for (const item of itemsToProcess) {
        const asin = item.ASIN;
        const title = item.ItemInfo?.Title?.DisplayValue ?? "";
        const brand = brandInput || item.ItemInfo?.ByLineInfo?.Brand?.DisplayValue || "Desconhecida";

        const exists = await prisma.offer.findFirst({ where: { store: Store.AMAZON, externalId: asin } });
        if (exists) continue;

        await prisma.product.create({
          data: {
            category,
            name: titlePattern.replace("{brand}", brand).replace("{weight}", (Number(totalWeightInput) || extractWeight(title)) + "g").replace("{title}", title),
            brand,
            flavor: extractFlavor(title),
            imageUrl: item.Images?.Primary?.Large?.URL ?? "",
            ...(category === "barra" && {
              proteinBarInfo: { create: { unitsPerBox: mUnitsPerBox, doseInGrams: mDose, proteinPerDoseInGrams: mProtein } }
            }),
            ...(category === "whey" && {
              wheyInfo: { create: { totalWeightInGrams: Number(totalWeightInput) || extractWeight(title), doseInGrams: mDose, proteinPerDoseInGrams: mProtein } }
            }),
            offers: { create: { store: Store.AMAZON, externalId: asin, affiliateUrl: item.DetailPageURL, price: 0 } }
          },
        });
        console.log(`   ✅ Criado: ${asin}`);
      }

      // 5. REGISTRAR NA MEMÓRIA: Marcamos este pai como concluído
      processedParents.add(parentAsin);

    } catch (err: unknown) { // ✅ Trocado de 'any' para 'unknown'
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.log(`❌ Erro no ASIN ${currentAsin}: ${errorMessage}`);
    }
  }
}

run().catch(console.error).finally(() => prisma.$disconnect());