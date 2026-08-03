-- Safe storage optimization: each unique constraint already provides the
-- lookup index for the same (product, date) columns.
-- Apply during a maintenance window. No rows are deleted or changed.
DROP INDEX CONCURRENTLY IF EXISTS "DynamicPriceHistory_productId_date_idx";
DROP INDEX CONCURRENTLY IF EXISTS "SiteTrackedAmazonProductPriceHistory_trackedProductId_date_idx";
