import Link from "next/link";

// Ficha técnica = mesmos campos públicos da tabela do catálogo.
// A página resolve `fields` a partir do displayConfig da categoria (campos não
// "internal") e passa os valores reais de `attributes` do produto.

export type SpecField = {
  key: string;
  label: string;
  type?: "text" | "number" | "currency";
  prefix?: string;
  suffix?: string;
  hideLabel?: boolean;
};

// Mesma regra de formatação da tabela do catálogo (MobileProductCard):
// número arredondado (1 casa só para kg/gramas), moeda em BRL, texto com
// inicial maiúscula.
function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

function shouldShowOneDecimal(field: SpecField) {
  const label = normalize(field.label || "");
  const key = normalize(field.key || "");
  const suffix = normalize(field.suffix || "");
  return (
    label.includes("kg") ||
    suffix.includes("kg") ||
    key.includes("kg") ||
    label.includes("grama") ||
    suffix.trim() === "g" ||
    key === "weightgrams"
  );
}

function formatNumber(value: number, oneDecimal: boolean) {
  if (!oneDecimal) return Math.round(value).toString();
  if (Number.isInteger(value)) return value.toString();
  return value.toFixed(1).replace(".", ",");
}

function formatValue(
  value: string | number | boolean | null | undefined,
  field: SpecField
): string | null {
  if (value === null || value === undefined || String(value).trim() === "") return null;
  if (typeof value === "boolean") return value ? "Sim" : "Não";

  if (field.type === "currency") {
    const numeric = Number(value);
    if (!Number.isNaN(numeric)) {
      return numeric.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    }
  }

  if (field.type === "number") {
    const numeric = Number(value);
    if (!Number.isNaN(numeric)) {
      const formatted = formatNumber(numeric, shouldShowOneDecimal(field));
      return `${field.prefix ?? ""}${formatted}${field.suffix ?? ""}`;
    }
  }

  const text = String(value).trim();
  const hasUppercase = /[A-ZÁÀÂÃÄÉÊËÍÎÏÓÔÕÖÚÛÜÇ]/.test(text);
  const cased = hasUppercase ? text : `${text.charAt(0).toUpperCase()}${text.slice(1)}`;
  return `${field.prefix ?? ""}${cased}${field.suffix ?? ""}`;
}

export function ProductSpecs({
  asin,
  categoryName,
  categoryGroup,
  categorySlug,
  inStock,
  fields,
  attributes,
}: {
  asin: string;
  categoryName: string;
  categoryGroup: string;
  categorySlug: string;
  inStock: boolean;
  fields: SpecField[];
  attributes: Record<string, string | number | boolean | null>;
}) {
  const hasCategory = Boolean(categoryGroup && categorySlug);

  const attributeRows = fields
    .map((field) => ({
      label: field.label,
      value: formatValue(attributes?.[field.key], field),
    }))
    .filter((row): row is { label: string; value: string } => row.value !== null);

  return (
    <section className="rounded-[12px] border border-[#D5D9D9] bg-white p-4 md:p-5">
      <h2 className="text-[16px] font-bold text-[#0F1111]">Ficha técnica</h2>

      <dl className="mt-3 divide-y divide-[#ECECEC] text-[13px]">
        {attributeRows.map((row) => (
          <div key={row.label} className="flex items-start gap-4 py-2">
            <dt className="w-44 shrink-0 font-semibold text-[#565959]">{row.label}</dt>
            <dd className="min-w-0 text-[#0F1111]">{row.value}</dd>
          </div>
        ))}

        <div className="flex items-start gap-4 py-2">
          <dt className="w-44 shrink-0 font-semibold text-[#565959]">Categoria</dt>
          <dd className="min-w-0 text-[#0F1111]">
            {hasCategory ? (
              <Link
                href={`/${categoryGroup}/${categorySlug}`}
                className="font-semibold text-[#2162A1] hover:underline"
              >
                {categoryName}
              </Link>
            ) : (
              categoryName
            )}
          </dd>
        </div>

        <div className="flex items-start gap-4 py-2">
          <dt className="w-44 shrink-0 font-semibold text-[#565959]">Disponibilidade</dt>
          <dd className={`min-w-0 font-semibold ${inStock ? "text-[#007600]" : "text-[#B42318]"}`}>
            {inStock ? "Em estoque" : "Sem estoque"}
          </dd>
        </div>

        <div className="flex items-start gap-4 py-2">
          <dt className="w-44 shrink-0 font-semibold text-[#565959]">Código (ASIN)</dt>
          <dd className="min-w-0 font-mono text-[#0F1111]">{asin}</dd>
        </div>
      </dl>
    </section>
  );
}
