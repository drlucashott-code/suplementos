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
    "weightInGrams" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreatineInfo" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "form" "CreatineForm" NOT NULL,
    "purityPercent" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "CreatineInfo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Offer" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "store" "Store" NOT NULL,
    "externalId" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "affiliateUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Offer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CreatineInfo_productId_key" ON "CreatineInfo"("productId");

-- CreateIndex
CREATE INDEX "CreatineInfo_form_idx" ON "CreatineInfo"("form");

-- CreateIndex
CREATE INDEX "Offer_productId_idx" ON "Offer"("productId");

-- CreateIndex
CREATE INDEX "Offer_store_idx" ON "Offer"("store");

-- CreateIndex
CREATE UNIQUE INDEX "Offer_store_externalId_key" ON "Offer"("store", "externalId");

-- AddForeignKey
ALTER TABLE "CreatineInfo" ADD CONSTRAINT "CreatineInfo_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
