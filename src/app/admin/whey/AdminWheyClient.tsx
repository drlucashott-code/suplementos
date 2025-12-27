"use client";

import { useState } from "react";
import { createWheyAction, deleteWheyAction } from "./actions";
import type { WheyProduct } from "./AdminWheyWrapper";
import { ToastOnSubmit } from "../creatina/ToastOnSubmit";

export default function AdminWheyClient({
  products,
}: {
  products: WheyProduct[];
}) {
  const [showCreate, setShowCreate] = useState(false);
  const input = "w-full border rounded-md p-2 text-sm";

  return (
    <main className="max-w-5xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">
        Admin — Whey Protein
      </h1>

      <button
        type="button"
        onClick={() => setShowCreate((v) => !v)}
        className="mb-4 border px-4 py-2 rounded font-medium"
      >
        {showCreate ? "− Fechar cadastro" : "➕ Adicionar whey"}
      </button>

      {showCreate && (
        <form
          action={createWheyAction}
          className="space-y-4 mb-10 border rounded p-4 bg-gray-50"
        >
          <ToastOnSubmit message="✅ Whey cadastrado com sucesso" />

          <input name="name" placeholder="Nome" className={input} required />
          <input name="brand" placeholder="Marca" className={input} required />
          <input name="flavor" placeholder="Sabor (opcional)" className={input} />
          <input
            name="totalWeightInGrams"
            type="number"
            placeholder="Peso total (g)"
            className={input}
            required
          />
          <input
            name="doseInGrams"
            type="number"
            placeholder="Dose (g)"
            className={input}
            required
          />
          <input
            name="proteinPerDoseInGrams"
            type="number"
            placeholder="Proteína por dose (g)"
            className={input}
            required
          />
          <input
            name="imageUrl"
            placeholder="Imagem (URL)"
            className={input}
          />
          <input
            name="amazonAsin"
            placeholder="ASIN Amazon"
            className={input}
          />

          <button
            type="submit"
            className="bg-black text-white px-4 py-2 rounded"
          >
            Cadastrar
          </button>
        </form>
      )}

      <table className="w-full border text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-2 text-left">Nome</th>
            <th className="p-2 text-left">Proteína / dose</th>
            <th className="p-2 text-left">Dose</th>
            <th className="p-2 text-left">Peso total</th>
            <th className="p-2 text-right">Ações</th>
          </tr>
        </thead>

        <tbody>
          {products.map((p) => (
            <tr key={p.id} className="border-t">
              <td className="p-2">{p.name}</td>
              <td className="p-2">
                {p.wheyInfo?.proteinPerDoseInGrams ?? "—"} g
              </td>
              <td className="p-2">
                {p.wheyInfo?.doseInGrams ?? "—"} g
              </td>
              <td className="p-2">
                {p.wheyInfo?.totalWeightInGrams ?? "—"} g
              </td>
              <td className="p-2 text-right">
                <form
                  action={deleteWheyAction}
                  onSubmit={(e) => {
                    if (!confirm("Excluir este whey?")) {
                      e.preventDefault();
                    }
                  }}
                  className="inline"
                >
                  <input type="hidden" name="id" value={p.id} />
                  <button type="submit" className="text-red-600">
                    Excluir
                  </button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
