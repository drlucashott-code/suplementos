import axios from "axios";
import * as cheerio from "cheerio";

export type AmazonDiscoveryMode = "individual" | "multi_brand";
export type AmazonDiscoverySortBy = "best_sellers" | "newest" | "top_rated" | "featured";

export type AmazonDiscoveryQueryPlan = {
  query: string;
  term: string;
  brands: string[];
  brandFilters: string[];
  mode: AmazonDiscoveryMode;
  broadDiscovery: boolean;
  primeOnly: boolean;
  freeDeliveryOnly: boolean;
  ignoreInternational: boolean;
  sortBy: AmazonDiscoverySortBy;
  autoPaging: boolean;
  pageLimit: number;
  maxItemsPerQuery: number;
};

export type AmazonDiscoveryRawHit = {
  asin: string;
  query: string;
  term: string;
  title: string | null;
  brands: string[];
  mode: AmazonDiscoveryMode;
  sortBy: AmazonDiscoverySortBy;
  page: number;
  position: number;
  ratingAverage: number | null;
  reviewCount: number | null;
  sponsored: boolean;
  isPrime: boolean;
  hasFreeDelivery: boolean;
  isInternational: boolean;
  brandGuess: string | null;
};

export type AmazonDiscoveryAggregate = {
  asin: string;
  title: string | null;
  queries: string[];
  sources: AmazonDiscoverySortBy[];
  ratingAverage: number | null;
  reviewCount: number | null;
  position: number | null;
  sponsored: boolean;
  isPrime: boolean;
  hasFreeDelivery: boolean;
  isInternational: boolean;
  brandGuess: string | null;
  timesDetected: number;
  relevanceScore: number;
};

export type AmazonDiscoveryProgress = {
  phase: "searching" | "finalizing";
  completedQueries: number;
  totalQueries: number;
  currentQuery: string;
  currentPage: number;
  currentUrl: string;
  currentCards: number;
  currentAsins: number;
  renderer: "http" | "browser";
};

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";
const REVIEW_SNAPSHOT_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const AMAZON_SEARCH_BASE = "https://www.amazon.com.br/s";
const DEFAULT_PAGE_LIMIT = 2;
const DEFAULT_ITEMS_PER_QUERY = 30;
const DEFAULT_AUTO_PAGE_LIMIT = 10;
const DEFAULT_AUTO_ITEMS_PER_QUERY = 100;
const REVIEW_REQUEST_DELAY_MIN_MS = 4500;
const REVIEW_REQUEST_DELAY_MAX_MS = 9000;

const SORT_BY_TO_AMAZON_PARAM: Record<AmazonDiscoverySortBy, string | null> = {
  best_sellers: "exact-aware-popularity-rank",
  newest: "date-desc-rank",
  top_rated: "review-rank",
  featured: null,
};
const PRIME_FILTER_VALUE = "19171728011";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function randomBetween(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function sleepWithJitter(min: number, max: number) {
  await sleep(randomBetween(min, max));
}

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeAsin(value: string) {
  return value.trim().toUpperCase();
}

function isValidAsin(value: string) {
  return /^[A-Z0-9]{10}$/.test(value);
}

function buildSearchUrl(plan: AmazonDiscoveryQueryPlan, page: number) {
  const params = new URLSearchParams();
  params.set("k", plan.query);
  params.set("i", "aps");
  params.set("page", String(page));

  const sortParam = SORT_BY_TO_AMAZON_PARAM[plan.sortBy];
  const rhValues: string[] = [];
  if (sortParam) {
    params.set("s", sortParam);
  }

  if (plan.primeOnly) {
    rhValues.push(`p_85:${PRIME_FILTER_VALUE}`);
  }

  if (plan.brandFilters.length > 0) {
    rhValues.push(`p_123:${plan.brandFilters.map((value) => encodeURIComponent(value)).join("%7C")}`);
  }

  if (rhValues.length > 0) {
    params.set("rh", rhValues.join(","));
  }

  if (plan.primeOnly) {
    params.set("dc", "");
    params.set("rnid", "19171727011");
    params.set("ref", `sr_st_${sortParam ?? "featured"}`);
  }

  const qid = Math.floor(Date.now() / 1000);
  const crid = Buffer.from(`${plan.term}:${plan.sortBy}:${page}`).toString("base64url").slice(0, 12).toUpperCase();
  params.set("crid", crid);
  params.set("qid", String(qid));

  const prefix = plan.term.split(/\s+/g).filter(Boolean).slice(0, 2).join(",");
  if (prefix) {
    params.set("sprefix", `${prefix},aps,223`);
  }

  return `${AMAZON_SEARCH_BASE}?${params.toString()}`;
}

function isBlockedHtml(html: string) {
  const text = html.toLowerCase();
  return [
    "validatecaptcha",
    "not a robot",
    "sorry, we just need to make sure you're not a robot",
    "digite os caracteres que voce ve abaixo",
    "digite os caracteres que voc\u00EA v\u00EA abaixo",
    "insira os caracteres que voce ve abaixo",
    "insira os caracteres que voc\u00EA v\u00EA abaixo",
  ].some((signal) => text.includes(signal));
}

function firstNonEmpty(values: Array<string | null | undefined>) {
  for (const value of values) {
    const normalized = (value ?? "").trim();
    if (normalized) return normalized;
  }
  return "";
}

function detectInternationalListing($: cheerio.CheerioAPI, element: cheerio.Cheerio<any>) {
  const cardText = element.text();
  const cardHtml = element.html() ?? "";
  const imageSrcs = element
    .find("img")
    .map((_, img) =>
      [$(img).attr("src"), $(img).attr("data-src"), $(img).attr("srcset")].filter(Boolean).join(" ")
    )
    .get()
    .join(" ");

  const internationalSignals = [
    /compra internacional/i,
    /international/i,
    /11tVhj88LYL\.png/i,
    /m\.media-amazon\.com\/images\/I\/11tVhj88LYL\.png/i,
  ];

  return internationalSignals.some((signal) => signal.test(cardText) || signal.test(cardHtml) || signal.test(imageSrcs));
}

function detectFreeDeliveryListing($: cheerio.CheerioAPI, element: cheerio.Cheerio<any>) {
  const cardText = element.text();
  const cardHtml = element.html() ?? "";
  const cardCombined = `${cardText}\n${cardHtml}`;

  const deliverySignals = [
    /entrega\s+gr[áa]tis/i,
    /frete\s+gr[áa]tis/i,
    /free\s+delivery/i,
    /free\s+shipping/i,
  ];

  return deliverySignals.some((signal) => signal.test(cardCombined));
}

function extractBrandGuess(title: string, knownBrands: string[]) {
  const normalizedTitle = normalizeText(title);
  const matchedBrand = knownBrands.find((brand) => normalizedTitle.includes(normalizeText(brand)));
  if (matchedBrand) return matchedBrand;

  const leadingSegment = title.split(/[-|:]/)[0]?.trim() ?? "";
  if (leadingSegment.length >= 2 && leadingSegment.length <= 48) {
    return leadingSegment;
  }

  return null;
}

function extractBrandFacetFilters(html: string) {
  const $ = cheerio.load(html);
  const facets = new Map<string, string>();

  $("a[href*='p_123']").each((_, element) => {
    const href = $(element).attr("href") ?? "";
    const text = firstNonEmpty([
      $(element).text(),
      $(element).attr("aria-label"),
      $(element).attr("title"),
    ]);
    const decodedHref = decodeURIComponent(href);
    const match = decodedHref.match(/p_123[:=]([^,&]+)/i);
    if (!match || !text) return;

    const brandName = text.replace(/\s+\(\d+\)\s*$/u, "").trim();
    const filterValue = decodeFacetValue(match[1] ?? "").trim();
    if (!brandName || !filterValue) return;

    const normalized = normalizeText(brandName);
    if (!facets.has(normalized)) {
      facets.set(normalized, filterValue);
    }
  });

  return facets;
}

function decodeFacetValue(value: string) {
  let current = value.trim();

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const next = decodeURIComponent(current);
      if (next === current) {
        break;
      }
      current = next;
    } catch {
      break;
    }
  }

  return current.replace(/%7C/gi, "|");
}

function hasNextSearchPage(html: string) {
  const $ = cheerio.load(html);
  return (
    $("a.s-pagination-next:not(.s-pagination-disabled)").length > 0 ||
    $("a[aria-label*='próxima'], a[aria-label*='proxima'], a[aria-label*='next']").length > 0 ||
    $("li.a-last:not(.a-disabled) a").length > 0 ||
    $("ul.a-pagination li.a-last:not(.a-disabled)").length > 0
  );
}

function parseRatingCount(raw: string) {
  const rating = raw
    ? Number.parseFloat(raw.split(" ")[0]?.replace(",", ".") ?? "")
    : Number.NaN;
  return Number.isFinite(rating) ? rating : null;
}

function parseReviewCount(raw: string) {
  const normalized = raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

  const compactMatch = normalized.match(/(\d+(?:[.,]\d+)?)\s*(mil|k)\b/);
  if (compactMatch) {
    const base = Number.parseFloat(compactMatch[1]?.replace(",", ".") ?? "");
    if (Number.isFinite(base)) {
      return Math.round(base * 1000);
    }
  }

  const numberMatch = normalized.match(/\d[\d.,]*/);
  if (!numberMatch) return null;

  const digitsOnly = numberMatch[0].replace(/[^\d]/g, "");
  const count = Number.parseInt(digitsOnly, 10);
  return Number.isFinite(count) ? count : null;
}

function getFirstText($: cheerio.CheerioAPI, selectors: string[]) {
  for (const selector of selectors) {
    const value = $(selector).first().text().trim();
    if (value) {
      return value;
    }
  }

  return "";
}

function getFirstAttr(
  $: cheerio.CheerioAPI,
  selectors: Array<{ selector: string; attr: string }>
) {
  for (const entry of selectors) {
    const value = $(entry.selector).first().attr(entry.attr)?.trim();
    if (value) {
      return value;
    }
  }

  return "";
}

function isBlockedResponse(html: string) {
  const normalized = html.toLowerCase();

  return [
    "validatecaptcha",
    "not a robot",
    "digite os caracteres que voce ve abaixo",
    "digite os caracteres que vocÃª vÃª abaixo",
    "insira os caracteres que voce ve abaixo",
    "insira os caracteres que vocÃª vÃª abaixo",
    "sorry, we just need to make sure you're not a robot",
    "enter the characters you see below",
    "automated access to amazon data",
  ].some((signal) => normalized.includes(signal));
}

function hasProductPageSignals($: cheerio.CheerioAPI) {
  return Boolean(
    getFirstText($, ["#productTitle", "[data-feature-name='title'] h1", "#title"]) ||
      getFirstAttr($, [{ selector: "#dp", attr: "data-asin" }]) ||
      getFirstText($, ["#centerCol", "#ppd"])
  );
}

type AmazonReviewSnapshot = {
  ratingAverage: number | null;
  reviewCount: number | null;
};

function getFirstTextBySelectors($: cheerio.CheerioAPI, selectors: string[]) {
  for (const selector of selectors) {
    const value = $(selector).first().text().trim();
    if (value) {
      return value;
    }
  }

  return "";
}

async function fetchAmazonReviewSnapshotOnce(asin: string): Promise<AmazonReviewSnapshot> {
  const url = `https://www.amazon.com.br/dp/${asin}`;

  const { data } = await axios.get<string>(url, {
    headers: {
      "User-Agent": REVIEW_SNAPSHOT_USER_AGENT,
      "Accept-Language": "pt-BR,pt;q=0.9",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
    },
    timeout: 15000,
  });

  if (typeof data !== "string" || data.trim() === "") {
    return { ratingAverage: null, reviewCount: null };
  }

  if (isBlockedHtml(data) || isBlockedResponse(data)) {
    return { ratingAverage: null, reviewCount: null };
  }

  const $ = cheerio.load(data);

  const ratingText =
    $("#acrPopover").attr("title") ||
    getFirstTextBySelectors($, [
      "[data-hook='average-star-rating'] .a-icon-alt",
      "[data-hook='rating-out-of-text']",
      "#acrPopover .a-icon-alt",
      "span.a-icon-alt",
    ]);

  const countRaw = getFirstTextBySelectors($, [
    "#acrCustomerReviewText",
    "[data-hook='total-review-count']",
    "#acrCustomerReviewLink",
  ]);

  const ratingAverage = ratingText
    ? Number.parseFloat(ratingText.split(" ")[0]?.replace(",", ".") ?? "")
    : null;
  const reviewCount = parseReviewCount(countRaw);

  if (ratingAverage === null && reviewCount === null && !hasProductPageSignals($)) {
    return { ratingAverage: null, reviewCount: null };
  }

  return {
    ratingAverage: Number.isFinite(ratingAverage ?? NaN) ? ratingAverage : null,
    reviewCount,
  };
}

export async function fetchAmazonReviewSnapshot(asin: string): Promise<AmazonReviewSnapshot> {
  let lastSnapshot: AmazonReviewSnapshot = { ratingAverage: null, reviewCount: null };

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const snapshot = await fetchAmazonReviewSnapshotOnce(asin);
    lastSnapshot = snapshot;

    if (snapshot.ratingAverage !== null && snapshot.reviewCount !== null) {
      return snapshot;
    }

    if (attempt < 1) {
      await sleepWithJitter(REVIEW_REQUEST_DELAY_MIN_MS, REVIEW_REQUEST_DELAY_MAX_MS);
    }
  }

  return lastSnapshot;
}

function collectSearchCards($: cheerio.CheerioAPI) {
  const cards = $("div[data-component-type='s-search-result'][data-asin]")
    .toArray()
    .filter((element) => {
      const asin = normalizeAsin($(element).attr("data-asin") ?? "");
      return isValidAsin(asin);
    });

  if (cards.length > 0) {
    return cards;
  }

  return $("div.s-result-item[data-asin]").toArray().filter((element) => {
    const asin = normalizeAsin($(element).attr("data-asin") ?? "");
    return isValidAsin(asin);
  });
}

function parseSearchResults(
  html: string,
  plan: AmazonDiscoveryQueryPlan,
  page: number,
  knownBrands: string[]
): AmazonDiscoveryRawHit[] {
  const $ = cheerio.load(html);
  const cards = collectSearchCards($);

  const results: AmazonDiscoveryRawHit[] = [];

  cards.forEach((element, index) => {
    const asin = normalizeAsin($(element).attr("data-asin") ?? "");
    if (!isValidAsin(asin)) return;

    const title = firstNonEmpty([
      $(element).find("h2 a span").first().text(),
      $(element).find("h2 span").first().text(),
      $(element).find("a h2 span").first().text(),
    ]);
    const text = $(element).text();

    const ratingText = firstNonEmpty([
      $(element).find("span.a-icon-alt").first().text(),
      $(element).find("[data-hook='rating-out-of-text']").first().text(),
      $(element).find("a[aria-label*='out of 5 stars']").first().attr("aria-label") ?? "",
      $(element).find("a[title*='out of 5 stars']").first().attr("title") ?? "",
      $(element).find("i[aria-label*='out of 5 stars']").first().attr("aria-label") ?? "",
    ]);
    const reviewText = firstNonEmpty([
      $(element).find("span.a-size-base.s-underline-text").first().text(),
      $(element).find("span.a-size-base.a-color-base.s-underline-text").first().text(),
      $(element).find("a[href*='/product-reviews/']").first().attr("aria-label") ?? "",
      $(element).find("a[href*='/customer-reviews/']").first().attr("aria-label") ?? "",
      $(element).find("a[href*='/product-reviews/']").first().attr("title") ?? "",
      $(element).find("a[href*='/customer-reviews/']").first().attr("title") ?? "",
      $(element).find("a[href*='/customer-reviews/'] span").first().text(),
      $(element).find("[data-hook='total-review-count']").first().text(),
      $(element).find("#acrCustomerReviewText").first().text(),
      $(element).find("#acrCustomerReviewLink").first().text(),
      $(element).find("span[aria-label*='ratings']").first().attr("aria-label") ?? "",
      $(element).find("span[aria-label*='reviews']").first().attr("aria-label") ?? "",
      $(element).find("span.a-color-secondary").filter((_, node) => {
        const text = $(node).text().trim();
        return /avali|review/i.test(text);
      }).first().text(),
    ]);
    const reviewTextFallback = reviewText || firstNonEmpty([
      text.match(/\(\s*\d[\d.,]*\s*(?:mil|k)?\s*\)/i)?.[0] ?? "",
      text.match(/\b\d[\d.,]*\s*(?:mil|k)\b/i)?.[0] ?? "",
      text.match(/\d[\d.,]*\s+(?:avalia(?:ç|c)ões?|reviews?)/i)?.[0] ?? "",
      text.match(/\b(?:avalia(?:ç|c)ões?|reviews?)\b.*?\d[\d.,]*/i)?.[0] ?? "",
    ]);

    const sponsored =
      /patrocinad|sponsored/i.test(text) ||
      $(element).find("span.puis-sponsored-label-text").length > 0 ||
      $(element).find("[data-component-type='sp-sponsored-result']").length > 0;

    const isInternational = detectInternationalListing($, $(element));
    const isPrime = /prime/i.test(text);
    const hasFreeDelivery = detectFreeDeliveryListing($, $(element));
    const brandGuess = title ? extractBrandGuess(title, knownBrands) : null;

    results.push({
      asin,
      query: plan.query,
      term: plan.term,
      title: title || null,
      brands: plan.brands,
      mode: plan.mode,
      sortBy: plan.sortBy,
      page,
      position: results.length + 1 + (page - 1) * 10,
      ratingAverage: parseRatingCount(ratingText),
      reviewCount: parseReviewCount(reviewTextFallback),
      sponsored,
      isPrime,
      hasFreeDelivery,
      isInternational,
      brandGuess,
    });
  });

  return results;
}

async function fetchSearchPage(url: string) {
  async function fetchWithAxios() {
    const response = await axios.get<string>(url, {
      headers: {
        "User-Agent": USER_AGENT,
        "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.7,en;q=0.6",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      },
      timeout: 20000,
    });

    const html = typeof response.data === "string" ? response.data : "";
    if (!html.trim()) {
      throw new Error("amazon_discovery_empty_response");
    }

    if (isBlockedHtml(html)) {
      throw new Error("amazon_discovery_blocked");
    }

    return {
      html,
      cards: collectSearchCards(cheerio.load(html)).length,
      renderer: "http" as const,
    };
  }

  async function fetchWithPlaywright() {
    const { chromium } = await import("playwright");
    const browser = await chromium.launch({
      headless: true,
    });

    try {
      const page = await browser.newPage({
        viewport: { width: 1440, height: 1600 },
        userAgent: USER_AGENT,
        locale: "pt-BR",
      });

      await page.goto(url, {
        waitUntil: "domcontentloaded",
        timeout: 60000,
      });
      await page.waitForTimeout(5000);

      const cardLocator = page.locator("div[data-component-type='s-search-result'][data-asin]");
      const cardCount = await cardLocator.count();
      const html = await page.content();
      if (!html.trim()) {
        throw new Error("amazon_discovery_empty_response");
      }

      if (isBlockedHtml(html)) {
        throw new Error("amazon_discovery_blocked");
      }

      return {
        html,
        cards: cardCount > 0 ? cardCount : collectSearchCards(cheerio.load(html)).length,
        renderer: "browser" as const,
      };
    } finally {
      await browser.close();
    }
  }

  let response = await fetchWithPlaywright().catch(async () => fetchWithAxios());

  if (response.cards <= 2) {
    try {
      const axiosResponse = await fetchWithAxios();
      if (axiosResponse.cards > response.cards) {
        response = axiosResponse;
      }
    } catch {
      // If the HTTP fallback fails, keep the browser result so the caller can decide.
    }
  }

  return response;
}

async function fetchBrandFacetMap(url: string, wantedBrands: string[]) {
  const wantedSet = new Set(wantedBrands.map((brand) => normalizeText(brand)));
  const { chromium } = await import("playwright");
  const browser = await chromium.launch({
    headless: true,
  });

  try {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1600 },
      userAgent: USER_AGENT,
      locale: "pt-BR",
    });

    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
    await page.waitForTimeout(5000);

    const facets = new Map<string, string>();
    const observedSets = new Map<string, Set<string>>();
    const brandLinks = page.locator("#s-refinements a[href*='p_123']");
    const count = await brandLinks.count();

    for (let index = 0; index < count; index += 1) {
      const link = brandLinks.nth(index);
      const text = firstNonEmpty([
        await link.innerText().catch(() => ""),
        await link.getAttribute("aria-label"),
        await link.getAttribute("title"),
      ]);
      if (!text) continue;

      const brandName = text.replace(/\s+\(\d+\)\s*$/u, "").trim();
      if (!brandName || !wantedSet.has(normalizeText(brandName))) continue;

      const href = await link.getAttribute("href");
      if (!href) continue;

      const decodedHref = decodeURIComponent(href);
        const match = decodedHref.match(/p_123[:=]([^,&]+)/i);
        if (!match) continue;

        const filterValues = decodeFacetValue(match[1] ?? "")
          .split("|")
          .map((value) => value.trim())
          .filter(Boolean);

      if (filterValues.length === 0) continue;
      observedSets.set(normalizeText(brandName), new Set(filterValues));
    }

    const unionValues = new Set<string>();
    for (const values of observedSets.values()) {
      values.forEach((value) => unionValues.add(value));
    }

    for (const [brandName, values] of observedSets.entries()) {
      if (values.size === 1) {
        const [onlyValue] = [...values];
        if (onlyValue) {
          facets.set(brandName, onlyValue);
          continue;
        }
      }

      const missing = [...unionValues].filter((value) => !values.has(value));
      if (missing.length === 1) {
        facets.set(brandName, missing[0]!);
      }
    }

    return facets;
  } finally {
    await browser.close();
  }
}

export function buildAmazonDiscoveryQueryPlans(input: {
  searchTerms: string[];
  brands: string[];
  mode: AmazonDiscoveryMode;
  broadDiscovery: boolean;
  primeOnly: boolean;
  freeDeliveryOnly: boolean;
  ignoreInternational: boolean;
  sortModes: AmazonDiscoverySortBy[];
  autoMaxPages?: boolean;
  maxPages?: number;
  autoMaxItemsPerQuery?: boolean;
  maxItemsPerQuery?: number;
}) {
  const terms = Array.from(
    new Set(input.searchTerms.map((term) => term.trim()).filter(Boolean))
  );
  const brands = Array.from(new Set(input.brands.map((brand) => brand.trim()).filter(Boolean)));
  const sortModes: AmazonDiscoverySortBy[] =
    input.sortModes.length > 0 ? input.sortModes : ["best_sellers"];

  const plans: AmazonDiscoveryQueryPlan[] = [];
  const autoPaging = input.autoMaxPages ?? true;
  const autoItems = input.autoMaxItemsPerQuery ?? true;

  for (const term of terms) {
    for (const sortBy of sortModes) {
      const brandQueries =
        input.mode === "individual"
          ? brands.map((brand) => ({
              query: term,
              brands: [brand],
              brandFilters: [],
            }))
          : brands.length > 0
            ? [
                {
                  query: term,
                  brands,
                  brandFilters: [],
                },
              ]
            : [{ query: term, brands: [], brandFilters: [] }];

      for (const entry of brandQueries) {
        plans.push({
          query: entry.query,
          term,
          brands: entry.brands,
          brandFilters: entry.brandFilters,
          mode: input.mode,
          broadDiscovery: input.broadDiscovery,
          primeOnly: input.primeOnly,
          freeDeliveryOnly: input.freeDeliveryOnly,
          ignoreInternational: input.ignoreInternational,
          sortBy,
          autoPaging,
          pageLimit: autoPaging ? DEFAULT_AUTO_PAGE_LIMIT : input.maxPages ?? DEFAULT_PAGE_LIMIT,
          maxItemsPerQuery: autoItems
            ? DEFAULT_AUTO_ITEMS_PER_QUERY
            : input.maxItemsPerQuery ?? DEFAULT_ITEMS_PER_QUERY,
        });
      }

      if (input.broadDiscovery || brands.length === 0) {
        plans.push({
          query: term,
          term,
          brands: [],
          brandFilters: [],
          mode: input.mode,
          broadDiscovery: input.broadDiscovery,
          primeOnly: input.primeOnly,
          freeDeliveryOnly: input.freeDeliveryOnly,
          ignoreInternational: input.ignoreInternational,
          sortBy,
          autoPaging,
          pageLimit: autoPaging ? DEFAULT_AUTO_PAGE_LIMIT : input.maxPages ?? DEFAULT_PAGE_LIMIT,
          maxItemsPerQuery: autoItems
            ? DEFAULT_AUTO_ITEMS_PER_QUERY
            : input.maxItemsPerQuery ?? DEFAULT_ITEMS_PER_QUERY,
        });
      }
    }
  }

  const uniquePlanMap = new Map<string, AmazonDiscoveryQueryPlan>();
  for (const plan of plans) {
    const key = [
      plan.query,
      plan.sortBy,
      plan.mode,
      plan.broadDiscovery ? "broad" : "narrow",
      plan.primeOnly ? "prime" : "all",
      plan.freeDeliveryOnly ? "delivery" : "delivery-off",
      plan.ignoreInternational ? "international-off" : "international-on",
      plan.brands.join("\u0001"),
      plan.brandFilters.join("\u0001"),
    ].join("::");
    if (!uniquePlanMap.has(key)) {
      uniquePlanMap.set(key, plan);
    }
  }

  return [...uniquePlanMap.values()];
}

export function aggregateAmazonDiscoveryHits(hits: AmazonDiscoveryRawHit[]) {
  const byAsin = new Map<string, AmazonDiscoveryAggregate & { queriesSet: Set<string>; sourcesSet: Set<AmazonDiscoverySortBy> }>();

  for (const hit of hits) {
    const current = byAsin.get(hit.asin) ?? {
      asin: hit.asin,
      title: hit.title,
      queries: [],
      sources: [],
      ratingAverage: null,
      reviewCount: null,
      position: null,
      sponsored: false,
      isPrime: false,
      hasFreeDelivery: false,
      isInternational: false,
      brandGuess: null,
      timesDetected: 0,
      relevanceScore: 0,
      queriesSet: new Set<string>(),
      sourcesSet: new Set<AmazonDiscoverySortBy>(),
    };

    current.timesDetected += 1;
    current.queriesSet.add(hit.query);
    current.sourcesSet.add(hit.sortBy);
    current.sponsored = current.sponsored || hit.sponsored;
    current.isPrime = current.isPrime || hit.isPrime;
    current.hasFreeDelivery = current.hasFreeDelivery || hit.hasFreeDelivery;
    current.isInternational = current.isInternational || hit.isInternational;
    current.position = current.position === null ? hit.position : Math.min(current.position, hit.position);
    current.ratingAverage = current.ratingAverage ?? hit.ratingAverage;
    current.reviewCount = Math.max(current.reviewCount ?? 0, hit.reviewCount ?? 0) || null;
    if (!current.brandGuess && hit.brandGuess) {
      current.brandGuess = hit.brandGuess;
    }
    if (!current.title && hit.title) {
      current.title = hit.title;
    }

    current.relevanceScore = scoreDiscoveryAggregate({
      asin: current.asin,
      queries: [...current.queriesSet],
      sources: [...current.sourcesSet],
      ratingAverage: current.ratingAverage,
      reviewCount: current.reviewCount,
      position: current.position,
      sponsored: current.sponsored,
      isPrime: current.isPrime,
      hasFreeDelivery: current.hasFreeDelivery,
      isInternational: current.isInternational,
      brandGuess: current.brandGuess,
      timesDetected: current.timesDetected,
      relevanceScore: 0,
    });

    byAsin.set(hit.asin, current);
  }

  return [...byAsin.values()]
    .map(({ queriesSet, sourcesSet, ...rest }) => ({
      ...rest,
      queries: [...queriesSet],
      sources: [...sourcesSet],
    }))
    .sort((a, b) => b.relevanceScore - a.relevanceScore || (a.position ?? 9999) - (b.position ?? 9999));
}

export function scoreDiscoveryAggregate(input: {
  ratingAverage: number | null;
  reviewCount: number | null;
  position: number | null;
  sponsored: boolean;
  isPrime: boolean;
  hasFreeDelivery?: boolean;
  isInternational: boolean;
  timesDetected: number;
  sources: AmazonDiscoverySortBy[];
  queries: string[];
  brandGuess: string | null;
  asin: string;
  relevanceScore: number;
}) {
  const sourceWeight = input.sources.reduce((total, source) => {
    const weight =
      source === "best_sellers"
        ? 32
        : source === "newest"
          ? 24
          : source === "top_rated"
            ? 20
            : 12;
    return total + weight;
  }, 0);

  const ratingWeight = (input.ratingAverage ?? 0) * 14;
  const reviewWeight = Math.log10((input.reviewCount ?? 0) + 1) * 16;
  const positionWeight = input.position ? Math.max(0, 30 - input.position) * 2 : 0;
  const timesWeight = Math.max(0, input.timesDetected - 1) * 8;
  const queryWeight = Math.max(0, input.queries.length - 1) * 5;
  const primeWeight = input.isPrime ? 8 : 0;
  const sponsoredPenalty = input.sponsored ? -6 : 0;
  const internationalPenalty = input.isInternational ? -18 : 0;
  const brandWeight = input.brandGuess ? 2 : 0;

  return Math.round(
    sourceWeight +
      ratingWeight +
      reviewWeight +
      positionWeight +
      timesWeight +
      queryWeight +
      primeWeight +
      sponsoredPenalty +
      internationalPenalty +
      brandWeight
  );
}

export async function runAmazonDiscoveryPlan(input: {
  searchTerms: string[];
  brands: string[];
  mode: AmazonDiscoveryMode;
  broadDiscovery: boolean;
  primeOnly: boolean;
  freeDeliveryOnly: boolean;
  ignoreInternational: boolean;
  sortModes: AmazonDiscoverySortBy[];
  autoMaxPages?: boolean;
  maxPages?: number;
  autoMaxItemsPerQuery?: boolean;
  maxItemsPerQuery?: number;
  knownBrands?: string[];
  onProgress?: (progress: AmazonDiscoveryProgress) => void | Promise<void>;
}) {
  const plans = buildAmazonDiscoveryQueryPlans(input);
  const knownBrands = input.knownBrands ?? [];
  const totalQueries = plans.reduce((sum, plan) => sum + plan.pageLimit, 0);
  const rawHits: AmazonDiscoveryRawHit[] = [];
  const queryStats: Array<{
    query: string;
    url: string;
    sortBy: AmazonDiscoverySortBy;
    page: number;
    cards: number;
    validAsins: number;
    hits: number;
    renderer: "http" | "browser";
  }> = [];
  const facetCache = new Map<string, Map<string, string>>();
  const reviewCache = new Map<string, Promise<AmazonReviewSnapshot>>();

  async function resolveBrandFiltersForTerm(plan: AmazonDiscoveryQueryPlan) {
    const cacheKey = [
      normalizeText(plan.term),
      plan.primeOnly ? "prime" : "all",
      plan.sortBy,
        [...plan.brands].map((brand) => normalizeText(brand)).sort().join("|"),
      ].join("::");
    const cached = facetCache.get(cacheKey);
    if (cached) return cached;

    const wantedBrands = Array.from(
      new Set(plan.brands.map((brand) => normalizeText(brand)).filter(Boolean))
    );
    const referenceSorts = Array.from(
      new Set<AmazonDiscoverySortBy>([
        plan.sortBy,
        "featured",
        "best_sellers",
        "top_rated",
        "newest",
      ])
    );

    let bestFacets = new Map<string, string>();

    for (const referenceSort of referenceSorts) {
      const lookupPlan: AmazonDiscoveryQueryPlan = {
        ...plan,
        query: plan.term,
        brands: [],
        brandFilters: [],
        autoPaging: false,
        pageLimit: 1,
        maxItemsPerQuery: 1,
        sortBy: referenceSort,
      };

      const facets = await fetchBrandFacetMap(buildSearchUrl(lookupPlan, 1), plan.brands);
      if (facets.size > bestFacets.size) {
        bestFacets = facets;
      }

      const hasAllWantedBrands =
        wantedBrands.length > 0 && wantedBrands.every((brand) => facets.has(brand));
      if (hasAllWantedBrands || wantedBrands.length === 0) {
        facetCache.set(cacheKey, facets);
        return facets;
      }
    }

    facetCache.set(cacheKey, bestFacets);
    return bestFacets;
  }

  for (const [planIndex, plan] of plans.entries()) {
    if (input.onProgress) {
      await input.onProgress({
        phase: "searching",
        completedQueries: queryStats.length,
        totalQueries,
        currentQuery: `Preparando ${plan.term}`,
        currentPage: 0,
        currentUrl: "",
        currentCards: 0,
        currentAsins: 0,
        renderer: "browser",
      });
    }

    const brandFacetMap = plan.brands.length > 0 ? await resolveBrandFiltersForTerm(plan) : null;
    const brandFilters = brandFacetMap
      ? plan.brands
          .map((brand) => brandFacetMap.get(normalizeText(brand)) ?? null)
          .filter((value): value is string => Boolean(value))
      : [];
    const effectivePlan: AmazonDiscoveryQueryPlan = {
      ...plan,
      query: plan.term,
      brandFilters,
    };

    for (let page = 1; page <= plan.pageLimit; page += 1) {
      const url = buildSearchUrl(effectivePlan, page);
      if (input.onProgress) {
        await input.onProgress({
          phase: "searching",
          completedQueries: queryStats.length,
          totalQueries,
          currentQuery: effectivePlan.query,
          currentPage: page,
          currentUrl: url,
          currentCards: 0,
          currentAsins: 0,
          renderer: "browser",
        });
      }
      const { html, renderer, cards } = await fetchSearchPage(url);
      const filteredPageHits = parseSearchResults(html, effectivePlan, page, knownBrands)
        .filter((hit) => !(plan.ignoreInternational && hit.isInternational))
        .filter((hit) => (plan.primeOnly ? hit.isPrime : true))
        .filter((hit) => (plan.freeDeliveryOnly ? hit.hasFreeDelivery : true))
        .slice(0, plan.maxItemsPerQuery);
      const pageHits = filteredPageHits;

      rawHits.push(...pageHits);
      queryStats.push({
        query: effectivePlan.query,
        url,
        sortBy: effectivePlan.sortBy,
        page,
        cards,
        validAsins: pageHits.length,
        hits: pageHits.length,
        renderer,
      });

      if (input.onProgress) {
        await input.onProgress({
          phase: "searching",
          completedQueries: queryStats.length,
          totalQueries,
          currentQuery: effectivePlan.query,
          currentPage: page,
          currentUrl: url,
          currentCards: cards,
          currentAsins: pageHits.length,
          renderer,
        });
      }

      const hasNextPage = plan.autoPaging ? hasNextSearchPage(html) : page < plan.pageLimit;

      if (pageHits.length === 0 || pageHits.length < 10 || !hasNextPage) {
        break;
      }

      if (page < plan.pageLimit) {
        await sleep(900);
      }
    }

    if (planIndex < plans.length - 1) {
      await sleep(1200);
    }
  }

  return {
    plans,
    rawHits,
    aggregated: aggregateAmazonDiscoveryHits(rawHits),
    queryStats,
  };
}
