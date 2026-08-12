CREATE TABLE IF NOT EXISTS "DynamicTopOfferClickEvent" (
  "id" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "visitorId" TEXT NOT NULL,
  "asin" TEXT NOT NULL,
  "productName" TEXT NOT NULL,
  "categoryName" TEXT,
  "pagePath" TEXT,
  "displayedPrice" DECIMAL(12,2),
  "displayedDiscount" DECIMAL(6,2),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DynamicTopOfferClickEvent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "DynamicTopOfferClickEvent_sessionId_fkey"
    FOREIGN KEY ("sessionId") REFERENCES "DynamicClickSession"("sessionId")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "DynamicTopOfferClickEvent_sessionId_createdAt_idx"
  ON "DynamicTopOfferClickEvent"("sessionId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "DynamicTopOfferClickEvent_asin_createdAt_idx"
  ON "DynamicTopOfferClickEvent"("asin", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "DynamicTopOfferClickEvent_createdAt_idx"
  ON "DynamicTopOfferClickEvent"("createdAt" DESC);
