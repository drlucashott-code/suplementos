UPDATE "DynamicProduct"
SET "url" = regexp_replace("url", 'tag=amz\.picks-20', 'tag=amazon.picks-20', 'g')
WHERE "url" LIKE '%tag=amz.picks-20%';

UPDATE "Offer"
SET "affiliateUrl" = regexp_replace("affiliateUrl", 'tag=amz\.picks-20', 'tag=amazon.picks-20', 'g')
WHERE "affiliateUrl" LIKE '%tag=amz.picks-20%';