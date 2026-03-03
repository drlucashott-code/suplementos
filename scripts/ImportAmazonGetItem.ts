/**
 * ImportAmazonGetItem v2.1
 * - Suporte Adicionado: Café Funcional (Supercoffee)
 * - Funcionalidade: Importa ASINs via Amazon PA-API
 */

import "dotenv/config";
import paapi from "amazon-paapi";
import { PrismaClient } from "@prisma/client";

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
  const flavors = [
    "chocolate", "baunilha", "morango", "cookies", "banana", "coco", 
    "doce de leite", "neutro", "natural", "frutas vermelhas", "limão", 
    "maracujá", "uva", "abacaxi", "melancia", "maçã verde", "blue ice", "guaraná",
    "beijinho", "original", "caramelo", "avelã"
  ];
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
    asinsRaw,       // 0: Lista de ASINs
    titlePattern,   // 1: Padrão de título
    category,       // 2: Categoria (whey, pre_treino, cafe_funcional)
    brandInput,     // 3: Marca
    totalWeightInput, // 4: Peso Total
    unitsInput,     // 5: Unidades (Fardo/Caixa)
    doseOrVolInput, // 6: Dose (g) ou Volume (ml)
    nutrientInput   // 7: Proteína (g) ou Cafeína (mg)
  ] = args;

  if (!asinsRaw || !category) {
    console.error("❌ Erro: Argumentos insuficientes.");
    process.exit(1);
  }

  const asinList = asinsRaw.split(",").map(a => a.trim()).filter(Boolean);
  
  const mUnits = Math.floor(Number(unitsInput)) || 0; 
  const mDoseOrVolume = Number(doseOrVolInput) || 0;
  const mNutrient = Number(nutrientInput) || 0; 
  const mTotalWeight = Number(totalWeightInput) || 0;

  console.log(`🚀 [${category.toUpperCase()}] Iniciando lote de ${asinList.length} produtos...`);

  for (const asin of asinList) {
    try {
      await delay(1500); 

      const res = await paapi.GetItems(commonParameters, {
        ItemIds: [asin],
        Resources: [
          "ItemInfo.Title",
          "ItemInfo.ByLineInfo",
          "Images.Primary.Large",
          "ItemInfo.ProductInfo"
        ],
      });

      const item = res?.ItemsResult?.Items?.[0];
      if (!item) {
        console.error(`   ❌ ASIN ${asin} não encontrado na API.`);
        continue;
      }

      const existingOffer = await prisma.offer.findFirst({
        where: { store: "AMAZON", externalId: asin }
      });

      if (existingOffer) {
        console.log(`   ⚠️ ASIN ${asin} já cadastrado. Pulando...`);
        continue;
      }

      const amazonTitle = item.ItemInfo?.Title?.DisplayValue ?? "";
      const amazonBrand = item.ItemInfo?.ByLineInfo?.Brand?.DisplayValue ?? "Desconhecida";
      const finalBrand = brandInput || amazonBrand;
      const weight = mTotalWeight || extractWeight(amazonTitle);

      let finalName = titlePattern
        .replace("{brand}", finalBrand)
        .replace("{weight}", weight ? `${weight}g` : "")
        .replace("{title}", amazonTitle);
      
      finalName = finalName.replace(/{.*?}/g, "").trim();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const createData: any = {
        category, // Será normalizado abaixo se necessário
        name: finalName,
        brand: finalBrand,
        flavor: extractFlavor(amazonTitle),
        imageUrl: item.Images?.Primary?.Large?.URL ?? "",
        offers: { 
          create: { 
            store: "AMAZON", 
            externalId: asin, 
            affiliateUrl: item.DetailPageURL ?? `https://www.amazon.com.br/dp/${asin}`, 
            price: 0 
          } 
        }
      };

      /* ================= LÓGICA POR CATEGORIA ================= */
      
      if (category === "barra") {
        createData.proteinBarInfo = { 
          create: { unitsPerBox: mUnits, doseInGrams: mDoseOrVolume, proteinPerDoseInGrams: mNutrient } 
        };
      } 
      else if (category === "whey") {
        createData.wheyInfo = { 
          create: { totalWeightInGrams: weight, doseInGrams: mDoseOrVolume, proteinPerDoseInGrams: mNutrient } 
        };
      } 
      else if (category === "bebida_proteica" || category === "bebida-proteica") {
        createData.category = "bebida-proteica"; // Normaliza hífen
        createData.proteinDrinkInfo = { 
          create: { unitsPerPack: mUnits, volumePerUnitInMl: mDoseOrVolume, proteinPerUnitInGrams: mNutrient } 
        };
      }
      else if (category === "pre_treino" || category === "pre-treino") {
        createData.category = "pre-treino"; // Normaliza hífen
        createData.preWorkoutInfo = {
          create: { totalWeightInGrams: weight, doseInGrams: mDoseOrVolume, caffeinePerDoseInMg: mNutrient }
        };
      }
      // ✅ NOVA LÓGICA: Café Funcional (Supercoffee)
      else if (category === "cafe_funcional" || category === "cafe-funcional") {
        createData.category = "cafe-funcional"; // Normaliza hífen para bater com o site/admin
        createData.functionalCoffeeInfo = {
          create: {
            totalWeightInGrams: weight,
            doseInGrams: mDoseOrVolume,
            caffeinePerDoseInMg: mNutrient
          }
        };
      }
      else if (category === "creatina") {
          createData.creatineInfo = {
            create: { form: "POWDER", totalUnits: weight, unitsPerDose: mDoseOrVolume || 3 }
          };
      }

      await prisma.product.create({ data: createData });
      console.log(`   ✅ Sucesso: ${asin} | ${finalName.substring(0, 40)}...`);

    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`   ❌ Erro no ASIN ${asin}: ${msg}`);
    }
  }
}

run()
  .catch((err) => {
    console.error("Erro fatal:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });