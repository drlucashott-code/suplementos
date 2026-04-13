import https from "https";
import crypto from "node:crypto";
import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import path from "node:path";
import * as creatorsSdkBundled from "../../vendor/creatorsapi-nodejs-sdk/dist/index.js";

export type AmazonListing = {
  IsBuyBoxWinner?: boolean;
  Type?: string;
  DeliveryInfo?: {
    IsPrimeEligible?: boolean;
    IsFreeShippingEligible?: boolean;
    IsAmazonFulfilled?: boolean;
  };
  Price?: {
    Amount?: number;
    DisplayAmount?: string;
    Money?: {
      Amount?: number;
      DisplayAmount?: string;
    };
  };
  MerchantInfo?: {
    Name?: string;
  };
};

export type AmazonItem = {
  ASIN?: string;
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
  Images?: {
    Primary?: {
      Large?: {
        URL?: string;
      };
    };
  };
  CustomerReviews?: {
    Count?: number;
    StarRating?: {
      Value?: number;
    };
  };
  Offers?: {
    Listings?: AmazonListing[];
  };
  OffersV2?: {
    Listings?: AmazonListing[];
  };
};

export type AmazonSearchPriceRange = {
  min: number;
  max: number;
  label: string;
};

export type AmazonListingGroup = {
  source: "Offers" | "OffersV2";
  listings: AmazonListing[];
};

export type AmazonListingSummary = {
  totalListings: number;
  hasAnyPrime: boolean;
  hasAnyFreeShipping: boolean;
  hasAnyAmazonFulfilled: boolean;
  hasAnyBuyBoxWinner: boolean;
};

export type AmazonPriceSnapshot = {
  asin: string;
  price: number;
  programAndSavePrice: number | null;
  merchantName: string | null;
  affiliateUrl: string;
  listingSummary: AmazonListingSummary;
};

type AmazonApiProvider = "paapi" | "creators";

const AMAZON_DISABLE_PAAPI_FALLBACK = ["1", "true", "yes"].includes(
  (process.env.AMAZON_DISABLE_PAAPI_FALLBACK ?? "").trim().toLowerCase()
);
const AMAZON_PAAPI_DEBUG = ["1", "true", "yes"].includes(
  (process.env.AMAZON_PAAPI_DEBUG ?? "").trim().toLowerCase()
);

type CreatorsSdkModule = {
  ApiClient: new () => {
    credentialId?: string;
    credentialSecret?: string;
    version?: string;
    basePath?: string;
  };
  DefaultApi: new (apiClient: unknown) => {
    getItems: (
      marketplace: string,
      request: Record<string, unknown>
    ) => Promise<{ itemsResult?: { items?: unknown[] }; errors?: unknown[] }>;
    searchItems: (
      marketplace: string,
      opts: { searchItemsRequestContent: Record<string, unknown> }
    ) => Promise<{ searchResult?: { items?: unknown[] }; errors?: unknown[] }>;
  };
  GetItemsRequestContent: new () => Record<string, unknown>;
  SearchItemsRequestContent: new () => Record<string, unknown>;
};

type CreatorsDebugSnapshot = {
  request?: Record<string, unknown>;
  response?: Record<string, unknown>;
};

let lastCreatorsDebug: CreatorsDebugSnapshot | null = null;
let creatorsDebugEnabled = false;

export function getLastCreatorsDebugSnapshot() {
  return lastCreatorsDebug;
}

export function resetCreatorsDebugSnapshot() {
  lastCreatorsDebug = null;
}

export function setCreatorsDebugEnabled(value: boolean) {
  creatorsDebugEnabled = value;
}

type GetAmazonItemsInput = {
  itemIds: string[];
  resources: string[];
  marketplace?: string;
};

type SearchAmazonItemsInput = {
  keywords: string;
  page: number;
  resources: string[];
  brand?: string;
  range?: AmazonSearchPriceRange;
  itemCount?: number;
  marketplace?: string;
};

const AMAZON_ACCESS_KEY = process.env.AMAZON_ACCESS_KEY;
const AMAZON_SECRET_KEY = process.env.AMAZON_SECRET_KEY;
const AMAZON_PARTNER_TAG = process.env.AMAZON_PARTNER_TAG;
const AMAZON_HOST = process.env.AMAZON_HOST ?? "webservices.amazon.com.br";
const AMAZON_REGION = process.env.AMAZON_REGION ?? "us-east-1";
const AMAZON_SERVICE = "ProductAdvertisingAPI";
const DEFAULT_MARKETPLACE = "www.amazon.com.br";
const REPO_CREATORS_SDK_PATH = path.resolve(
  process.cwd(),
  "vendor",
  "creatorsapi-nodejs-sdk",
  "dist",
  "index.js"
);
const DEFAULT_CREATORS_SDK_DOWNLOAD_PATH =
  "C:\\Users\\lucas\\Downloads\\creatorsapi-nodejs-sdk\\creatorsapi-nodejs-sdk\\dist\\index.js";
const require = createRequire(import.meta.url);

let creatorsSdkCache: CreatorsSdkModule | null = null;

function getFirstEnvValue(...keys: string[]) {
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) {
      return value;
    }
  }

  return "";
}

function isCreatorsSdkModule(value: Partial<CreatorsSdkModule> | null | undefined): value is CreatorsSdkModule {
  return Boolean(
    value &&
      value.ApiClient &&
      value.DefaultApi &&
      value.GetItemsRequestContent &&
      value.SearchItemsRequestContent
  );
}

const AMAZON_CREATORS_CREDENTIAL_ID = getFirstEnvValue(
  "AMAZON_CREATORS_CREDENTIAL_ID",
  "CREATORS_API_CREDENTIAL_ID",
  "AMAZON_CREATORS_CLIENT_ID"
);
const AMAZON_CREATORS_CREDENTIAL_SECRET = getFirstEnvValue(
  "AMAZON_CREATORS_CREDENTIAL_SECRET",
  "CREATORS_API_CREDENTIAL_SECRET",
  "AMAZON_CREATORS_CLIENT_SECRET"
);
const AMAZON_CREATORS_VERSION =
  getFirstEnvValue("AMAZON_CREATORS_VERSION", "CREATORS_API_VERSION") || "3.1";
const AMAZON_CREATORS_BASE_PATH = getFirstEnvValue(
  "AMAZON_CREATORS_BASE_PATH",
  "CREATORS_API_BASE_PATH"
);
const AMAZON_CREATORS_SDK_PATH = getFirstEnvValue(
  "AMAZON_CREATORS_SDK_PATH",
  "CREATORS_API_SDK_PATH"
);
const AMAZON_CREATORS_PRICE_MULTIPLIER = (() => {
  const raw = process.env.AMAZON_CREATORS_PRICE_MULTIPLIER?.trim();
  if (!raw) {
    return 1;
  }

  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
})();

function assertPaapiEnv() {
  if (!AMAZON_ACCESS_KEY || !AMAZON_SECRET_KEY || !AMAZON_PARTNER_TAG) {
    throw new Error("Credenciais da Amazon nao configuradas.");
  }
}

function assertPartnerTag() {
  if (!AMAZON_PARTNER_TAG) {
    throw new Error("AMAZON_PARTNER_TAG nao configurada.");
  }
}

function assertCreatorsEnv() {
  assertPartnerTag();

  if (!AMAZON_CREATORS_CREDENTIAL_ID || !AMAZON_CREATORS_CREDENTIAL_SECRET) {
    throw new Error(
      "Credenciais da Creators API nao configuradas. Defina AMAZON_CREATORS_CREDENTIAL_ID e AMAZON_CREATORS_CREDENTIAL_SECRET."
    );
  }
}

function hmac(key: string | Buffer, data: string): Buffer {
  return crypto.createHmac("sha256", key).update(data).digest();
}

function sha256(data: string): string {
  return crypto.createHash("sha256").update(data).digest("hex");
}

function getSignatureKey(
  key: string,
  dateStamp: string,
  region: string,
  service: string
): Buffer {
  const kDate = hmac(`AWS4${key}`, dateStamp);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, service);
  return hmac(kService, "aws4_request");
}

function getConfiguredProvider(): AmazonApiProvider {
  const raw = (process.env.AMAZON_API_PROVIDER ?? "paapi").trim().toLowerCase();
  return raw === "creators" ? "creators" : "paapi";
}

const PAAPI_RESOURCE_ALLOWLIST = new Set([
  "ItemInfo.Title",
  "ItemInfo.ByLineInfo",
  "ItemInfo.Features",
  "ItemInfo.ProductInfo",
  "ItemInfo.Classifications",
  "BrowseNodeInfo.BrowseNodes",
  "BrowseNodeInfo.BrowseNodes.SalesRank",
  "CustomerReviews.Count",
  "CustomerReviews.StarRating",
  "Images.Primary.Large",
  "Images.Primary.Medium",
  "Images.Primary.Small",
  "Images.Variants.Large",
  "Images.Variants.Medium",
  "Images.Variants.Small",
  "Offers.Listings.Price",
  "Offers.Listings.Savings",
  "Offers.Listings.SavingBasis",
  "Offers.Listings.Availability",
  "Offers.Listings.Condition",
  "Offers.Listings.IsBuyBoxWinner",
  "Offers.Listings.DeliveryInfo",
  "Offers.Listings.LoyaltyPoints",
]);

function normalizePaapiResources(resources: string[]) {
  const unique = Array.from(new Set(resources.map((r) => r.trim()).filter(Boolean)));
  const filtered = unique.filter((resource) => PAAPI_RESOURCE_ALLOWLIST.has(resource));

  if (AMAZON_PAAPI_DEBUG) {
    const dropped = unique.filter((resource) => !PAAPI_RESOURCE_ALLOWLIST.has(resource));
    if (dropped.length > 0) {
      console.warn(`[paapi] recursos descartados: ${dropped.join(", ")}`);
    }
  }

  if (filtered.length === 0) {
    return ["Offers.Listings.Price"];
  }

  return filtered;
}

function toCreatorsResourceName(resource: string) {
  const normalized = resource.trim();
  if (!normalized) {
    return normalized;
  }

  const segments = normalized.split(".").filter(Boolean);
  if (segments[0] === "Offers") {
    segments[0] = "OffersV2";
  }

  return segments
    .map((segment) => segment.charAt(0).toLowerCase() + segment.slice(1))
    .join(".");
}

function normalizeCreatorsResources(resources: string[]) {
  const mapped = resources
    .map(toCreatorsResourceName)
    .filter((resource) => resource.length > 0);

  return [...new Set(mapped)];
}

function normalizeCreatorsPriceFilter(value: number) {
  const normalized = Number((value * AMAZON_CREATORS_PRICE_MULTIPLIER).toFixed(2));
  return Number.isFinite(normalized) ? normalized : value;
}

function loadCreatorsSdk(): CreatorsSdkModule {
  if (creatorsSdkCache) {
    return creatorsSdkCache;
  }

  const bundled = creatorsSdkBundled as Partial<CreatorsSdkModule>;
  if (isCreatorsSdkModule(bundled)) {
    creatorsSdkCache = bundled as CreatorsSdkModule;
    return creatorsSdkCache;
  }

  const candidates = [
    "@amzn/creatorsapi-nodejs-sdk",
    "../../vendor/creatorsapi-nodejs-sdk/dist/index.js",
    REPO_CREATORS_SDK_PATH,
    AMAZON_CREATORS_SDK_PATH,
    DEFAULT_CREATORS_SDK_DOWNLOAD_PATH,
  ].filter(Boolean);

  const errors: string[] = [];

  for (const candidate of candidates) {
    try {
      const isAbsolutePath =
        candidate.includes("\\") || candidate.includes("/") || candidate.endsWith(".js");

      if (isAbsolutePath && !existsSync(candidate)) {
        errors.push(`${candidate} (arquivo nao encontrado)`);
        continue;
      }

      const loaded = require(candidate) as Partial<CreatorsSdkModule>;

      if (
        loaded.ApiClient &&
        loaded.DefaultApi &&
        loaded.GetItemsRequestContent &&
        loaded.SearchItemsRequestContent
      ) {
        creatorsSdkCache = loaded as CreatorsSdkModule;
        return creatorsSdkCache;
      }

      errors.push(`${candidate} (exports incompletos)`);
    } catch (error) {
      errors.push(
        `${candidate} (${error instanceof Error ? error.message : "erro desconhecido"})`
      );
    }
  }

  throw new Error(
    `SDK da Creators API nao encontrado. Tentativas: ${errors.join(" | ")}`
  );
}

function buildCreatorsApi() {
  assertCreatorsEnv();

  if ((process.env.AMAZON_CREATORS_BASE_PATH ?? "").trim() === "") {
    delete process.env.AMAZON_CREATORS_BASE_PATH;
  }
  if ((process.env.CREATORS_API_BASE_PATH ?? "").trim() === "") {
    delete process.env.CREATORS_API_BASE_PATH;
  }

  const sdk = loadCreatorsSdk();
  const apiClient = new sdk.ApiClient();
  apiClient.credentialId = AMAZON_CREATORS_CREDENTIAL_ID;
  apiClient.credentialSecret = AMAZON_CREATORS_CREDENTIAL_SECRET;
  apiClient.version = AMAZON_CREATORS_VERSION;
  const creatorsBasePath = (AMAZON_CREATORS_BASE_PATH ?? "").trim();
  const resolvedBasePath = creatorsBasePath || "https://api.creators.amazon.com";
  apiClient.basePath = resolvedBasePath;

  return {
    sdk,
    api: new sdk.DefaultApi(apiClient),
  };
}

function extractCreatorsErrorMessage(errors: unknown[] | undefined) {
  if (!Array.isArray(errors) || errors.length === 0) {
    return "";
  }

  const parts = errors
    .map((error) => {
      if (!error || typeof error !== "object") {
        return "";
      }

      const code =
        "code" in error && typeof error.code === "string" ? error.code : "Erro";
      const message =
        "message" in error && typeof error.message === "string"
          ? error.message
          : "sem detalhes";
      return `${code}: ${message}`;
    })
    .filter(Boolean);

  return parts.join(" | ");
}

function getUnknownErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (error && typeof error === "object") {
    const maybeMessage =
      "message" in error && typeof error.message === "string" ? error.message : "";
    const maybeBody = "body" in error ? JSON.stringify(error.body) : "";
    const maybeStatus =
      "status" in error && typeof error.status !== "undefined"
        ? String(error.status)
        : "";

    return [maybeStatus, maybeMessage, maybeBody].filter(Boolean).join(" | ");
  }

  return "erro desconhecido";
}

function normalizeCreatorsListing(listing: any): AmazonListing {
  const money = listing?.price?.money;

  return {
    IsBuyBoxWinner: listing?.isBuyBoxWinner === true,
    Type: typeof listing?.type === "string" ? listing.type : undefined,
    Price: {
      Amount:
        typeof money?.amount === "number" && Number.isFinite(money.amount)
          ? money.amount
          : undefined,
      DisplayAmount:
        typeof money?.displayAmount === "string" ? money.displayAmount : undefined,
      Money: {
        Amount:
          typeof money?.amount === "number" && Number.isFinite(money.amount)
            ? money.amount
            : undefined,
        DisplayAmount:
          typeof money?.displayAmount === "string" ? money.displayAmount : undefined,
      },
    },
    MerchantInfo: {
      Name:
        typeof listing?.merchantInfo?.name === "string"
          ? listing.merchantInfo.name
          : undefined,
    },
  };
}

function normalizeCreatorsItem(item: any): AmazonItem {
  const largeImageUrl =
    item?.images?.primary?.large?.url ??
    item?.images?.primary?.medium?.url ??
    item?.images?.primary?.small?.url;

  const normalizedListings = Array.isArray(item?.offersV2?.listings)
    ? item.offersV2.listings.map(normalizeCreatorsListing)
    : [];

  return {
    ASIN: typeof item?.asin === "string" ? item.asin : undefined,
    DetailPageURL:
      typeof item?.detailPageURL === "string" ? item.detailPageURL : undefined,
    ItemInfo: {
      Title: {
        DisplayValue:
          typeof item?.itemInfo?.title?.displayValue === "string"
            ? item.itemInfo.title.displayValue
            : undefined,
      },
      ByLineInfo: {
        Brand: {
          DisplayValue:
            typeof item?.itemInfo?.byLineInfo?.brand?.displayValue === "string"
              ? item.itemInfo.byLineInfo.brand.displayValue
              : undefined,
        },
        Manufacturer: {
          DisplayValue:
            typeof item?.itemInfo?.byLineInfo?.manufacturer?.displayValue === "string"
              ? item.itemInfo.byLineInfo.manufacturer.displayValue
              : undefined,
        },
      },
    },
    Images: {
      Primary: {
        Large: {
          URL: typeof largeImageUrl === "string" ? largeImageUrl : undefined,
        },
      },
    },
    CustomerReviews: {
      Count:
        typeof item?.customerReviews?.count === "number"
          ? item.customerReviews.count
          : undefined,
      StarRating: {
        Value:
          typeof item?.customerReviews?.starRating?.value === "number"
            ? item.customerReviews.starRating.value
            : undefined,
      },
    },
    OffersV2: {
      Listings: normalizedListings,
    },
  };
}

function isProgramAndSaveListing(listing?: AmazonListing | null) {
  const normalizedType = (listing?.Type ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  return (
    normalizedType.includes("subscribe") ||
    normalizedType.includes("programa") ||
    normalizedType.includes("poupe") ||
    normalizedType.includes("assin")
  );
}

function getListingAmount(listing?: AmazonListing | null): number {
  const offersV2Amount = listing?.Price?.Money?.Amount;
  if (typeof offersV2Amount === "number" && Number.isFinite(offersV2Amount)) {
    return offersV2Amount;
  }

  const offersAmount = listing?.Price?.Amount;
  if (typeof offersAmount === "number" && Number.isFinite(offersAmount)) {
    return offersAmount > 1000 ? offersAmount / 100 : offersAmount;
  }

  return 0;
}

function getListingDisplayAmount(listing?: AmazonListing | null): string {
  return listing?.Price?.Money?.DisplayAmount ?? listing?.Price?.DisplayAmount ?? "";
}

function buildAffiliateUrl(asin?: string, detailPageUrl?: string) {
  if (detailPageUrl) {
    return detailPageUrl;
  }

  if (!asin) {
    return "";
  }

  return `https://www.amazon.com.br/dp/${asin}?tag=${AMAZON_PARTNER_TAG ?? ""}`;
}

function getPreferredListing(
  item: AmazonItem,
  options?: { preferOneTimePurchase?: boolean }
): AmazonListing | null {
  const preferOneTimePurchase = options?.preferOneTimePurchase ?? true;
  const listingsV2 = item.OffersV2?.Listings;
  if (Array.isArray(listingsV2) && listingsV2.length > 0) {
    const buyBoxListing = listingsV2.find((listing) => listing?.IsBuyBoxWinner);

    if (!preferOneTimePurchase) {
      return buyBoxListing ?? listingsV2[0] ?? null;
    }

    if (buyBoxListing && !isProgramAndSaveListing(buyBoxListing)) {
      return buyBoxListing;
    }

    const fallbackNonProgramAndSave = listingsV2.find(
      (listing) => !isProgramAndSaveListing(listing)
    );
    if (fallbackNonProgramAndSave) {
      return fallbackNonProgramAndSave;
    }

    return buyBoxListing ?? listingsV2[0] ?? null;
  }

  const listings = item.Offers?.Listings;
  if (Array.isArray(listings) && listings.length > 0) {
    const buyBoxListing = listings.find((listing) => listing?.IsBuyBoxWinner);

    if (!preferOneTimePurchase) {
      return buyBoxListing ?? listings[0] ?? null;
    }

    if (buyBoxListing && !isProgramAndSaveListing(buyBoxListing)) {
      return buyBoxListing;
    }

    const fallbackNonProgramAndSave = listings.find(
      (listing) => !isProgramAndSaveListing(listing)
    );
    if (fallbackNonProgramAndSave) {
      return fallbackNonProgramAndSave;
    }

    return buyBoxListing ?? listings[0] ?? null;
  }

  return null;
}

export function getAmazonItemPrice(item: AmazonItem): number {
  return getListingAmount(getPreferredListing(item, { preferOneTimePurchase: true }));
}

export function getAmazonItemProgramAndSavePrice(item: AmazonItem): number | null {
  const listingsV2 = item.OffersV2?.Listings;
  if (Array.isArray(listingsV2) && listingsV2.length > 0) {
    const programAndSaveListing = listingsV2.find((listing) =>
      isProgramAndSaveListing(listing)
    );
    if (programAndSaveListing) {
      const amount = getListingAmount(programAndSaveListing);
      return amount > 0 ? amount : null;
    }
  }

  const listings = item.Offers?.Listings;
  if (Array.isArray(listings) && listings.length > 0) {
    const programAndSaveListing = listings.find((listing) =>
      isProgramAndSaveListing(listing)
    );
    if (programAndSaveListing) {
      const amount = getListingAmount(programAndSaveListing);
      return amount > 0 ? amount : null;
    }
  }

  return null;
}

export function getAmazonItemDisplayPrice(item: AmazonItem): {
  price: number | null;
  displayPrice: string;
} {
  const listing = getPreferredListing(item, { preferOneTimePurchase: true });
  const displayAmount = getListingDisplayAmount(listing);
  const price = getAmazonItemPrice(item);

  if (price > 0) {
    return {
      price,
      displayPrice: displayAmount || `R$ ${price.toFixed(2)}`,
    };
  }

  return {
    price: null,
    displayPrice: "Sem preco",
  };
}

export function getAmazonItemMerchantName(item: AmazonItem): string | null {
  return (
    getPreferredListing(item, { preferOneTimePurchase: true })?.MerchantInfo?.Name ??
    null
  );
}

export function getAmazonItemTitle(item: AmazonItem): string {
  return item.ItemInfo?.Title?.DisplayValue?.trim() || "Sem titulo";
}

export function getAmazonItemBrand(item: AmazonItem): string {
  return (
    item.ItemInfo?.ByLineInfo?.Brand?.DisplayValue?.trim() ||
    item.ItemInfo?.ByLineInfo?.Manufacturer?.DisplayValue?.trim() ||
    "Sem marca"
  );
}

export function getAmazonItemAffiliateUrl(item: AmazonItem): string {
  return buildAffiliateUrl(item.ASIN, item.DetailPageURL);
}

export function getAmazonListingGroups(item: AmazonItem): AmazonListingGroup[] {
  const groups: AmazonListingGroup[] = [];

  if (item.Offers?.Listings?.length) {
    groups.push({ source: "Offers", listings: item.Offers.Listings });
  }

  if (item.OffersV2?.Listings?.length) {
    groups.push({ source: "OffersV2", listings: item.OffersV2.Listings });
  }

  return groups;
}

export function summarizeAmazonListings(groups: AmazonListingGroup[]): AmazonListingSummary {
  const allListings = groups.flatMap((group) => group.listings);

  return {
    totalListings: allListings.length,
    hasAnyPrime: allListings.some((listing) => listing.DeliveryInfo?.IsPrimeEligible === true),
    hasAnyFreeShipping: allListings.some(
      (listing) => listing.DeliveryInfo?.IsFreeShippingEligible === true
    ),
    hasAnyAmazonFulfilled: allListings.some(
      (listing) => listing.DeliveryInfo?.IsAmazonFulfilled === true
    ),
    hasAnyBuyBoxWinner: allListings.some((listing) => listing.IsBuyBoxWinner === true),
  };
}

export async function fetchAmazonPriceSnapshots(
  asins: string[]
): Promise<Record<string, AmazonPriceSnapshot>> {
  if (asins.length === 0) return {};

  const baseResources = [
    "Offers.Listings.Price",
    "Offers.Listings.MerchantInfo",
    "Offers.Listings.IsBuyBoxWinner",
    "Offers.Listings.DeliveryInfo",
  ];
  const provider = getConfiguredProvider();
  const initialResources =
    provider === "creators"
      ? ["ItemInfo.Title", "Offers.Listings.Type", "Offers.Listings.Availability", ...baseResources.filter((r) => r !== "Offers.Listings.DeliveryInfo")]
      : baseResources;
  const debugCreators =
    creatorsDebugEnabled ||
    ["1", "true", "yes"].includes(
      (process.env.AMAZON_CREATORS_DEBUG ?? "").trim().toLowerCase()
    );
  if (debugCreators) {
    lastCreatorsDebug = {
      ...(lastCreatorsDebug ?? {}),
      request: {
        ...(lastCreatorsDebug?.request ?? {}),
        snapshots: {
          stage: "fetchAmazonPriceSnapshots",
          provider,
          asins,
          resources: initialResources,
        },
      },
    };
  }

  let items: AmazonItem[] = [];
  try {
    items = await getAmazonItems({
      itemIds: asins,
      resources: initialResources,
    });
  } catch (error) {
    if (debugCreators) {
      lastCreatorsDebug = {
        ...(lastCreatorsDebug ?? {}),
        response: {
          stage: "fetchAmazonPriceSnapshots",
          error: error instanceof Error ? error.message : "erro desconhecido",
        },
      };
    }
    throw error;
  }
  if (debugCreators) {
    lastCreatorsDebug = {
      ...(lastCreatorsDebug ?? {}),
      response: {
        ...(lastCreatorsDebug?.response ?? {}),
        snapshots: {
          items: items.length,
        },
      },
    };
  }

  if (items.length === 0) {
    items = await getAmazonItems({
      itemIds: asins,
      resources: ["ItemInfo.Title", ...baseResources],
    });
  }

  const results: Record<string, AmazonPriceSnapshot> = {};

  for (const item of items) {
    const asin = item.ASIN;
    if (!asin) continue;

    const listingSummary = summarizeAmazonListings(getAmazonListingGroups(item));

    results[asin] = {
      asin,
      price: getAmazonItemPrice(item),
      programAndSavePrice: getAmazonItemProgramAndSavePrice(item),
      merchantName: getAmazonItemMerchantName(item),
      affiliateUrl: getAmazonItemAffiliateUrl(item),
      listingSummary,
    };
  }

  return results;
}

async function requestPaapi<T>(
  path: "/paapi5/getitems" | "/paapi5/searchitems",
  target:
    | "com.amazon.paapi5.v1.ProductAdvertisingAPIv1.GetItems"
    | "com.amazon.paapi5.v1.ProductAdvertisingAPIv1.SearchItems",
  payload: string
): Promise<T | null> {
  assertPaapiEnv();
  const debugPaapi = ["1", "true", "yes"].includes(
    (process.env.AMAZON_PAAPI_DEBUG ?? "").trim().toLowerCase()
  );

  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.substring(0, 8);

  const canonicalHeaders =
    `content-encoding:amz-1.0\ncontent-type:application/json; charset=utf-8\nhost:${AMAZON_HOST}\nx-amz-date:${amzDate}\n`;
  const signedHeaders = "content-encoding;content-type;host;x-amz-date";
  const canonicalRequest =
    `POST\n${path}\n\n${canonicalHeaders}\n${signedHeaders}\n${sha256(payload)}`;
  const credentialScope = `${dateStamp}/${AMAZON_REGION}/${AMAZON_SERVICE}/aws4_request`;
  const stringToSign =
    `AWS4-HMAC-SHA256\n${amzDate}\n${credentialScope}\n${sha256(canonicalRequest)}`;
  const signingKey = getSignatureKey(
    AMAZON_SECRET_KEY!,
    dateStamp,
    AMAZON_REGION,
    AMAZON_SERVICE
  );
  const signature = crypto
    .createHmac("sha256", signingKey)
    .update(stringToSign)
    .digest("hex");

  const options = {
    hostname: AMAZON_HOST,
    path,
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Encoding": "amz-1.0",
      "X-Amz-Date": amzDate,
      "X-Amz-Target": target,
      Authorization: `AWS4-HMAC-SHA256 Credential=${AMAZON_ACCESS_KEY}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
      "Content-Length": Buffer.byteLength(payload),
    },
  };

  return new Promise((resolve) => {
    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        if (debugPaapi) {
          const bodyPreview = data.length > 1000 ? `${data.slice(0, 1000)}...` : data;
          console.log(
            `[paapi] ${res.statusCode ?? "-"} ${target} response: ${bodyPreview}`
          );
        }
        try {
          resolve(JSON.parse(data) as T);
        } catch {
          if (debugPaapi) {
            console.warn("[paapi] falha ao parsear JSON da resposta.");
          }
          resolve(null);
        }
      });
    });

    req.on("error", (error) => {
      if (debugPaapi) {
        console.warn(
          `[paapi] erro de rede: ${
            error instanceof Error ? error.message : "erro desconhecido"
          }`
        );
      }
      resolve(null);
    });
    req.write(payload);
    req.end();
  });
}

async function getItemsViaPaapi(input: GetAmazonItemsInput): Promise<AmazonItem[]> {
  const resources = normalizePaapiResources(input.resources);
  const payload = JSON.stringify({
    ItemIds: input.itemIds,
    Resources: resources,
    PartnerTag: AMAZON_PARTNER_TAG,
    PartnerType: "Associates",
    Marketplace: input.marketplace ?? DEFAULT_MARKETPLACE,
  });

  const response = await requestPaapi<{ ItemsResult?: { Items?: AmazonItem[] } }>(
    "/paapi5/getitems",
    "com.amazon.paapi5.v1.ProductAdvertisingAPIv1.GetItems",
    payload
  );

  return response?.ItemsResult?.Items ?? [];
}

export async function getAmazonItemsRaw(
  input: GetAmazonItemsInput
): Promise<{ items: AmazonItem[]; raw: unknown }> {
  const resources = normalizePaapiResources(input.resources);
  const payload = JSON.stringify({
    ItemIds: input.itemIds,
    Resources: resources,
    PartnerTag: AMAZON_PARTNER_TAG,
    PartnerType: "Associates",
    Marketplace: input.marketplace ?? DEFAULT_MARKETPLACE,
  });

  const response = await requestPaapi<{ ItemsResult?: { Items?: AmazonItem[] } }>(
    "/paapi5/getitems",
    "com.amazon.paapi5.v1.ProductAdvertisingAPIv1.GetItems",
    payload
  );

  return {
    items: response?.ItemsResult?.Items ?? [],
    raw: response,
  };
}

async function searchItemsViaPaapi(input: SearchAmazonItemsInput): Promise<AmazonItem[]> {
  const resources = normalizePaapiResources(input.resources);
  const payload = JSON.stringify({
    Keywords: input.keywords,
    ...(input.brand ? { Brand: input.brand } : {}),
    SearchIndex: "All",
    ItemCount: input.itemCount ?? 10,
    ItemPage: input.page,
    ...(input.range
      ? {
          MinPrice: input.range.min * 100,
          MaxPrice: input.range.max * 100,
        }
      : {}),
    Resources: resources,
    PartnerTag: AMAZON_PARTNER_TAG,
    PartnerType: "Associates",
    Marketplace: input.marketplace ?? DEFAULT_MARKETPLACE,
  });

  const response = await requestPaapi<{ SearchResult?: { Items?: AmazonItem[] } }>(
    "/paapi5/searchitems",
    "com.amazon.paapi5.v1.ProductAdvertisingAPIv1.SearchItems",
    payload
  );

  return response?.SearchResult?.Items ?? [];
}

async function getItemsViaCreators(input: GetAmazonItemsInput): Promise<AmazonItem[]> {
  const { sdk, api } = buildCreatorsApi();
  const request = new sdk.GetItemsRequestContent();
  const debugCreators = ["1", "true", "yes"].includes(
    (process.env.AMAZON_CREATORS_DEBUG ?? "").trim().toLowerCase()
  );
  if (debugCreators) {
    lastCreatorsDebug = { request: { stage: "init" } };
  }

  request.partnerTag = AMAZON_PARTNER_TAG;
  request.itemIds = input.itemIds;
  request.resources = normalizeCreatorsResources(input.resources);

  const primaryMarketplace = input.marketplace ?? DEFAULT_MARKETPLACE;
  if (debugCreators) {
    const itemIds = Array.isArray((request as { itemIds?: unknown }).itemIds)
      ? ((request as { itemIds: string[] }).itemIds ?? [])
      : [];
    const resources = Array.isArray((request as { resources?: unknown }).resources)
      ? ((request as { resources: string[] }).resources ?? [])
      : [];
    console.log("[creators] getItems request", {
      marketplace: primaryMarketplace,
      itemCount: itemIds.length,
      resources,
      basePath: (api as { apiClient?: { basePath?: string } }).apiClient?.basePath,
    });
    lastCreatorsDebug = {
      ...(lastCreatorsDebug ?? {}),
      request: {
        ...(lastCreatorsDebug?.request ?? {}),
        getItems: {
          marketplace: primaryMarketplace,
          itemCount: itemIds.length,
          resources,
          basePath: (api as { apiClient?: { basePath?: string } }).apiClient?.basePath,
        },
      },
    };
  }

  let response: { itemsResult?: { items?: unknown[] }; errors?: unknown[] } | null = null;
  try {
    response = await api.getItems(primaryMarketplace, request);
  } catch (error) {
    if (debugCreators) {
      lastCreatorsDebug = {
        ...(lastCreatorsDebug ?? {}),
        response: {
          ...(lastCreatorsDebug?.response ?? {}),
          getItems: {
            marketplace: primaryMarketplace,
            error: error instanceof Error ? error.message : "erro desconhecido",
          },
        },
      };
    }
    throw error;
  }
  let items = Array.isArray(response?.itemsResult?.items) ? response.itemsResult.items : [];
  if (debugCreators) {
    console.log("[creators] getItems response", {
      marketplace: primaryMarketplace,
      items: items.length,
      errors: response?.errors ?? null,
    });
    lastCreatorsDebug = {
      ...(lastCreatorsDebug ?? {}),
      response: {
        ...(lastCreatorsDebug?.response ?? {}),
        getItems: {
          marketplace: primaryMarketplace,
          items: items.length,
          errors: response?.errors ?? null,
        },
      },
    };
  }

  if (items.length === 0 && primaryMarketplace.startsWith("www.")) {
    const fallbackMarketplace = primaryMarketplace.replace(/^www\./, "");
    if (debugCreators) {
      console.log("[creators] retry marketplace", fallbackMarketplace);
    }
    response = await api.getItems(fallbackMarketplace, request);
    items = Array.isArray(response?.itemsResult?.items) ? response.itemsResult.items : [];
    if (debugCreators) {
      console.log("[creators] retry response", {
        marketplace: fallbackMarketplace,
        items: items.length,
        errors: response?.errors ?? null,
      });
      lastCreatorsDebug = {
        ...(lastCreatorsDebug ?? {}),
        response: {
          ...(lastCreatorsDebug?.response ?? {}),
          getItems: {
            marketplace: fallbackMarketplace,
            items: items.length,
            errors: response?.errors ?? null,
          },
        },
      };
    }
  }

  if (items.length === 0 && response?.errors?.length) {
    throw new Error(extractCreatorsErrorMessage(response.errors));
  }

  return items.map(normalizeCreatorsItem);
}

export async function getAmazonItemsViaCreators(input: GetAmazonItemsInput): Promise<AmazonItem[]> {
  return getItemsViaCreators(input);
}

async function searchItemsViaCreators(
  input: SearchAmazonItemsInput
): Promise<AmazonItem[]> {
  const { sdk, api } = buildCreatorsApi();
  const request = new sdk.SearchItemsRequestContent();

  request.partnerTag = AMAZON_PARTNER_TAG;
  request.keywords = input.keywords;
  request.brand = input.brand;
  request.searchIndex = "All";
  request.itemCount = input.itemCount ?? 10;
  request.itemPage = input.page;
  request.resources = normalizeCreatorsResources(input.resources);

  if (input.range) {
    request.minPrice = normalizeCreatorsPriceFilter(input.range.min);
    request.maxPrice = normalizeCreatorsPriceFilter(input.range.max);
  }

  const response = await api.searchItems(input.marketplace ?? DEFAULT_MARKETPLACE, {
    searchItemsRequestContent: request,
  });
  const items = Array.isArray(response?.searchResult?.items) ? response.searchResult.items : [];

  if (items.length === 0 && response?.errors?.length) {
    throw new Error(extractCreatorsErrorMessage(response.errors));
  }

  return items.map(normalizeCreatorsItem);
}

export async function getAmazonItems(input: GetAmazonItemsInput): Promise<AmazonItem[]> {
  const provider = getConfiguredProvider();

  if (provider === "creators") {
    try {
      return await getItemsViaCreators(input);
    } catch (error) {
      if (AMAZON_DISABLE_PAAPI_FALLBACK) {
        throw error;
      }
      console.warn(
        `[amazon] Creators API indisponivel para GetItems, fallback para PA-API: ${
          getUnknownErrorMessage(error)
        }`
      );
    }
  }

  return getItemsViaPaapi(input);
}

export async function searchAmazonItems(
  input: SearchAmazonItemsInput
): Promise<AmazonItem[]> {
  const provider = getConfiguredProvider();

  // SearchItems com faixa de preco segue na PA-API porque a Creators API no BR
  // ainda devolve NoResults ou itens fora da faixa em varias combinacoes.
  if (provider === "creators" && input.range) {
    return searchItemsViaPaapi(input);
  }

  if (provider === "creators") {
    try {
      return await searchItemsViaCreators(input);
    } catch (error) {
      if (AMAZON_DISABLE_PAAPI_FALLBACK) {
        throw error;
      }
      console.warn(
        `[amazon] Creators API indisponivel para SearchItems, fallback para PA-API: ${
          getUnknownErrorMessage(error)
        }`
      );
    }
  }

  return searchItemsViaPaapi(input);
}
