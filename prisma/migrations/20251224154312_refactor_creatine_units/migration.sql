/*
  Warnings:

  - You are about to drop the column `purityPercent` on the `CreatineInfo` table.
    All the data in the column will be lost.
  - You are about to drop the column `weightInGrams` on the `Product` table.
    All the data in the column will be lost.
  - Added the required column `creatinePerServingGrams` to the `CreatineInfo` table
    without a default value. This is not possible if the table is not empty.
  - Added the required column `totalUnits` to the `CreatineInfo` table
    without a default value. This is not possible if the table is not empty.
  - Added the required column `unitsPerServing` to the `CreatineInfo` table
    without a default value. This is not possible if the table is not empty.
*/

/* ======================================================
   LIMPA DADOS ANTIGOS (MODELO ANTIGO DE PUREZA/PESO)
   ====================================================== */

DELETE FROM "CreatineInfo";

/* ======================================================
   ALTERA TABELA CREATINEINFO
   ====================================================== */

ALTER TABLE "CreatineInfo"
  DROP COLUMN "purityPercent",
  ADD COLUMN "creatinePerServingGrams" DOUBLE PRECISION NOT NULL,
  ADD COLUMN "totalUnits" DOUBLE PRECISION NOT NULL,
  ADD COLUMN "unitsPerServing" DOUBLE PRECISION NOT NULL;

/* ======================================================
   ALTERA TABELA PRODUCT
   ====================================================== */

ALTER TABLE "Product"
  DROP COLUMN "weightInGrams";
