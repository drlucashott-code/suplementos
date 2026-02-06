/**
 * ImportAmazonGetItem v1.9
 * - Correção: Inicialização com Adapter (pg) para compatibilidade com Vercel/Neon/Driver Adapters
 */

import "dotenv/config";
import paapi from "amazon-paapi";
import { PrismaClient, Store } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

// ✅ CORREÇÃO CRÍTICA: Configuração do Adapter
// Se o seu projeto usa Driver Adapters, o Prisma exige que passemos o adapter explicitamente no script.
const connectionString = process.env.DATABASE_URL;

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

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
  const flavors = ["chocolate", "baunilha", "morango", "cookies", "banana", "coco", "doce de leite", "neutro", "natural", "frutas vermelhas", "limão", "maracujá", "uva", "abacaxi"];
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
  
  const [
    asinsRaw, 
    titlePattern, 
    category, 
    brandInput, 
    totalWeightInput, 
    unitsInput, 
    doseOrVolInput, 
    proteinInput
  ] = args;

  if (!asinsRaw || !category) {
    console.error("❌ Erro: Argumentos insuficientes.");
    process.exit(1);
  }

  const asinList = asinsRaw.split(",").map(a => a.trim()).filter(Boolean);
  
  const mUnits = Math.floor(Number(unitsInput)) || 0; 
  const mDoseOrVolume = Number(doseOrVolInput) || 0;
  const mProtein = Number(proteinInput) || 0;
  const mTotalWeight = Number(totalWeightInput) || 0;

  console.log(`🚀 [${category.toUpperCase()}] Iniciando lote simples de ${asinList.length} produtos...`);

  for (const asin of asinList) {
    try {
      await delay(1500); 

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
        console.error(`❌ ASIN ${asin} não encontrado na API.`);
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
            proteinBarInfo: { 
              create: { 
                unitsPerBox: mUnits, 
                doseInGrams: mDoseOrVolume, 
                proteinPerDoseInGrams: mProtein 
              } 
            }
          }),
          
          ...(category === "whey" && {
            wheyInfo: { 
              create: { 
                totalWeightInGrams: weight, 
                doseInGrams: mDoseOrVolume, 
                proteinPerDoseInGrams: mProtein 
              } 
            }
          }),

          ...(category === "bebida_proteica" && {
            proteinDrinkInfo: { 
              create: { 
                unitsPerPack: mUnits,
                volumePerUnitInMl: mDoseOrVolume,
                proteinPerUnitInGrams: mProtein 
              } 
            }
          }),
          
          offers: { 
            create: { 
              store: Store.AMAZON, 
              externalId: asin, 
              affiliateUrl: item.DetailPageURL ?? "", 
              price: 0 
            } 
          }
        },
      });

      console.log(`✅ Sucesso: ${asin} | ${finalName.substring(0, 30)}...`);

    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`❌ Erro no ASIN ${asin}: ${msg}`);
    }
  }
}

run()
  .catch((err) => {
    console.error("Erro fatal:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());