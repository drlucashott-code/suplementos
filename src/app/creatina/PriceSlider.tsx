"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export function PriceSlider() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initial =
    Number(searchParams.get("priceMax")) || 200;

  const [value, setValue] = useState(initial);

  function updateUrl(newValue: number) {
    const params = new URLSearchParams(
      searchParams.toString()
    );
    params.set("priceMax", String(newValue));
    router.push(`/creatina?${params.toString()}`);
  }

  return (
    <div className="mt-6">
      <p className="font-medium mb-2">
        Preço máximo
      </p>

      <p className="text-sm text-gray-700 mb-1">
        Até <strong>R$ {value}</strong>
      </p>

      <input
        type="range"
        min={20}
        max={200}
        step={5}
        value={value}
        onChange={(e) =>
          setValue(Number(e.target.value))
        }
        onMouseUp={() => updateUrl(value)}
        onTouchEnd={() => updateUrl(value)}
        className="w-full accent-green-600"
      />
    </div>
  );
}
