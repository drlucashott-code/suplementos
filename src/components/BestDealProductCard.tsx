"use client";

import Image from "next/image";
import TrackedDealLink from "@/components/TrackedDealLink";
import type { BestDeal } from "@/lib/bestDeals";

function getNumericAttribute(
  attributes: Record<string, string | number | boolean | null>,
  key: string
) {
  const value = Number(attributes[key]);
  return Number.isFinite(value) ? value : 0;
}

function getMetricText(item: BestDeal) {
  const attrs = item.attributes || {};
  const totalPrice = item.totalPrice;

  const explicitMetricKeys = [
    { key: "precoPorDose", label: "dose" },
    { key: "precoPorBarra", label: "barra" },
    { key: "precoPorUnidade", label: "unidade" },
    { key: "precoPorGramaProteina", label: "g de proteína" },
    { key: "precoPor100MgCafeina", label: "100mg" },
    { key: "precoPorGramaCreatina", label: "g" },
  ] as const;

  for (const metric of explicitMetricKeys) {
    const value = getNumericAttribute(attrs, metric.key);
    if (value > 0) {
      return `(${formatCurrency(value)}/${metric.label})`;
    }
  }

  const unitsPerBox = getNumericAttribute(attrs, "unitsPerBox");
  if (unitsPerBox > 0) {
    return `(${formatCurrency(totalPrice / unitsPerBox)}/barra)`;
  }

  const unitsPerPack = getNumericAttribute(attrs, "unitsPerPack");
  if (unitsPerPack > 0) {
    return `(${formatCurrency(totalPrice / unitsPerPack)}/unidade)`;
  }

  const numberOfDoses =
    getNumericAttribute(attrs, "numberOfDoses") || getNumericAttribute(attrs, "doses");
  if (numberOfDoses > 0) {
    return `(${formatCurrency(totalPrice / numberOfDoses)}/dose)`;
  }

  const totalProteinInGrams = getNumericAttribute(attrs, "totalProteinInGrams");
  if (totalProteinInGrams > 0) {
    return `(${formatCurrency(totalPrice / totalProteinInGrams)}/g de proteína)`;
  }

  const cafeinaTotalMg = getNumericAttribute(attrs, "cafeinaTotalMg");
  if (cafeinaTotalMg > 0) {
    return `(${formatCurrency((totalPrice / cafeinaTotalMg) * 100)}/100mg)`;
  }

  const gramasCreatinaPuraNoPote = getNumericAttribute(attrs, "gramasCreatinaPuraNoPote");
  if (gramasCreatinaPuraNoPote > 0) {
    return `(${formatCurrency(totalPrice / gramasCreatinaPuraNoPote)}/g)`;
  }

  return null;
}

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatPriceParts(value: number) {
  const [whole, cents] = value.toFixed(2).split(".");
  return { whole, cents };
}

function formatRatingCount(value: number) {
  return value.toLocaleString("pt-BR");
}

function StarRow({ rating }: { rating: number }) {
  const rounded = Math.round(rating * 2) / 2;

  return (
    <div className="flex items-center gap-[1px] text-[14px] leading-none text-[#DE7921]">
      {[0, 1, 2, 3, 4].map((index) => {
        const diff = rounded - index;
        const fillWidth = diff >= 1 ? "100%" : diff >= 0.5 ? "50%" : "0%";

        return (
          <span key={index} className="relative inline-flex">
            <span className="text-[#D5D9D9]">★</span>
            <span
              className="absolute inset-y-0 left-0 overflow-hidden text-[#DE7921]"
              style={{ width: fillWidth }}
            >
              ★
            </span>
          </span>
        );
      })}
    </div>
  );
}

export default function BestDealProductCard({
  item,
  category,
  compact = false,
}: {
  item: BestDeal;
  category: string;
  compact?: boolean;
}) {
  const price = formatPriceParts(item.totalPrice);
  const metricText = getMetricText(item);
  const hasRating = (item.ratingAverage || 0) > 0 && (item.ratingCount || 0) > 0;

  return (
    <TrackedDealLink
      asin={item.asin}
      href={item.url}
      productId={item.id}
      productName={item.name}
      value={item.totalPrice}
      category={category}
      className="group flex h-full flex-col rounded-xl border border-[#d5d9d9] bg-white p-3 text-left transition hover:border-[#c7cfd0] hover:shadow-sm"
    >
      <div
        className={`relative overflow-hidden rounded-lg bg-white ${
          compact ? "h-[90px]" : "h-[120px]"
        }`}
      >
        <Image
          src={item.imageUrl}
          alt={item.name}
          fill
          sizes={compact ? "(max-width: 768px) 42vw, 180px" : "(max-width: 768px) 42vw, 220px"}
          className="object-contain p-2"
          unoptimized
        />
      </div>

      <p
        className={`mt-3 min-h-[56px] line-clamp-3 font-medium leading-snug text-[#2162A1] group-hover:text-[#174e87] ${
          compact ? "text-[12px]" : "text-[14px]"
        }`}
      >
        {item.name}
      </p>

      <div className="mt-1 min-h-[18px]">
        {hasRating ? (
          <div className="flex items-center gap-1.5">
            <StarRow rating={Number(item.ratingAverage)} />
            <span className="text-[12px] text-[#2162A1]">
              {formatRatingCount(Number(item.ratingCount))}
            </span>
          </div>
        ) : null}
      </div>

      <div className="mt-auto">
        <div className="flex min-h-[44px] items-end gap-1 font-variant-numeric-tabular">
          <span className="pb-[4px] text-[12px] font-medium leading-none text-[#CC0C39]">-</span>
          <span className="text-[18px] font-medium leading-none text-[#CC0C39]">
            {item.discountPercent}%
          </span>
          <span className="pb-[5px] pl-1 text-[12px] leading-none text-[#565959]">R$</span>
          <span className="text-[24px] font-normal leading-none text-[#0F1111]">
            {price.whole}
          </span>
          <span className="pb-[7px] text-[12px] leading-none text-[#0F1111]">
            {price.cents}
          </span>
        </div>

        <div className="mt-1 min-h-[36px]">
          {metricText ? (
            <p className="text-[12px] leading-snug text-[#0F1111]">{metricText}</p>
          ) : (
            <p className="text-[12px] leading-snug text-[#565959]">{item.categoryName}</p>
          )}
        </div>

        <p className="mt-1 min-h-[18px] text-[12px] text-[#565959]">
          De: <span className="line-through">{formatCurrency(item.averagePrice30d)}</span>
        </p>

        <p className="mt-2 text-[12px] font-medium text-[#007185]">Ver oferta na Amazon</p>
      </div>
    </TrackedDealLink>
  );
}
