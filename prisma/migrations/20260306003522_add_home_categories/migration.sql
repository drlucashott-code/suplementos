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
ALTER TABLE "DynamicProduct" ADD CONSTRAINT "DynamicProduct_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "DynamicCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
