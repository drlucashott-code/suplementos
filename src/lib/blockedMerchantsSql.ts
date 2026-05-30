import { Prisma } from "@prisma/client";

export function buildBlockedMerchantAttributesSql(
  tableAlias: string,
  blockedMerchantNames: readonly string[]
) {
  const sellerExpr = Prisma.raw(`"${tableAlias}"."attributes"->>'seller'`);
  const normalizedBlockedNames = blockedMerchantNames.map((value) =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .replace(/\s+/g, " ")
      .toLowerCase()
  );

  return Prisma.sql`(
    LOWER(BTRIM(COALESCE(${sellerExpr}, ''))) IN (${Prisma.join(
      normalizedBlockedNames.map((value) => Prisma.sql`${value}`)
    )})
  )`;
}
