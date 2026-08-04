ALTER TABLE "DynamicProduct"
  ADD COLUMN "lastUrgentRefreshAt" TIMESTAMP(3);

CREATE INDEX "DynamicProduct_lastUrgentRefreshAt_idx"
  ON "DynamicProduct"("lastUrgentRefreshAt");

CREATE INDEX "PriceRefreshObservation_productId_reason_result_startedAt_idx"
  ON "PriceRefreshObservation"("productId", "reason", "result", "startedAt" DESC);
