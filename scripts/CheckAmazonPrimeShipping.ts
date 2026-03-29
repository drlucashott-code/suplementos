import "dotenv/config";
import {
  getAmazonItemAffiliateUrl,
  getAmazonItemTitle,
  getAmazonItems,
  getAmazonListingGroups,
  summarizeAmazonListings,
  type AmazonItem,
  type AmazonListing,
} from "../src/lib/amazonApiClient";

const MARKETPLACE = "www.amazon.com.br";

function getCliAsins(): string[] {
  const raw = process.argv.slice(2).join(",");

  return raw
    .split(",")
    .map((value) => value.trim().toUpperCase())
    .filter(Boolean);
}

function getListingPrice(listing: AmazonListing): string {
  const display =
    listing.Price?.DisplayAmount ??
    listing.Price?.Money?.DisplayAmount ??
    (typeof listing.Price?.Amount === "number" ? `R$ ${listing.Price.Amount.toFixed(2)}` : null) ??
    (typeof listing.Price?.Money?.Amount === "number"
      ? `R$ ${listing.Price.Money.Amount.toFixed(2)}`
      : null);

  return display ?? "-";
}

async function run() {
  const asins = getCliAsins();

  if (asins.length === 0) {
    console.log(
      'Uso: npx ts-node scripts/CheckAmazonPrimeShipping.ts "B08YS81WKH" ou "B08YS81WKH,B0CMXQGND5"'
    );
    process.exit(1);
  }

  console.log("===========================================");
  console.log("CHECK AMAZON PRIME / FRETE GRATIS");
  console.log(`Marketplace: ${MARKETPLACE}`);
  console.log(`ASINs: ${asins.join(", ")}`);
  console.log("===========================================\n");

  const items = await getAmazonItems({
    itemIds: asins,
    marketplace: MARKETPLACE,
    resources: [
      "ItemInfo.Title",
      "Offers.Listings.Price",
      "Offers.Listings.MerchantInfo",
      "Offers.Listings.IsBuyBoxWinner",
      "Offers.Listings.DeliveryInfo.IsPrimeEligible",
      "Offers.Listings.DeliveryInfo.IsFreeShippingEligible",
      "Offers.Listings.DeliveryInfo.IsAmazonFulfilled",
      "OffersV2.Listings.Price",
      "OffersV2.Listings.MerchantInfo",
      "OffersV2.Listings.IsBuyBoxWinner",
    ],
  });

  if (items.length === 0) {
    console.log("Nenhum item retornado pela PA-API.");
    return;
  }

  for (const item of items) {
    const groups = getAmazonListingGroups(item);
    const summary = summarizeAmazonListings(groups);

    console.log("--------------------------------------------------");
    console.log(`ASIN: ${item.ASIN ?? "-"}`);
    console.log(`Titulo: ${getAmazonItemTitle(item)}`);
    console.log(`URL: ${getAmazonItemAffiliateUrl(item) || "-"}`);
    console.log(`Listings totais: ${summary.totalListings}`);
    console.log(`Tem algum listing Prime?: ${summary.hasAnyPrime ? "SIM" : "NAO"}`);
    console.log(
      `Tem algum listing com frete gratis?: ${summary.hasAnyFreeShipping ? "SIM" : "NAO"}`
    );
    console.log(
      `Tem algum listing entregue pela Amazon?: ${
        summary.hasAnyAmazonFulfilled ? "SIM" : "NAO"
      }`
    );
    console.log(
      `Tem algum listing vencedor da Buy Box?: ${
        summary.hasAnyBuyBoxWinner ? "SIM" : "NAO"
      }`
    );

    if (groups.length === 0) {
      console.log("Nenhum listing retornado em Offers/OffersV2.");
      continue;
    }

    groups.forEach((group) => {
      console.log(`\n[${group.source}]`);

      group.listings.forEach((listing, index) => {
        console.log(
          [
            `  Listing ${index + 1}:`,
            `preco=${getListingPrice(listing)}`,
            `seller=${listing.MerchantInfo?.Name ?? "-"}`,
            `buyBox=${listing.IsBuyBoxWinner === true ? "SIM" : "NAO"}`,
            `prime=${listing.DeliveryInfo?.IsPrimeEligible === true ? "SIM" : "NAO/SEM CAMPO"}`,
            `freteGratis=${
              listing.DeliveryInfo?.IsFreeShippingEligible === true ? "SIM" : "NAO/SEM CAMPO"
            }`,
            `amazonFulfilled=${
              listing.DeliveryInfo?.IsAmazonFulfilled === true ? "SIM" : "NAO/SEM CAMPO"
            }`,
          ].join(" | ")
        );
      });
    });

    console.log("");
  }
}

run().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error("Erro ao consultar Prime/frete gratis:", message);
  process.exit(1);
});
