/*
  Warnings:

  - You are about to drop the `DynamicCategory` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `DynamicProduct` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "DynamicProduct" DROP CONSTRAINT "DynamicProduct_categoryId_fkey";

-- DropTable
DROP TABLE "DynamicCategory";

-- DropTable
DROP TABLE "DynamicProduct";

-- CreateTable
CREATE TABLE "DynamicCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "displayConfig" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DynamicCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DynamicProduct" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "totalPrice" DOUBLE PRECISION NOT NULL,
    "url" TEXT NOT NULL,
    "imageUrl" TEXT,
    "categoryId" TEXT NOT NULL,
    "attributes" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DynamicProduct_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DynamicCategory_slug_key" ON "DynamicCategory"("slug");

-- AddForeignKey
ALTER TABLE "DynamicProduct" ADD CONSTRAINT "DynamicProduct_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "DynamicCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
