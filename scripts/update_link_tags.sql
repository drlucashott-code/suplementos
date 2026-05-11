UPDATE "DynamicProduct"
SET "url" = regexp_replace("url", 'tag=amazon\.picks-20', 'tag=amazonpick0af-20', 'g')
WHERE "url" LIKE '%tag=amazon.picks-20%';

UPDATE "Offer"
SET "affiliateUrl" = regexp_replace("affiliateUrl", 'tag=amazon\.picks-20', 'tag=amazonpick0af-20', 'g')
WHERE "affiliateUrl" LIKE '%tag=amazon.picks-20%';

UPDATE "SiteTrackedAmazonProduct"
SET "amazonUrl" = regexp_replace("amazonUrl", 'tag=amazon\.picks-20', 'tag=amazonpick0af-20', 'g')
WHERE "amazonUrl" LIKE '%tag=amazon.picks-20%';

UPDATE "SiteUserMonitoredProduct"
SET "amazonUrl" = regexp_replace("amazonUrl", 'tag=amazon\.picks-20', 'tag=amazonpick0af-20', 'g')
WHERE "amazonUrl" LIKE '%tag=amazon.picks-20%';
