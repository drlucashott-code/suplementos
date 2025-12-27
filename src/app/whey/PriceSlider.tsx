"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export function PriceSlider() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initial =
    Number(searchParams.get("priceMax")) || 200;

  // valor enquanto arrasta
  const [tempValue, setTempValue] =
    useState(initial);

  function track(event: string, data?: object) {
    if (typeof window !== "undefined" && "gtag" in window) {
      // @ts-ignore
      window.gtag("event", event, data);
    }
  }

  function applyValue(value: number) {
    track("change_price_max", {
      price_max: value,
      device: "desktop",
    });

    const params = new URLSearchParams(
      searchParams.toString()
    );

    params.set("priceMax", String(value));
    router.push(`/whey?${params.toString()}`);
  }

  return (
    <div className="mt-6">
      <p className="font-medium mb-2">
        Preço máximo
      </p>

      <p className="text-sm text-gray-700 mb-1">
        Até <strong>R$ {tempValue}</strong>
      </p>

      <input
        type="range"
        min={20}
        max={200}
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
