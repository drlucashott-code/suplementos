/**
 * ImportAmazonGetItem v2.0
 * - Ajuste: Removido Driver Adapter (Prisma 5.10.2 padrão)
 * - Funcionalidade: Importa ASINs específicos com dados manuais passados via CLI
 */

import "dotenv/config";
import paapi from "amazon-paapi";
import { PrismaClient, Store } from "@prisma/client";

// ✅ CORREÇÃO: Inicialização padrão do Prisma (sem Adapter complexo)
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
    asinsRaw, // Lista de ASINs (ex: "B00..., B01...")
    titlePattern, // Padrão de título (ex: "{brand} Whey {weight}")
    category, // Categoria do banco (whey, barra, bebida_proteica)
    brandInput, // Marca forçada (opcional)
    totalWeightInput, // Peso total (opcional)
    unitsInput, // Unidades (opcional)
    doseOrVolInput, // Dose ou Volume (opcional)
    proteinInput // Proteína (opcional)
  ] = args;

  if (!asinsRaw || !category) {
    console.error("❌ Erro: Argumentos insuficientes. Uso: npx ts-node scripts/ImportAmazonGetItem.ts ...");
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
        console.error(`   ❌ ASIN ${asin} não encontrado na API.`);
        continue;
      }

      // Verificação de existência prévia no banco
      const existingOffer = await prisma.offer.findFirst({
        where: { store: Store.AMAZON, externalId: asin }
      });

      if (existingOffer) {
        console.log(`   ⚠️ ASIN ${asin} já cadastrado no banco. Pulando...`);
        continue;
      }

      const amazonTitle = item.ItemInfo?.Title?.DisplayValue ?? "";
      const amazonBrand = item.ItemInfo?.ByLineInfo?.Brand?.DisplayValue ?? "Desconhecida";
      const finalBrand = brandInput || amazonBrand;
      const weight = mTotalWeight || extractWeight(amazonTitle);

      // Montagem do nome final
      let finalName = titlePattern
        .replace("{brand}", finalBrand)
        .replace("{weight}", weight ? `${weight}g` : "")
        .replace("{title}", amazonTitle);
      
      // Limpeza básica de template tags não usadas
      finalName = finalName.replace(/{.*?}/g, "").trim();

      // Construção dinâmica do objeto de criação
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const createData: any = {
        category,
        name: finalName,
        brand: finalBrand,
        flavor: extractFlavor(amazonTitle),
        imageUrl: item.Images?.Primary?.Large?.URL ?? "",
        offers: { 
          create: { 
            store: Store.AMAZON, 
            externalId: asin, 
            affiliateUrl: item.DetailPageURL ?? `https://www.amazon.com.br/dp/${asin}`, 
            price: 0 
          } 
        }
      };

      // Adiciona dados específicos por categoria
      if (category === "barra") {
        createData.proteinBarInfo = { 
          create: { 
            unitsPerBox: mUnits, 
            doseInGrams: mDoseOrVolume, 
            proteinPerDoseInGrams: mProtein 
          } 
        };
      } else if (category === "whey") {
        createData.wheyInfo = { 
          create: { 
            totalWeightInGrams: weight, 
            doseInGrams: mDoseOrVolume, 
            proteinPerDoseInGrams: mProtein 
          } 
        };
      } else if (category === "bebida_proteica") {
        createData.proteinDrinkInfo = { 
          create: { 
            unitsPerPack: mUnits,
            volumePerUnitInMl: mDoseOrVolume,
            proteinPerUnitInGrams: mProtein 
          } 
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