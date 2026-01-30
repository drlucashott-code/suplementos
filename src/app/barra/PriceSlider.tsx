"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export function PriceSlider() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initial =
    Number(searchParams.get("priceMax")) || 400;

  const [tempValue, setTempValue] = useState(initial);

  function applyValue(value: number) {
    const params = new URLSearchParams(
      searchParams.toString()
    );

    params.set("priceMax", String(value));
    router.push(`/whey?${params.toString()}`);
  }

  return (
    <div className="mt-6">
      <p className="font-medium mb-2">Preço máximo</p>

      <p className="text-sm mb-1">
        Até <strong>R$ {tempValue}</strong>
      </p>

      <input
        type="range"
        min={20}
        max={400}
        step={1}
        value={tempValue}
        onChange={(e) =>
          setTempValue(Number(e.target.value))
        }
        onMouseUp={() => applyValue(tempValue)}
        onTouchEnd={() => applyValue(tempValue)}
        className="w-full accent-green-600"
      />
    </div>
  );
}
