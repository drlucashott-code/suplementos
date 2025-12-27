-- CreateTable
CREATE TABLE "WheyInfo" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "totalWeightInGrams" DOUBLE PRECISION NOT NULL,
    "doseInGrams" DOUBLE PRECISION NOT NULL,
    "proteinPerDoseInGrams" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "WheyInfo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WheyInfo_productId_key" ON "WheyInfo"("productId");

-- AddForeignKey
ALTER TABLE "WheyInfo" ADD CONSTRAINT "WheyInfo_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
