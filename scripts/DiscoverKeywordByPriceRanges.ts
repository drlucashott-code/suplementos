import "dotenv/config";
import paapi from "amazon-paapi";

const commonParameters = {
  AccessKey: process.env.AMAZON_ACCESS_KEY!,
  SecretKey: process.env.AMAZON_SECRET_KEY!,
  PartnerTag: process.env.AMAZON_PARTNER_TAG!,
  PartnerType: "Associates",
  Marketplace: "www.amazon.com.br",
};

type SearchPriceRange = {
  min: number;
  max: number;
  label: string;
};

type AmazonSearchItem = {
  ASIN: string;
  DetailPageURL?: string;
  ItemInfo?: {
    Title?: {
      DisplayValue?: string;
    };
    ByLineInfo?: {
      Brand?: {
        DisplayValue?: string;
      };
    };
  };
  Offers?: {
    Listings?: Array<{
      Price?: {
        Amount?: number;
        DisplayAmount?: string;
      };
    }>;
  };
  OffersV2?: {
    Listings?: Array<{
      Price?: {
        Money?: {
          Amount?: number;
          DisplayAmount?: string;
        };
      };
    }>;
  };
};

type FoundItem = {
  asin: string;
  title: string;
  brand: string;
  price: number | null;
  displayPrice: string;
  detailPageUrl: string;
  foundInRanges: string[];
};

const DEFAULT_PRICE_RANGES: SearchPriceRange[] = [
  { min: 1, max: 15, label: "R$1-15" },
  { min: 16, max: 30, label: "R$16-30" },
  { min: 31, max: 50, label: "R$31-50" },
  { min: 51, max: 80, label: "R$51-80" },
  { min: 81, max: 120, label: "R$81-120" },
  { min: 121, max: 200, label: "R$121-200" },
  { min: 201, max: 400, label: "R$201-400" },
];

const PAGE_DELAY_MS = 1500;
const RATE_LIMIT_DELAY_MS = 10000;
const BAD_REQUEST_DELAY_MS = 2000;
const DEFAULT_MAX_PAGES = 10;

function assertEnv() {
  const required = [
    "AMAZON_ACCESS_KEY",
    "AMAZON_SECRET_KEY",
    "AMAZON_PARTNER_TAG",
  ] as const;

  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing envs: ${missing.join(", ")}`);
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getArgs() {
  const keyword = (process.argv[2] || "").trim();
  const maxPages = Number(process.argv[3] || DEFAULT_MAX_PAGES);

  if (!keyword) {
    console.log('Uso: npx tsx scripts/DiscoverKeywordByPriceRanges.ts "papel higienico" [maxPages]');
    process.exit(1);
  }

  return {
    keyword,
    maxPages: Number.isFinite(maxPages) && maxPages > 0 ? maxPages : DEFAULT_MAX_PAGES,
  };
}

function getItemTitle(item: AmazonSearchItem) {
  return item.ItemInfo?.Title?.DisplayValue?.trim() || "Sem titulo";
}

function getItemBrand(item: AmazonSearchItem) {
  return item.ItemInfo?.ByLineInfo?.Brand?.DisplayValue?.trim() || "Sem marca";
}

function getItemPrice(item: AmazonSearchItem) {
  const offersV2 = item.OffersV2?.Listings?.[0]?.Price?.Money;
  if (offersV2?.Amount) {
    return {
      price: offersV2.Amount,
      displayPrice: offersV2.DisplayAmount || `R$ ${offersV2.Amount.toFixed(2)}`,
    };
  }

  const offers = item.Offers?.Listings?.[0]?.Price;
  if (offers?.Amount) {
    return {
      price: offers.Amount,
      displayPrice: offers.DisplayAmount || `R$ ${offers.Amount.toFixed(2)}`,
    };
  }

  return {
    price: null,
    displayPrice: "Sem preco",
  };
}

async function searchKeywordInRange(
  keyword: string,
  range: SearchPriceRange,
  maxPages: number,
  foundMap: Map<string, FoundItem>
) {
  console.log(`\nFaixa ${range.label} (${range.min} - ${range.max})`);

  let newItemsInRange = 0;

  for (let page = 1; page <= maxPages; page++) {
    console.log(`  Pagina ${page}...`);

    try {
      const response = await paapi.SearchItems(commonParameters, {
        Keywords: keyword,
        SearchIndex: "All",
        ItemCount: 10,
        ItemPage: page,
        MinPrice: range.min * 100,
        MaxPrice: range.max * 100,
        Resources: [
          "ItemInfo.Title",
          "ItemInfo.ByLineInfo",
          "Offers.Listings.Price",
          "OffersV2.Listings.Price",
        ],
      });

      const items = (response?.SearchResult?.Items || []) as AmazonSearchItem[];

      if (items.length === 0) {
        console.log("    Sem itens nessa pagina, encerrando a faixa.");
        break;
      }

      for (const item of items) {
        const asin = item.ASIN;
        const current = foundMap.get(asin);
        const title = getItemTitle(item);
        const brand = getItemBrand(item);
        const { price, displayPrice } = getItemPrice(item);
        const detailPageUrl =
          item.DetailPageURL || `https://www.amazon.com.br/dp/${asin}`;

        if (current) {
          if (!current.foundInRanges.includes(range.label)) {
            current.foundInRanges.push(range.label);
          }
          continue;
        }

        foundMap.set(asin, {
          asin,
          title,
          brand,
          price,
          displayPrice,
          detailPageUrl,
          foundInRanges: [range.label],
        });

        newItemsInRange++;
        console.log(`    [NEW] ${asin} | ${displayPrice} | ${title.slice(0, 70)}`);
      }

      await sleep(PAGE_DELAY_MS);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      if (message.includes("429")) {
        console.log(`    429 rate limit. Pausando ${RATE_LIMIT_DELAY_MS / 1000}s...`);
        await sleep(RATE_LIMIT_DELAY_MS);
        page--;
        continue;
      }

      if (message.includes("400") || message.includes("Bad Request")) {
        console.log(
          `    Busca interrompida por limite/parametro. Pausando ${BAD_REQUEST_DELAY_MS / 1000}s...`
        );
        await sleep(BAD_REQUEST_DELAY_MS);
        break;
      }

      console.log(`    Erro: ${message}`);
      break;
    }
  }

  console.log(`  +${newItemsInRange} novos produtos nessa faixa.`);
}

async function run() {
  assertEnv();

  const { keyword, maxPages } = getArgs();
  const foundMap = new Map<string, FoundItem>();

  console.log("===========================================");
  console.log("DISCOVER KEYWORD BY PRICE RANGES");
  console.log(`Keyword: ${keyword}`);
  console.log(`Faixas: ${DEFAULT_PRICE_RANGES.length}`);
  console.log(`Max paginas por faixa: ${maxPages}`);
  console.log("===========================================");

  for (const range of DEFAULT_PRICE_RANGES) {
    await searchKeywordInRange(keyword, range, maxPages, foundMap);
  }

  const items = [...foundMap.values()].sort((a, b) => {
    const priceA = a.price ?? Number.MAX_SAFE_INTEGER;
    const priceB = b.price ?? Number.MAX_SAFE_INTEGER;
    if (priceA !== priceB) return priceA - priceB;
    return a.title.localeCompare(b.title, "pt-BR");
  });

  console.log("\n===========================================");
  console.log("RESUMO FINAL");
  console.log("===========================================");
  console.log(`Total de ASINs unicos: ${items.length}`);

  if (items.length === 0) {
    console.log("Nenhum produto encontrado.");
    return;
  }

  console.log("\nTOP RESULTADOS");
  items.slice(0, 30).forEach((item, index) => {
    console.log(
      `${index + 1}. ${item.asin} | ${item.displayPrice} | ${item.brand} | ${item.title}`
    );
  });

  console.log("\nASINS CONSOLIDADOS");
  console.log(items.map((item) => item.asin).join(", "));
}

run().catch((error) => {
  console.error("Falha ao executar busca:", error);
  process.exit(1);
});
