/**
 * ImportAmazonGetItem v2.2.0 - Edição Resiliência Máxima
 * - Fix: PrismaClientInitializationError (Contorno total ao Hoisting do ESM)
 * - Lógica: O Prisma só é carregado após a validação manual do DATABASE_URL
 */

import path from "path";
import dotenv from "dotenv";

// 1️⃣ Localiza o .env na raiz, independente de onde o script seja chamado
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

import paapi from "amazon-paapi";

// ⚠️ NÃO importe o PrismaClient aqui no topo! 
// Isso evita que ele tente validar a URL antes do dotenv rodar.

async function run(): Promise<void> {
  // 2️⃣ Verificação de sanidade (Combustível no tanque)
  if (!process.env.DATABASE_URL) {
    console.error("❌ ERRO: DATABASE_URL não encontrada no ambiente.");
    console.error("Verifique se o arquivo .env está na raiz do projeto e sem aspas.");
    process.exit(1);
  }

  // 3️⃣ Carga Dinâmica: O Prisma só nasce agora, com o ambiente garantido.
  const { PrismaClient, Store } = await import("@prisma/client");
  const prisma = new PrismaClient();

  const args = process.argv.slice(2);
  const [
    asinsRaw, titlePattern, category, brandInput, 
    totalWeightInput, unitsBoxInput, doseInput, proteinInput
  ] = args;

  if (!asinsRaw || !category) {
    console.error("❌ Erro: Argumentos insuficientes.");
    process.exit(1);
  }

  const asinList = asinsRaw.split(",").map((a) => a.trim()).filter(Boolean);
  console.log(`🚀 [${category.toUpperCase()}] Iniciando lote com ${asinList.length} ASINs...`);

  for (const asin of asinList) {
    try {
      // Delay de 1.5s para evitar bloqueio da Amazon
      await new Promise((res) => setTimeout(res, 1500));

      const res = await paapi.GetItems({
        AccessKey: process.env.AMAZON_ACCESS_KEY || "",
        SecretKey: process.env.AMAZON_SECRET_KEY || "",
        PartnerTag: process.env.AMAZON_PARTNER_TAG || "",
        PartnerType: "Associates",
        Marketplace: "www.amazon.com.br",
      }, {
        ItemIds: [asin],
        Resources: ["ItemInfo.Title", "ItemInfo.ByLineInfo", "Images.Primary.Large"],
      });

      const item = res?.ItemsResult?.Items?.[0];
      if (!item) {
        console.error(`❌ ASIN ${asin} não encontrado.`);
        continue;
      }

      const amazonTitle = item.ItemInfo?.Title?.DisplayValue ?? "";
      const amazonBrand = item.ItemInfo?.ByLineInfo?.Brand?.DisplayValue ?? "Desconhecida";
      const finalBrand = brandInput || amazonBrand;
      
      const exists = await prisma.offer.findFirst({ 
        where: { store: Store.AMAZON, externalId: asin } 
      });

      if (exists) {
        console.log(`⚠️ ${asin} já cadastrado.`);
        continue;
      }

      await prisma.product.create({
        data: {
          category,
          name: titlePattern.replace("{title}", amazonTitle).replace("{brand}", finalBrand),
          brand: finalBrand,
          imageUrl: item.Images?.Primary?.Large?.URL ?? "",
          
          // Mapeamento para Bebida Proteica
          ...(category === "bebidaproteica" && {
            proteinDrinkInfo: {
              create: {
                unitsPerPack: Math.floor(Number(unitsBoxInput)) || 0,
                volumePerUnitInMl: Number(doseInput) || 0,
                proteinPerUnitInGrams: Number(proteinInput) || 0
              }
            }
          }),

          // Lógica para Barra
          ...(category === "barra" && {
            proteinBarInfo: { 
              create: { 
                unitsPerBox: Math.floor(Number(unitsBoxInput)) || 0, 
                doseInGrams: Number(doseInput) || 0, 
                proteinPerDoseInGrams: Number(proteinInput) || 0 
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

      console.log(`✅ Sucesso: ${asin}`);

    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido";
      console.error(`❌ Erro no ASIN ${asin}: ${msg}`);
    }
  }

  await prisma.$disconnect();
}

run().catch((err) => {
  console.error("❌ Erro Crítico:", err instanceof Error ? err.message : err);
  process.exit(1);
});