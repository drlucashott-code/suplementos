"use client";

import { useState } from "react";
import { createCreatineAction } from "./actions";

export function CreatineForm() {
  const [purity, setPurity] = useState(100);

  return (
    <form action={createCreatineAction}
      className="space-y-4"
    >
      {/* NOME */}
      <input
        name="name"
        placeholder="Nome do produto (ex: Creatina X 300g)"
        className="w-full border p-2 rounded"
        required
      />

      {/* MARCA */}
      <input
        name="brand"
        placeholder="Marca"
        className="w-full border p-2 rounded"
        required
      />

{/* SABOR */}
<input
  name="flavor"
  placeholder="Sabor (opcional)"
  className="w-full border p-2 rounded"
/>

      {/* ASIN */}
      <input
        name="asin"
        placeholder="ASIN"
        className="w-full border p-2 rounded"
        required
      />

      {/* IMAGEM */}
      <input
        name="imageUrl"
        placeholder="URL da imagem"
        className="w-full border p-2 rounded"
      />

      {/* PESO TOTAL */}
      <input
        name="weightInGrams"
        type="number"
        placeholder="Peso total do produto (g)"
        className="w-full border p-2 rounded"
        required
      />

      {/* APRESENTAÇÃO */}
      <div>
        <label className="block text-sm font-medium mb-1">
          Apresentação
        </label>
        <select
          name="form"
          className="w-full border p-2 rounded"
        >
          <option value="POWDER">Pó</option>
          <option value="CAPSULE">Cápsula</option>
          <option value="GUMMY">Gummy</option>
        </select>
      </div>

      {/* PUREZA */}
      <div>
        <label className="block text-sm font-medium mb-1">
          Pureza da creatina (%)
        </label>

        <input
          name="purityPercent"
          type="number"
          min={1}
          max={100}
          step={1}
          value={purity}
          onChange={(e) =>
            setPurity(Number(e.target.value))
          }
          className="w-full border p-2 rounded"
          required
        />

        <p className="text-xs text-gray-600 mt-1">
          100% = creatina pura • 50% = metade
          creatina, metade carboidrato
        </p>
      </div>

      {/* PREVIEW DIDÁTICO */}
      <div className="bg-gray-50 border rounded p-3 text-sm">
        <strong>Resumo:</strong>
        <br />
        Produto com{" "}
        <strong>{purity}%</strong> de creatina
        (o cálculo do ranking usará apenas a
        creatina real).
      </div>

      {/* BOTÃO */}
      <button
        type="submit"
        className="bg-green-600 text-white px-4 py-2 rounded font-semibold"
      >
        Salvar creatina
      </button>
    </form>
  );
}
