UPDATE "DynamicProduct"
SET "url" = regexp_replace("url", 'tag=amazon\.picks-20', 'tag=amz.picks-20', 'g')
WHERE "url" LIKE '%tag=amazon.picks-20%';

UPDATE "Offer"
SET "affiliateUrl" = regexp_replace("affiliateUrl", 'tag=amazon\.picks-20', 'tag=amz.picks-20', 'g')
WHERE "affiliateUrl" LIKE '%tag=amazon.picks-20%';
