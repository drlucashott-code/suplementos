/*
  Warnings:

  - You are about to drop the column `creatinePerServingGrams` on the `CreatineInfo` table. All the data in the column will be lost.
  - You are about to drop the column `unitsPerServing` on the `CreatineInfo` table. All the data in the column will be lost.
  - Added the required column `unitsPerDose` to the `CreatineInfo` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "CreatineInfo" DROP COLUMN "creatinePerServingGrams",
DROP COLUMN "unitsPerServing",
ADD COLUMN     "unitsPerDose" DOUBLE PRECISION NOT NULL;
