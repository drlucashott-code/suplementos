/**
 * DiscoverProducts - busca direta sem fatiamento por preco
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

const PAGE_DELAY_MS = 1500;
const EMPTY_SEARCH_DELAY_MS = 1200;
const BAD_REQUEST_DELAY_MS = 1500;
const RATE_LIMIT_DELAY_MS = 10000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function run() {
  const rawBrands = process.argv[2];
  const rawKeywords = process.argv[3] || "creme dental";

  const keywordsList = rawKeywords.split(",").map((keyword) => keyword.trim()).filter(Boolean);
  const brandsList = rawBrands ? rawBrands.split(",").map((brand) => brand.trim()).filter(Boolean) : [];

  const maxPages = 10;

  if (!rawBrands) {
    console.log(
      'Uso: npx ts-node scripts/DiscoverProducts.ts "Colgate" "creme dental, escova"'
    );
    process.exit(1);
  }

  const globalAsins = new Set<string>();

  console.log(`Iniciando Escavacao Profunda para [${brandsList.join(" | ")}]`);
  console.log(`Termos: ${keywordsList.join(" | ")}\n`);

  for (const brand of brandsList) {
    for (const currentKeyword of keywordsList) {
      console.log(`\n--- Buscando: "${currentKeyword}" de "${brand}" ---`);

      let foundInThisSearch = 0;

      for (let page = 1; page <= maxPages; page++) {
        console.log(`  Pag ${page}...`);

        try {
          const response = await paapi.SearchItems(commonParameters, {
            Keywords: currentKeyword,
            Brand: brand,
            SearchIndex: "All",
            ItemCount: 10,
            ItemPage: page,
            Resources: ["ItemInfo.Title", "ItemInfo.ByLineInfo"],
          });

          const items = (response?.SearchResult?.Items || []) as AmazonItem[];

          if (items.length === 0) {
            console.log(
              `    Nenhum item na busca. Pausando ${EMPTY_SEARCH_DELAY_MS / 1000}s...`
            );
            await sleep(EMPTY_SEARCH_DELAY_MS);
            break;
          }

          items.forEach((item) => {
            if (!globalAsins.has(item.ASIN)) {
              console.log(
                `    [NEW] [${item.ASIN}] ${item.ItemInfo.Title.DisplayValue.substring(0, 35)}...`
              );
              globalAsins.add(item.ASIN);
              foundInThisSearch++;
            }
          });

          await sleep(PAGE_DELAY_MS);
        } catch (err: unknown) {
          const error = err as { message?: string };
          const msg = error.message || "Erro desconhecido";

          if (msg.includes("429")) {
            console.log(
              `429 - Limite de requisicoes. Pausando ${RATE_LIMIT_DELAY_MS / 1000}s...`
            );
            await sleep(RATE_LIMIT_DELAY_MS);
            page--;
          } else if (msg.includes("400") || msg.includes("Bad Request")) {
            console.log(
              `    Limite de paginas ou erro de parametro. Pausando ${BAD_REQUEST_DELAY_MS / 1000}s...`
            );
            await sleep(BAD_REQUEST_DELAY_MS);
            break;
          } else {
            console.error("Erro:", msg);
            break;
          }
        }
      }

      console.log(`  +${foundInThisSearch} novos itens.`);
    }
  }

  const uniqueAsins = Array.from(globalAsins);

  if (uniqueAsins.length > 0) {
    console.log("\n===========================================");
    console.log("LISTA CONSOLIDADA");
    console.log(uniqueAsins.join(", "));
    console.log(`\nTotal de ASINs unicos: ${uniqueAsins.length}`);
  } else {
    console.log("\nNenhum produto encontrado.");
  }
}

run();
