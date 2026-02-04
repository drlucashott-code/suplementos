-- CreateTable
CREATE TABLE "ProteinBarInfo" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "unitsPerBox" INTEGER NOT NULL,
    "doseInGrams" DOUBLE PRECISION NOT NULL,
    "proteinPerDoseInGrams" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "ProteinBarInfo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProteinDrinkInfo" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "unitsPerPack" INTEGER NOT NULL,
    "volumePerUnitInMl" DOUBLE PRECISION NOT NULL,
    "proteinPerUnitInGrams" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "ProteinDrinkInfo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProteinBarInfo_productId_key" ON "ProteinBarInfo"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "ProteinDrinkInfo_productId_key" ON "ProteinDrinkInfo"("productId");

-- AddForeignKey
ALTER TABLE "ProteinBarInfo" ADD CONSTRAINT "ProteinBarInfo_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProteinDrinkInfo" ADD CONSTRAINT "ProteinDrinkInfo_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
