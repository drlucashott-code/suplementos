UPDATE "DynamicProduct"
SET "url" = regexp_replace("url", 'tag=amazonpick0af-20', 'tag=amazon.picks-20', 'g')
WHERE "url" LIKE '%tag=amazonpick0af-20%';

UPDATE "Offer"
SET "affiliateUrl" = regexp_replace("affiliateUrl", 'tag=amazonpick0af-20', 'tag=amazon.picks-20', 'g')
WHERE "affiliateUrl" LIKE '%tag=amazonpick0af-20%';

UPDATE "SiteTrackedAmazonProduct"
SET "amazonUrl" = regexp_replace("amazonUrl", 'tag=amazonpick0af-20', 'tag=amazon.picks-20', 'g')
WHERE "amazonUrl" LIKE '%tag=amazonpick0af-20%';

UPDATE "SiteUserMonitoredProduct"
SET "amazonUrl" = regexp_replace("amazonUrl", 'tag=amazonpick0af-20', 'tag=amazon.picks-20', 'g')
WHERE "amazonUrl" LIKE '%tag=amazonpick0af-20%';
