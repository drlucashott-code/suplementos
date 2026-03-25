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
      Manufacturer?: {
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
};

type SearchRunResult = {
  label: string;
  range: SearchPriceRange | null;
  consultedPages: number;
  rawUniqueAsins: Set<string>;
  matchingBrandAsins: Set<string>;
  matchingBrandItems: Map<string, FoundItem>;
  observedMin: number;
  observedMax: number;
  saturatedByPages: boolean;
};

function assertEnv() {
  const required = ["AMAZON_ACCESS_KEY", "AMAZON_SECRET_KEY", "AMAZON_PARTNER_TAG"] as const;
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
  const brand = (process.argv[3] || "").trim();
  const maxPages = Number(process.argv[4] || 10);
  const maxDepth = Number(process.argv[5] || 2);

  if (!keyword || !brand) {
    console.log(
      'Uso: npx tsx scripts/CheckBrandOverflowInSplit.ts "whey" "atlhetica nutrition" [maxPages=10] [maxDepth=2]'
    );
    process.exit(1);
  }

  return {
    keyword,
    brand,
    maxPages: Number.isFinite(maxPages) && maxPages > 0 ? Math.min(maxPages, 10) : 10,
    maxDepth: Number.isFinite(maxDepth) && maxDepth >= 1 ? Math.min(maxDepth, 5) : 2,
  };
}

function getItemTitle(item: AmazonSearchItem) {
  return item.ItemInfo?.Title?.DisplayValue?.trim() || "Sem titulo";
}

function getItemBrand(item: AmazonSearchItem) {
  return (
    item.ItemInfo?.ByLineInfo?.Brand?.DisplayValue?.trim() ||
    item.ItemInfo?.ByLineInfo?.Manufacturer?.DisplayValue?.trim() ||
    "Sem marca"
  );
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
    const normalized = offers.Amount > 1000 ? offers.Amount / 100 : offers.Amount;
    return {
      price: normalized,
      displayPrice: offers.DisplayAmount || `R$ ${normalized.toFixed(2)}`,
    };
  }

  return {
    price: null,
    displayPrice: "Sem preco",
  };
}

async function searchAmazonItems(
  keyword: string,
  page: number,
  range?: SearchPriceRange
): Promise<AmazonSearchItem[]> {
  const response = await paapi.SearchItems(commonParameters, {
    Keywords: keyword,
    SearchIndex: "All",
    ItemCount: 10,
    ItemPage: page,
    ...(range
      ? {
          MinPrice: range.min * 100,
          MaxPrice: range.max * 100,
        }
      : {}),
    Resources: [
      "ItemInfo.Title",
      "ItemInfo.ByLineInfo",
      "Offers.Listings.Price",
      "OffersV2.Listings.Price",
    ],
  });

  return (response?.SearchResult?.Items || []) as AmazonSearchItem[];
}

function splitRange(range: SearchPriceRange | null, observedMin: number, observedMax: number) {
  const safeMin = Math.floor(observedMin);
  const safeMax = Math.ceil(observedMax);

  if (!Number.isFinite(safeMin) || !Number.isFinite(safeMax) || safeMax - safeMin < 10) {
    return [];
  }

  const mid = Math.floor((safeMin + safeMax) / 2);
  if (mid <= safeMin || mid >= safeMax) {
    return [];
  }

  const left = {
    min: range ? Math.max(range.min, safeMin) : safeMin,
    max: range ? Math.min(range.max, mid) : mid,
    label: `R$${range ? Math.max(range.min, safeMin) : safeMin}-${range ? Math.min(range.max, mid) : mid}`,
  };

  const right = {
    min: range ? Math.max(range.min, mid + 1) : mid + 1,
    max: range ? Math.min(range.max, safeMax) : safeMax,
    label: `R$${range ? Math.max(range.min, mid + 1) : mid + 1}-${range ? Math.min(range.max, safeMax) : safeMax}`,
  };

  return [left, right].filter((item) => item.max - item.min >= 5);
}

async function runSingleSearch(params: {
  keyword: string;
  brand: string;
  range: SearchPriceRange | null;
  maxPages: number;
}) {
  const rawUniqueAsins = new Set<string>();
  const matchingBrandAsins = new Set<string>();
  const matchingBrandItems = new Map<string, FoundItem>();
  let consultedPages = 0;
  let observedMin = Number.POSITIVE_INFINITY;
  let observedMax = 0;
  let saturatedByPages = true;

  const searchTerm = `${params.keyword} ${params.brand}`.trim();

  for (let page = 1; page <= params.maxPages; page++) {
    consultedPages += 1;
    const items = await searchAmazonItems(searchTerm, page, params.range ?? undefined);

    if (items.length < 10) {
      saturatedByPages = false;
    }

    if (items.length === 0) {
      break;
    }

    for (const item of items) {
      if (!item.ASIN) continue;

      rawUniqueAsins.add(item.ASIN);

      const brand = getItemBrand(item);
      if (!brand.toLowerCase().includes(params.brand.toLowerCase())) {
        continue;
      }

      const { price, displayPrice } = getItemPrice(item);
      if (typeof price === "number" && Number.isFinite(price) && price > 0) {
        observedMin = Math.min(observedMin, price);
        observedMax = Math.max(observedMax, price);
      }

      matchingBrandAsins.add(item.ASIN);
      if (!matchingBrandItems.has(item.ASIN)) {
        matchingBrandItems.set(item.ASIN, {
          asin: item.ASIN,
          title: getItemTitle(item),
          brand,
          price,
          displayPrice,
          detailPageUrl: item.DetailPageURL || `https://www.amazon.com.br/dp/${item.ASIN}`,
        });
      }
    }

    await sleep(1200);
  }

  return {
    label: params.range ? params.range.label : "sem faixa",
    range: params.range,
    consultedPages,
    rawUniqueAsins,
    matchingBrandAsins,
    matchingBrandItems,
    observedMin,
    observedMax,
    saturatedByPages,
  } satisfies SearchRunResult;
}

async function expandAndCollect(params: {
  keyword: string;
  brand: string;
  range: SearchPriceRange | null;
  maxPages: number;
  maxDepth: number;
  depth: number;
  results: SearchRunResult[];
}) {
  const result = await runSingleSearch(params);
  params.results.push(result);

  console.log(
    `[${params.depth}] ${result.label}: ${result.rawUniqueAsins.size} ASINs brutos | ${result.matchingBrandAsins.size} da marca | ${result.consultedPages}/${params.maxPages} paginas`
  );

  const reachedApiCap = result.rawUniqueAsins.size >= params.maxPages * 10;
  const canSplit =
    params.depth < params.maxDepth &&
    reachedApiCap &&
    result.saturatedByPages &&
    Number.isFinite(result.observedMin) &&
    result.observedMax > result.observedMin;

  if (!canSplit) {
    return;
  }

  const splitRanges = splitRange(result.range, result.observedMin, result.observedMax);
  if (splitRanges.length === 0) {
    return;
  }

  console.log(
    `  Dividindo ${result.label} em ${splitRanges.map((item) => item.label).join(" e ")}`
  );

  for (const split of splitRanges) {
    await expandAndCollect({
      keyword: params.keyword,
      brand: params.brand,
      range: split,
      maxPages: params.maxPages,
      maxDepth: params.maxDepth,
      depth: params.depth + 1,
      results: params.results,
    });
  }
}

async function run() {
  assertEnv();

  const { keyword, brand, maxPages, maxDepth } = getArgs();
  const results: SearchRunResult[] = [];

  console.log("===========================================");
  console.log("CHECK BRAND OVERFLOW IN SPLIT");
  console.log(`Keyword: ${keyword}`);
  console.log(`Brand: ${brand}`);
  console.log(`Max paginas: ${maxPages}`);
  console.log(`Max profundidade: ${maxDepth}`);
  console.log("===========================================");

  await expandAndCollect({
    keyword,
    brand,
    range: null,
    maxPages,
    maxDepth,
    depth: 1,
    results,
  });

  const root = results[0];
  const descendants = results.slice(1);
  const rootBrandAsins = root?.matchingBrandAsins ?? new Set<string>();
  const extraBrandItems = new Map<string, FoundItem>();

  for (const result of descendants) {
    for (const [asin, item] of result.matchingBrandItems.entries()) {
      if (!rootBrandAsins.has(asin)) {
        extraBrandItems.set(asin, item);
      }
    }
  }

  console.log("\n===========================================");
  console.log("RESUMO");
  console.log("===========================================");
  console.log(
    `Busca raiz: ${root.rawUniqueAsins.size} ASINs brutos | ${root.matchingBrandAsins.size} da marca`
  );
  console.log(`ASINs extras da marca encontrados apos dividir: ${extraBrandItems.size}`);

  if (extraBrandItems.size === 0) {
    console.log(
      "Nenhum ASIN novo da marca apareceu nas subfaixas. Nesse teste, os resultados da marca parecem ter cabido na busca raiz."
    );
    return;
  }

  console.log("\nEXTRAS ENCONTRADOS APOS DIVIDIR");
  [...extraBrandItems.values()]
    .sort((a, b) => (a.price ?? Number.MAX_SAFE_INTEGER) - (b.price ?? Number.MAX_SAFE_INTEGER))
    .forEach((item, index) => {
      console.log(
        `${index + 1}. ${item.asin} | ${item.displayPrice} | ${item.brand} | ${item.title}`
      );
    });

  console.log("\nASINS EXTRAS");
  console.log([...extraBrandItems.keys()].join(", "));
}

run().catch((error) => {
  console.error("Falha ao executar teste:", error);
  process.exit(1);
});
