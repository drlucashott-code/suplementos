/**
 * ImportAmazonGetItem v1.6
 * - Corrigido: Remoção de Resources inválidos (evita Bad Request)
 * - Suporte a Lote (Batch) com Delay de 1.5s
 */

import "dotenv/config";
import paapi from "amazon-paapi";
import { PrismaClient, Store } from "@prisma/client";

const prisma = new PrismaClient();
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

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

  if (!asinsRaw || !category) {
    console.error("❌ Erro: Argumentos insuficientes.");
    process.exit(1);
  }

  const asinList = asinsRaw.split(",").map(a => a.trim()).filter(Boolean);
  const mUnitsPerBox = Math.floor(Number(unitsBoxInput)) || 0;
  const mDose = Number(doseInput) || 0;
  const mProtein = Number(proteinInput) || 0;
  const mTotalWeight = Number(totalWeightInput) || 0;

  console.log(`🚀 [${category.toUpperCase()}] Iniciando lote simples de ${asinList.length} produtos...`);

  for (const asin of asinList) {
    try {
      await delay(1500); // Respiro anti-bloqueio

      // RECURSOS CORRIGIDOS: Removido DetailPageURL (causava Bad Request)
      const res = await paapi.GetItems(commonParameters, {
        ItemIds: [asin],
        Resources: [
          "ItemInfo.Title",
          "ItemInfo.ByLineInfo",
          "Images.Primary.Large"
        ],
      });

      const item = res?.ItemsResult?.Items?.[0];
      if (!item) {
        console.error(`❌ ASIN ${asin} não encontrado.`);
        continue;
      }

      const amazonTitle = item.ItemInfo?.Title?.DisplayValue ?? "";
      const amazonBrand = item.ItemInfo?.ByLineInfo?.Brand?.DisplayValue ?? "Desconhecida";
      const finalBrand = brandInput || amazonBrand;
      const weight = mTotalWeight || extractWeight(amazonTitle);

      const finalName = titlePattern
        .replace("{brand}", finalBrand)
        .replace("{weight}", weight ? `${weight}g` : "")
        .replace("{title}", amazonTitle);

      const exists = await prisma.offer.findFirst({ where: { store: Store.AMAZON, externalId: asin } });
      if (exists) {
        console.log(`⚠️ ${asin} já cadastrado.`);
        continue;
      }

      await prisma.product.create({
        data: {
          category,
          name: finalName,
          brand: finalBrand,
          flavor: extractFlavor(amazonTitle),
          imageUrl: item.Images?.Primary?.Large?.URL ?? "",
          
          ...(category === "barra" && {
            proteinBarInfo: { create: { unitsPerBox: mUnitsPerBox, doseInGrams: mDose, proteinPerDoseInGrams: mProtein } }
          }),
          ...(category === "whey" && {
            wheyInfo: { create: { totalWeightInGrams: weight, doseInGrams: mDose, proteinPerDoseInGrams: mProtein } }
          }),
          
          offers: { 
            create: { 
              store: Store.AMAZON, 
              externalId: asin, 
              affiliateUrl: item.DetailPageURL, // O link já vem aqui por padrão!
              price: 0 
            } 
          }
        },
      });

      console.log(`✅ Sucesso: ${asin}`);

    } catch (err: any) {
      console.error(`❌ Erro no ASIN ${asin}: ${err.message}`);
    }
  }
}

run().catch(console.error).finally(() => prisma.$disconnect());