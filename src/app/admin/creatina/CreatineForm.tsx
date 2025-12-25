"use client";

import { createCreatineAction } from "./actions";
import { CreatineForm as CreatineFormEnum } from "@prisma/client";

export function CreatineForm() {
  return (
    <form
      action={createCreatineAction}
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

      {/* APRESENTAÇÃO */}
      <div>
        <label className="block text-sm font-medium mb-1">
          Apresentação
        </label>
        <select
          name="form"
          defaultValue={CreatineFormEnum.POWDER}
          className="w-full border p-2 rounded"
        >
          <option value={CreatineFormEnum.POWDER}>
            Pó
          </option>
          <option value={CreatineFormEnum.CAPSULE}>
            Cápsula
          </option>
          <option value={CreatineFormEnum.GUMMY}>
            Gummy
          </option>
        </select>
      </div>

      {/* TOTAL */}
      <input
        name="totalUnits"
        type="number"
        step="0.01"
        placeholder="Total (g / cápsulas / gummies)"
        className="w-full border p-2 rounded"
        required
      />

      {/* DOSE */}
      <input
        name="unitsPerDose"
        type="number"
        step="0.01"
        placeholder="Dose (g / cápsulas / gummies)"
        className="w-full border p-2 rounded"
        required
      />

      {/* IMAGEM */}
      <input
        name="imageUrl"
        placeholder="URL da imagem"
        className="w-full border p-2 rounded"
      />

      {/* AMAZON ASIN */}
      <input
        name="amazonAsin"
        placeholder="ASIN Amazon"
        className="w-full border p-2 rounded"
      />

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
