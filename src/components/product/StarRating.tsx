// Estrelas com preenchimento parcial. Presentacional puro (sem hooks),
// então pode ser usado tanto em server quanto em client components.

export function StarRating({
  rating,
  size = 16,
  className = "",
}: {
  rating: number;
  size?: number;
  className?: string;
}) {
  const rounded = Math.round(rating * 2) / 2;

  return (
    <div
      className={`flex items-center gap-[1px] leading-none text-[#DE7921] ${className}`}
      style={{ fontSize: size }}
      aria-hidden="true"
    >
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
