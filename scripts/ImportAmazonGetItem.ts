/**
 * ImportAmazonGetItem v2.0
 * - Ajuste: Removido Driver Adapter (Prisma 5.10.2 padrão)
 * - Funcionalidade: Importa ASINs via Amazon PA-API com suporte a Pré-Treino
 */

import "dotenv/config";
import paapi from "amazon-paapi";
import { PrismaClient } from "@prisma/client";

// ✅ CORREÇÃO: Inicialização padrão do Prisma
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
    "maracujá", "uva", "abacaxi", "melancia", "maçã verde", "blue ice", "guaraná"
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
  
  // Mapeamento dos argumentos vindos do actions.ts
  const [
    asinsRaw,       // 0: Lista de ASINs
    titlePattern,   // 1: Padrão de título
    category,       // 2: Categoria (whey, pre_treino, etc)
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
  
  // Conversão segura dos números
  const mUnits = Math.floor(Number(unitsInput)) || 0; 
  const mDoseOrVolume = Number(doseOrVolInput) || 0;
  
  // O campo 'nutrientInput' é polimórfico:
  // Para Whey/Bebida = Proteína (g)
  // Para Pré-Treino = Cafeína (mg)
  const mNutrient = Number(nutrientInput) || 0; 
  const mTotalWeight = Number(totalWeightInput) || 0;

  console.log(`🚀 [${category.toUpperCase()}] Iniciando lote de ${asinList.length} produtos...`);
  console.log(`ℹ️ Params: Peso=${mTotalWeight}, Dose=${mDoseOrVolume}, Nutriente=${mNutrient}`);

  for (const asin of asinList) {
    try {
      await delay(1500); // Evita rate limit da Amazon

      // 1. Busca na API da Amazon
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

      // 2. Verifica se oferta já existe
      const existingOffer = await prisma.offer.findFirst({
        where: { store: "AMAZON", externalId: asin }
      });

      if (existingOffer) {
        console.log(`   ⚠️ ASIN ${asin} já cadastrado. Pulando...`);
        continue;
      }

      // 3. Prepara dados básicos
      const amazonTitle = item.ItemInfo?.Title?.DisplayValue ?? "";
      const amazonBrand = item.ItemInfo?.ByLineInfo?.Brand?.DisplayValue ?? "Desconhecida";
      const finalBrand = brandInput || amazonBrand;
      const weight = mTotalWeight || extractWeight(amazonTitle);

      // Montagem do nome final
      let finalName = titlePattern
        .replace("{brand}", finalBrand)
        .replace("{weight}", weight ? `${weight}g` : "")
        .replace("{title}", amazonTitle);
      
      finalName = finalName.replace(/{.*?}/g, "").trim();

      // 4. Constrói objeto do Prisma
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const createData: any = {
        category,
        name: finalName,
        brand: finalBrand,
        flavor: extractFlavor(amazonTitle),
        imageUrl: item.Images?.Primary?.Large?.URL ?? "",
        offers: { 
          create: { 
            store: "AMAZON", 
            externalId: asin, 
            affiliateUrl: item.DetailPageURL ?? `https://www.amazon.com.br/dp/${asin}`, 
            price: 0 // Preço virá na próxima atualização ou via API se disponível
          } 
        }
      };

      // 5. Lógica Específica por Categoria
      if (category === "barra") {
        createData.proteinBarInfo = { 
          create: { 
            unitsPerBox: mUnits, 
            doseInGrams: mDoseOrVolume, 
            proteinPerDoseInGrams: mNutrient 
          } 
        };
      } 
      else if (category === "whey") {
        createData.wheyInfo = { 
          create: { 
            totalWeightInGrams: weight, 
            doseInGrams: mDoseOrVolume, 
            proteinPerDoseInGrams: mNutrient 
          } 
        };
      } 
      else if (category === "bebida_proteica") {
        createData.proteinDrinkInfo = { 
          create: { 
            unitsPerPack: mUnits,
            volumePerUnitInMl: mDoseOrVolume,
            proteinPerUnitInGrams: mNutrient 
          } 
        };
      }
      // ✅ NOVA LÓGICA: Pré-Treino
      else if (category === "pre_treino" || category === "pre-treino") {
        // Normaliza a categoria para o slug do banco (hífen)
        createData.category = "pre-treino"; 
        createData.preWorkoutInfo = {
            create: {
                totalWeightInGrams: weight,
                doseInGrams: mDoseOrVolume,      // Scoop
                caffeinePerDoseInMg: mNutrient   // Cafeína (passada no campo protein do CLI)
            }
        };
      }
      else if (category === "creatina") {
          createData.creatineInfo = {
              create: {
                  form: "POWDER",
                  totalUnits: weight,
                  unitsPerDose: mDoseOrVolume || 3 // Padrão 3g se não vier
              }
          }
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