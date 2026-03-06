-- CreateTable
CREATE TABLE "HomeCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "displayConfig" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HomeCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HomeProduct" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "totalPrice" DOUBLE PRECISION NOT NULL,
    "url" TEXT NOT NULL,
    "imageUrl" TEXT,
    "categoryId" TEXT NOT NULL,
    "attributes" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HomeProduct_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HomeCategory_slug_key" ON "HomeCategory"("slug");

-- AddForeignKey
ALTER TABLE "HomeProduct" ADD CONSTRAINT "HomeProduct_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "HomeCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
