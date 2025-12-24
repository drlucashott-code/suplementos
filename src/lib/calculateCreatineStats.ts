import { CreatineForm } from "@prisma/client";

/* =======================
   TIPOS FINAIS
   ======================= */
export type CreatineInput = {
  form: CreatineForm;
  totalUnits: number;
  unitsPerDose: number;
  price?: number;
};

export type CreatineStats = {
  doses: number;
  pricePerDose?: number;
  hasCarbohydrate: boolean;
};

/* =======================
   FUNÇÃO FINAL
   ======================= */
export function calculateCreatineStats({
  form,
  totalUnits,
  unitsPerDose,
  price,
}: CreatineInput): CreatineStats {
  if (
    totalUnits <= 0 ||
    unitsPerDose <= 0
  ) {
    throw new Error("Dados inválidos");
  }

  const doses = totalUnits / unitsPerDose;

  let hasCarbohydrate = false;

  if (form === CreatineForm.GUMMY) {
    hasCarbohydrate = true;
  }

  if (
    form === CreatineForm.POWDER &&
    unitsPerDose > 3
  ) {
    hasCarbohydrate = true;
  }

  return {
    doses,
    pricePerDose:
      price && price > 0
        ? price / doses
        : undefined,
    hasCarbohydrate,
  };
}
