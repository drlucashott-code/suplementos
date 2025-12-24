"use client";

import { useMemo, useState } from "react";
import {
  createCreatineAction,
  deleteCreatineAction,
  updateCreatineAction,
} from "./actions";
import type { CreatineProduct } from "./AdminWrapper";
import { CreatineForm, Store } from "@prisma/client";

type Props = {
  products: CreatineProduct[];
};

export default function AdminClient({ products }: Props) {
  const [search, setSearch] = useState("");
  const [editing, setEditing] =
    useState<CreatineProduct | null>(null);

  const input =
    "w-full border rounded-md p-2 text-sm";

  /* =======================
     FILTRO DE BUSCA
     ======================= */
  const filteredProducts = useMemo(() => {
    if (!search.trim()) return products;
    const term = search.toLowerCase();
    return products.filter((p) =>
      p.name.toLowerCase().includes(term)
    );
  }, [products, search]);

  function getUnitLabels(form: CreatineForm) {
    switch (form) {
      case CreatineForm.POWDER:
        return {
          total: "Peso total (g)",
          perDose: "Peso da dose (g)",
        };
      case CreatineForm.CAPSULE:
        return {
          total: "Total de cápsulas",
          perDose: "Cápsulas por dose",
        };
      case CreatineForm.GUMMY:
        return {
          total: "Total de gummies",
          perDose: "Gummies por dose",
        };
    }
  }

  return (
    <main className="max-w-5xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">
        Admin — Creatina
      </h1>

      {/* =======================
         CADASTRO
         ======================= */}
      <form
        action={createCreatineAction}
        className="space-y-3 mb-10"
      >
        <input
          name="name"
          placeholder="Nome"
          className={input}
          required
        />

        <input
          name="brand"
          placeholder="Marca"
          className={input}
          required
        />

        <input
          name="flavor"
          placeholder="Sabor (opcional)"
          className={input}
        />

        <select
          name="form"
          defaultValue={CreatineForm.POWDER}
          className={input}
        >
          <option value={CreatineForm.POWDER}>
            Pó
          </option>
          <option value={CreatineForm.CAPSULE}>
            Cápsula
          </option>
          <option value={CreatineForm.GUMMY}>
            Gummy
          </option>
        </select>

        {/* UNIDADES */}
        <input
          name="totalUnits"
          type="number"
          step="0.01"
          placeholder="Peso total (g) / cápsulas / gummies"
          className={input}
          required
        />

        <input
          name="unitsPerDose"
          type="number"
          step="0.01"
          placeholder="Peso da dose (g) / cápsulas por dose"
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
          placeholder="ASIN Amazon (opcional)"
          className={input}
        />

        <input
          name="mercadoLivreAffiliate"
          placeholder="Link afiliado Mercado Livre (opcional)"
          className={input}
        />

        <button className="bg-black text-white px-4 py-2 rounded">
          Cadastrar
        </button>
      </form>

      {/* =======================
         BUSCA
         ======================= */}
      <input
        placeholder="Buscar..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full border rounded p-2 mb-6"
      />

      {/* =======================
         LISTA
         ======================= */}
      <table className="w-full border text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-2 text-left">
              Nome
            </th>
            <th className="p-2 text-left">
              Adicionado em
            </th>
            <th className="p-2 text-right">
              Ações
            </th>
          </tr>
        </thead>
        <tbody>
          {filteredProducts.map((p) => (
            <tr key={p.id} className="border-t">
              <td className="p-2">
                {p.name}
              </td>

              <td className="p-2">
                {new Date(
                  p.createdAt
                ).toLocaleDateString("pt-BR")}
              </td>

              <td className="p-2 text-right space-x-3">
                <button
                  onClick={() => setEditing(p)}
                  className="text-blue-600"
                >
                  Editar
                </button>

                <form
                  action={deleteCreatineAction}
                  className="inline"
                >
                  <input
                    type="hidden"
                    name="id"
                    value={p.id}
                  />
                  <button className="text-red-600">
                    Excluir
                  </button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* =======================
         EDIÇÃO
         ======================= */}
      {editing && (
        <div className="mt-10 border rounded p-4">
          <h2 className="font-semibold mb-4">
            Editar produto
          </h2>

          {(() => {
            const amazonOffer =
              editing.offers.find(
                (o) => o.store === Store.AMAZON
              );

            const mlOffer =
              editing.offers.find(
                (o) =>
                  o.store ===
                  Store.MERCADO_LIVRE
              );

            const labels = getUnitLabels(
              editing.creatineInfo!.form
            );

            return (
              <form
                action={updateCreatineAction}
                className="space-y-3"
              >
                <input
                  type="hidden"
                  name="id"
                  value={editing.id}
                />

                <input
                  name="name"
                  defaultValue={editing.name}
                  className={input}
                />

                <input
                  name="brand"
                  defaultValue={editing.brand}
                  className={input}
                />

                <input
                  name="flavor"
                  defaultValue={
                    editing.flavor ?? ""
                  }
                  className={input}
                />

                <select
                  name="form"
                  defaultValue={
                    editing.creatineInfo?.form
                  }
                  className={input}
                >
                  <option value={CreatineForm.POWDER}>
                    Pó
                  </option>
                  <option value={CreatineForm.CAPSULE}>
                    Cápsula
                  </option>
                  <option value={CreatineForm.GUMMY}>
                    Gummy
                  </option>
                </select>

                <input
                  name="totalUnits"
                  type="number"
                  step="0.01"
                  defaultValue={
                    editing.creatineInfo
                      ?.totalUnits
                  }
                  placeholder={labels.total}
                  className={input}
                />

                <input
                  name="unitsPerDose"
                  type="number"
                  step="0.01"
                  defaultValue={
                    editing.creatineInfo
                      ?.unitsPerDose
                  }
                  placeholder={labels.perDose}
                  className={input}
                />

                <input
                  name="imageUrl"
                  defaultValue={editing.imageUrl}
                  className={input}
                />

                <input
                  name="amazonAsin"
                  defaultValue={
                    amazonOffer?.externalId ??
                    ""
                  }
                  className={input}
                />

                <input
                  name="mercadoLivreAffiliate"
                  defaultValue={
                    mlOffer?.affiliateUrl ?? ""
                  }
                  className={input}
                />

                <div className="flex gap-3">
                  <button className="bg-black text-white px-4 py-2 rounded">
                    Salvar
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setEditing(null)
                    }
                    className="border px-4 py-2 rounded"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            );
          })()}
        </div>
      )}
    </main>
  );
}
