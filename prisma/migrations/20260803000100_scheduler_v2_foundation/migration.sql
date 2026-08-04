-- Scheduler V2 foundation. This migration is additive and leaves every
-- existing product on the legacy policy until an explicit rollout changes it.

ALTER TABLE "DynamicProduct"
  ADD COLUMN "refreshClaimToken" TEXT,
  ADD COLUMN "schedulerVersion" TEXT NOT NULL DEFAULT 'legacy',
  ADD COLUMN "schedulerRevision" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "schedulerBaseIntervalMinutes" INTEGER,
  ADD COLUMN "schedulerBootstrapObservationCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "schedulerBootstrapSawChange" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "schedulerFirstBaseObservationAt" TIMESTAMP(3),
  ADD COLUMN "lastBaseRefreshAt" TIMESTAMP(3),
  ADD COLUMN "lastBaseSuccessfulRefreshAt" TIMESTAMP(3),
  ADD COLUMN "basePriceChangeRate30d" DOUBLE PRECISION;

CREATE INDEX "DynamicProduct_schedulerVersion_nextPriceRefreshAt_idx"
  ON "DynamicProduct"("schedulerVersion", "nextPriceRefreshAt");

CREATE INDEX "DynamicProduct_refreshLockUntil_idx"
  ON "DynamicProduct"("refreshLockUntil");

CREATE TABLE "PriceRefreshObservation" (
  "id" TEXT NOT NULL,
  "attemptId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "schedulerVersion" TEXT NOT NULL,
  "scheduledAt" TIMESTAMP(3),
  "startedAt" TIMESTAMP(3) NOT NULL,
  "finishedAt" TIMESTAMP(3),
  "durationMs" INTEGER,
  "baseIntervalMinutes" INTEGER,
  "decisionReason" TEXT,
  "decisionEvidence" JSONB,
  "observedPrice" DOUBLE PRECISION,
  "priceChanged" BOOLEAN,
  "result" TEXT NOT NULL,
  "errorCode" TEXT,
  "workerId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PriceRefreshObservation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PriceRefreshObservation_attemptId_key"
  ON "PriceRefreshObservation"("attemptId");
CREATE INDEX "PriceRefreshObservation_productId_startedAt_idx"
  ON "PriceRefreshObservation"("productId", "startedAt" DESC);
CREATE INDEX "PriceRefreshObservation_reason_startedAt_idx"
  ON "PriceRefreshObservation"("reason", "startedAt" DESC);
CREATE INDEX "PriceRefreshObservation_schedulerVersion_startedAt_idx"
  ON "PriceRefreshObservation"("schedulerVersion", "startedAt" DESC);
CREATE INDEX "PriceRefreshObservation_result_startedAt_idx"
  ON "PriceRefreshObservation"("result", "startedAt" DESC);

CREATE TABLE "PriceRefreshScheduleDecision" (
  "id" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "schedulerVersion" TEXT NOT NULL,
  "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "currentScheduledAt" TIMESTAMP(3),
  "proposedScheduledAt" TIMESTAMP(3) NOT NULL,
  "intervalMinutes" INTEGER NOT NULL,
  "reason" TEXT NOT NULL,
  "evidence" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PriceRefreshScheduleDecision_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PriceRefreshScheduleDecision_productId_schedulerVersion_key"
  ON "PriceRefreshScheduleDecision"("productId", "schedulerVersion");
CREATE INDEX "PriceRefreshScheduleDecision_schedulerVersion_calculatedAt_idx"
  ON "PriceRefreshScheduleDecision"("schedulerVersion", "calculatedAt" DESC);
CREATE INDEX "PriceRefreshScheduleDecision_proposedScheduledAt_idx"
  ON "PriceRefreshScheduleDecision"("proposedScheduledAt");

ALTER TABLE "PriceRefreshObservation"
  ADD CONSTRAINT "PriceRefreshObservation_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "DynamicProduct"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PriceRefreshScheduleDecision"
  ADD CONSTRAINT "PriceRefreshScheduleDecision_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "DynamicProduct"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
