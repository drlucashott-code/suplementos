import { Prisma } from "@prisma/client";
import { getNormalizedBlockedMerchantNames } from "@/lib/blockedMerchants";

export function buildBlockedMerchantAttributesSql(tableAlias: string) {
  const sellerExpr = Prisma.raw(`"${tableAlias}"."attributes"->>'seller'`);
  const blockedNames = getNormalizedBlockedMerchantNames();

  return Prisma.sql`(
    LOWER(BTRIM(COALESCE(${sellerExpr}, ''))) IN (${Prisma.join(
      blockedNames.map((value) => Prisma.sql`${value}`)
    )})
  )`;
}
