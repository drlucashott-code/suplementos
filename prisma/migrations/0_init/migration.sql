-- CreateEnum
CREATE TYPE "Store" AS ENUM ('AMAZON', 'MERCADO_LIVRE');

-- CreateEnum
CREATE TYPE "CreatineForm" AS ENUM ('POWDER', 'CAPSULE', 'GUMMY');

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "flavor" TEXT,
    "imageUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreatineInfo" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "form" "CreatineForm" NOT NULL,
    "totalUnits" DOUBLE PRECISION NOT NULL,
    "unitsPerDose" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "CreatineInfo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WheyInfo" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "totalWeightInGrams" DOUBLE PRECISION NOT NULL,
    "doseInGrams" DOUBLE PRECISION NOT NULL,
    "proteinPerDoseInGrams" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "WheyInfo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProteinBarInfo" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "doseInGrams" DOUBLE PRECISION NOT NULL,
    "proteinPerDoseInGrams" DOUBLE PRECISION NOT NULL,
    "unitsPerBox" INTEGER NOT NULL,

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

-- CreateTable
CREATE TABLE "FunctionalCoffeeInfo" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "totalWeightInGrams" DOUBLE PRECISION NOT NULL,
    "doseInGrams" DOUBLE PRECISION NOT NULL,
    "caffeinePerDoseInMg" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "FunctionalCoffeeInfo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PreWorkoutInfo" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "totalWeightInGrams" DOUBLE PRECISION NOT NULL,
    "doseInGrams" DOUBLE PRECISION NOT NULL,
    "caffeinePerDoseInMg" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "PreWorkoutInfo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Offer" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "store" "Store" NOT NULL,
    "externalId" TEXT NOT NULL,
    "seller" TEXT,
    "price" DOUBLE PRECISION NOT NULL,
    "affiliateUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ratingAverage" DOUBLE PRECISION,
    "ratingCount" INTEGER,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Offer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OfferPriceHistory" (
    "id" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OfferPriceHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AmazonImportQueue" (
    "id" TEXT NOT NULL,
    "asin" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AmazonImportQueue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CreatineInfo_productId_key" ON "CreatineInfo"("productId");

-- CreateIndex
CREATE INDEX "CreatineInfo_form_idx" ON "CreatineInfo"("form");

-- CreateIndex
CREATE UNIQUE INDEX "WheyInfo_productId_key" ON "WheyInfo"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "ProteinBarInfo_productId_key" ON "ProteinBarInfo"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "ProteinDrinkInfo_productId_key" ON "ProteinDrinkInfo"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "FunctionalCoffeeInfo_productId_key" ON "FunctionalCoffeeInfo"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "PreWorkoutInfo_productId_key" ON "PreWorkoutInfo"("productId");

-- CreateIndex
CREATE INDEX "Offer_productId_idx" ON "Offer"("productId");

-- CreateIndex
CREATE INDEX "Offer_store_idx" ON "Offer"("store");

-- CreateIndex
CREATE UNIQUE INDEX "Offer_store_externalId_key" ON "Offer"("store", "externalId");

-- CreateIndex
CREATE INDEX "OfferPriceHistory_offerId_createdAt_idx" ON "OfferPriceHistory"("offerId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AmazonImportQueue_asin_key" ON "AmazonImportQueue"("asin");

-- AddForeignKey
ALTER TABLE "CreatineInfo" ADD CONSTRAINT "CreatineInfo_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WheyInfo" ADD CONSTRAINT "WheyInfo_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProteinBarInfo" ADD CONSTRAINT "ProteinBarInfo_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProteinDrinkInfo" ADD CONSTRAINT "ProteinDrinkInfo_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FunctionalCoffeeInfo" ADD CONSTRAINT "FunctionalCoffeeInfo_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreWorkoutInfo" ADD CONSTRAINT "PreWorkoutInfo_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfferPriceHistory" ADD CONSTRAINT "OfferPriceHistory_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "Offer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

