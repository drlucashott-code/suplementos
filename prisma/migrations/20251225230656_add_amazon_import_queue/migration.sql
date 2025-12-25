-- CreateTable
CREATE TABLE "AmazonImportQueue" (
    "id" TEXT NOT NULL,
    "asin" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AmazonImportQueue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AmazonImportQueue_asin_key" ON "AmazonImportQueue"("asin");
