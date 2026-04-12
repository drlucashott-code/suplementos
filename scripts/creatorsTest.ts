import "dotenv/config";
import { getAmazonItems, getAmazonItemPrice } from "../src/lib/amazonApiClient";

async function main() {
  process.env.AMAZON_API_PROVIDER = "creators";
  process.env.AMAZON_DISABLE_PAAPI_FALLBACK = "1";

  const asinsArg = process.argv.find((arg) => arg.startsWith("--asins="));
  const asins = asinsArg
    ? asinsArg.replace("--asins=", "").split(",").map((v) => v.trim())
    : ["B09BXLCHF9"];

  const items = await getAmazonItems({
    itemIds: asins,
    resources: [
      "Offers.Listings.Price",
      "Offers.Listings.Type",
      "Offers.Listings.MerchantInfo",
    ],
  });

  console.log(`returned ${items.length}`);
  for (const item of items) {
    console.log(item.ASIN, getAmazonItemPrice(item));
  }
}

main().catch((error) => {
  console.error("Creators test failed:", error);
  process.exit(1);
});
