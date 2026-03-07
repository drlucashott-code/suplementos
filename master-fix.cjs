const fs = require('fs');
const path = require('path');

// 1. CONTEÚDO DO SCHEMA (O que você me mandou por último)
const schemaContent = `generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Product {
  id                   String                @id @default(cuid())
  category             String
  name                 String
  brand                String
  flavor               String?
  imageUrl             String
  createdAt            DateTime              @default(now())
  updatedAt            DateTime              @updatedAt
  offers               Offer[]
  creatineInfo         CreatineInfo?
  wheyInfo             WheyInfo?
  proteinBarInfo       ProteinBarInfo?
  proteinDrinkInfo     ProteinDrinkInfo?
  functionalCoffeeInfo FunctionalCoffeeInfo?
  preWorkoutInfo       PreWorkoutInfo?
}

model CreatineInfo {
  id           String       @id @default(cuid())
  productId    String       @unique
  form         CreatineForm
  totalUnits   Float
  unitsPerDose Float
  product      Product      @relation(fields: [productId], references: [id], onDelete: Cascade)

  @@index([form])
}

model WheyInfo {
  id                    String  @id @default(cuid())
  productId             String  @unique
  totalWeightInGrams    Float
  doseInGrams           Float
  proteinPerDoseInGrams Float
  product               Product @relation(fields: [productId], references: [id], onDelete: Cascade)
}

model ProteinBarInfo {
  id                    String  @id @default(cuid())
  productId             String  @unique
  doseInGrams           Float
  proteinPerDoseInGrams Float
  unitsPerBox           Int
  product               Product @relation(fields: [productId], references: [id], onDelete: Cascade)
}

model ProteinDrinkInfo {
  id                    String  @id @default(cuid())
  productId             String  @unique
  unitsPerPack          Int
  volumePerUnitInMl     Float
  proteinPerUnitInGrams Float
  product               Product @relation(fields: [productId], references: [id], onDelete: Cascade)
}

model FunctionalCoffeeInfo {
  id                  String  @id @default(cuid())
  productId           String  @unique
  product             Product @relation(fields: [productId], references: [id], onDelete: Cascade)
  totalWeightInGrams  Float
  doseInGrams         Float
  caffeinePerDoseInMg Float
}

model PreWorkoutInfo {
  id                  String  @id @default(cuid())
  productId           String  @unique
  totalWeightInGrams  Float
  doseInGrams         Float
  caffeinePerDoseInMg Float
  product             Product @relation(fields: [productId], references: [id], onDelete: Cascade)
}

model Offer {
  id            String              @id @default(cuid())
  productId     String
  store         Store
  externalId    String
  seller        String?
  price         Float
  affiliateUrl  String
  createdAt     DateTime            @default(now())
  ratingAverage Float?
  ratingCount   Int?
  updatedAt     DateTime            @updatedAt
  product       Product             @relation(fields: [productId], references: [id], onDelete: Cascade)
  priceHistory  OfferPriceHistory[]

  @@unique([store, externalId])
  @@index([productId])
  @@index([store])
}

model OfferPriceHistory {
  id        String   @id @default(cuid())
  offerId   String
  price     Float
  createdAt DateTime @default(now())
  offer     Offer    @relation(fields: [offerId], references: [id], onDelete: Cascade)

  @@index([offerId, createdAt])
}

model AmazonImportQueue {
  id        String   @id @default(cuid())
  asin      String   @unique
  createdAt DateTime @default(now())
}

enum Store {
  AMAZON
  MERCADO_LIVRE
}

enum CreatineForm {
  POWDER
  CAPSULE
  GUMMY
}

model DynamicCategory {
  id            String           @id @default(cuid())
  group         String           @default("casa")
  groupName     String           @default("Casa e Limpeza") // 🚀 Nome visual do nicho
  name          String
  slug          String
  displayConfig Json
  products      DynamicProduct[]
  createdAt     DateTime         @default(now())
  updatedAt     DateTime         @updatedAt

  @@unique([group, slug])
}

model DynamicProduct {
  id               String                @id @default(cuid())
  asin             String                @unique
  name             String
  totalPrice       Float
  url              String
  imageUrl         String?
  categoryId       String
  category         DynamicCategory       @relation(fields: [categoryId], references: [id], onDelete: Cascade)
  attributes       Json
  
  // 🌟 CAMPOS DE AVALIAÇÃO E CONTROLE DE LOTES
  ratingAverage    Float?
  ratingCount      Int?
  ratingsUpdatedAt DateTime?             // 🕒 Carimbo para saber quando atualizar (1x por mês ou novos)
  
  priceHistory     DynamicPriceHistory[]
  createdAt        DateTime              @default(now())
  updatedAt        DateTime              @updatedAt
}

model DynamicPriceHistory {
  id          String         @id @default(cuid())
  productId   String
  product     DynamicProduct @relation(fields: [productId], references: [id], onDelete: Cascade)
  price       Float
  updateCount Int            @default(1)
  date        DateTime
  createdAt   DateTime       @default(now())
  updatedAt   DateTime       @updatedAt

  @@unique([productId, date])
  @@index([productId, date])
}`;

// 2. LIMPEZA DO .ENV
const envPath = path.join(__dirname, '.env');
let envContent = fs.readFileSync(envPath, 'utf8');

// Remove BOM e força a URL com aspas e sslmode correto
envContent = envContent.replace(/^\uFEFF/, '');
envContent = envContent.replace(/DATABASE_URL=.*/, 'DATABASE_URL="postgresql://neondb_owner:npg_6TDPCiVXRaI2@ep-restless-union-acbhsqgb-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require"');

// 3. ESCRITA DOS ARQUIVOS (UTF-8 sem BOM)
fs.writeFileSync(path.join(__dirname, 'prisma', 'schema.prisma'), schemaContent, { encoding: 'utf8' });
fs.writeFileSync(envPath, envContent, { encoding: 'utf8' });

console.log('🚀 [SUCESSO] Schema e .env reescritos sem caracteres invisíveis!');