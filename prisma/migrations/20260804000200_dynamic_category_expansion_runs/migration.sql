-- Registra um resumo compacto de cada varredura de variações para que
-- falhas da API possam ser diagnosticadas sem gravar um evento por ASIN.
CREATE TABLE "DynamicCategoryExpansionRun" (
  "id" TEXT NOT NULL,
  "categoryId" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "totalBaseAsins" INTEGER NOT NULL DEFAULT 0,
  "processedFamilies" INTEGER NOT NULL DEFAULT 0,
  "discoveredItems" INTEGER NOT NULL DEFAULT 0,
  "missingAsins" INTEGER NOT NULL DEFAULT 0,
  "failedBases" INTEGER NOT NULL DEFAULT 0,
  "noResultsBases" INTEGER NOT NULL DEFAULT 0,
  "errorSummary" JSONB,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "DynamicCategoryExpansionRun_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "DynamicCategoryExpansionRun_categoryId_fkey"
    FOREIGN KEY ("categoryId") REFERENCES "DynamicCategory"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "DynamicCategoryExpansionRun_categoryId_startedAt_idx"
  ON "DynamicCategoryExpansionRun"("categoryId", "startedAt" DESC);

CREATE INDEX "DynamicCategoryExpansionRun_status_startedAt_idx"
  ON "DynamicCategoryExpansionRun"("status", "startedAt" DESC);
