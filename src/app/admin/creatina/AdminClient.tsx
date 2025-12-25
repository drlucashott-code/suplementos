"use client";

import React, { useMemo, useState } from "react";
import {
  createCreatineAction,
  deleteCreatineAction,
  updateCreatineAction,
} from "./actions";
import type { CreatineProduct } from "./AdminWrapper";
import { CreatineForm } from "@prisma/client";
import { ToastOnSubmit } from "./ToastOnSubmit";

type Props = {
  products: CreatineProduct[];
};

const ITEMS_PER_PAGE = 10;

type Order =
  | { by: "createdAt"; dir: "desc" | "asc" }
  | { by: "name"; dir: "asc" | "desc" }
  | { by: "flavor"; dir: "asc" | "desc" };

export default function AdminClient({ products }: Props) {
  const [search, setSearch] = useState("");
  const [order, setOrder] = useState<Order>({
    by: "createdAt",
    dir: "desc",
  });

  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] =
    useState<string | null>(null);

  const input =
    "w-full border rounded-md p-2 text-sm";

  /* =======================
     ORDENAÇÃO POR COLUNA
     ======================= */
  function toggleOrder(by: Order["by"]) {
    setOrder((prev) => {
      if (prev.by !== by) {
        return {
          by,
          dir: by === "createdAt" ? "desc" : "asc",
        };
      }

      return {
        by,
        dir: prev.dir === "asc" ? "desc" : "asc",
      };
    });
  }

  /* =======================
     FILTRO + ORDENAÇÃO
     ======================= */
  const filteredProducts = useMemo(() => {
    // ✅ cópia defensiva — NÃO muta props
    let result = [...products];

    if (search.trim()) {
      const term = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(term) ||
          p.brand.toLowerCase().includes(term)
      );
    }

    result.sort((a, b) => {
      if (order.by === "name") {
        return order.dir === "asc"
          ? a.name.localeCompare(b.name, "pt-BR")
          : b.name.localeCompare(a.name, "pt-BR");
      }

      if (order.by === "flavor") {
        const fa = a.flavor ?? "";
        const fb = b.flavor ?? "";
        return order.dir === "asc"
          ? fa.localeCompare(fb, "pt-BR")
          : fb.localeCompare(fa, "pt-BR");
      }

      // createdAt
      return order.dir === "asc"
        ? new Date(a.createdAt).getTime() -
            new Date(b.createdAt).getTime()
        : new Date(b.createdAt).getTime() -
            new Date(a.createdAt).getTime();
    });

    return result;
  }, [products, search, order]);

  /* =======================
     PAGINAÇÃO
     ======================= */
  const totalPages = Math.ceil(
    filteredProducts.length / ITEMS_PER_PAGE
  );

  const paginatedProducts = useMemo(() => {
    const start = (page - 1) * ITEMS_PER_PAGE;
    return filteredProducts.slice(
      start,
      start + ITEMS_PER_PAGE
    );
  }, [filteredProducts, page]);

  function confirmDelete() {
    return window.confirm(
      "Tem certeza que deseja excluir este produto?"
    );
  }

  return (
    <main className="max-w-5xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">
        Admin — Creatina
      </h1>

      {/* BUSCA */}
      <input
        placeholder="Buscar por nome ou marca..."
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setPage(1);
        }}
        className="w-full border rounded p-2 mb-6"
      />

      {/* CADASTRO */}
      <button
        onClick={() => setShowCreate((v) => !v)}
        className="mb-4 border px-4 py-2 rounded font-medium"
      >
        {showCreate
          ? "− Fechar cadastro"
          : "➕ Adicionar produto"}
      </button>

      {showCreate && (
        <form
          action={createCreatineAction}
          className="space-y-3 mb-10 border rounded p-4 bg-gray-50"
          onSubmit={() => setShowCreate(false)}
        >
          <ToastOnSubmit message="✅ Produto cadastrado com sucesso" />

          <input name="name" placeholder="Nome" className={input} required />
          <input name="brand" placeholder="Marca" className={input} required />
          <input name="flavor" placeholder="Sabor (opcional)" className={input} />

          <select
            name="form"
            defaultValue={CreatineForm.POWDER}
            className={input}
          >
            <option value={CreatineForm.POWDER}>Pó</option>
            <option value={CreatineForm.CAPSULE}>Cápsula</option>
            <option value={CreatineForm.GUMMY}>Gummy</option>
          </select>

          <input
            name="totalUnits"
            type="number"
            step="0.01"
            placeholder="Total"
            className={input}
            required
          />

          <input
            name="unitsPerDose"
            type="number"
            step="0.01"
            placeholder="Dose"
            className={input}
            required
          />

          <input name="imageUrl" placeholder="Imagem (URL)" className={input} />
          <input name="amazonAsin" placeholder="ASIN Amazon" className={input} />

          <button className="bg-black text-white px-4 py-2 rounded">
            Cadastrar
          </button>
        </form>
      )}

      {/* TABELA */}
      <table className="w-full border text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th
              className="p-2 text-left cursor-pointer"
              onClick={() => toggleOrder("name")}
            >
              Nome{" "}
              {order.by === "name" &&
                (order.dir === "asc" ? "▲" : "▼")}
            </th>

            <th
              className="p-2 text-left cursor-pointer"
              onClick={() => toggleOrder("flavor")}
            >
              Sabor{" "}
              {order.by === "flavor" &&
                (order.dir === "asc" ? "▲" : "▼")}
            </th>

            <th
              className="p-2 text-left cursor-pointer"
              onClick={() => toggleOrder("createdAt")}
            >
              Adicionado em{" "}
              {order.by === "createdAt" &&
                (order.dir === "asc" ? "▲" : "▼")}
            </th>

            <th className="p-2 text-right">
              Ações
            </th>
          </tr>
        </thead>

        <tbody>
          {paginatedProducts.map((p) => {
            const isEditing = editingId === p.id;
            const amazonOffer =
              p.offers.find(
                (o) => o.store === "AMAZON"
              );

            return (
              <React.Fragment key={p.id}>
                <tr className="border-t">
                  <td className="p-2">{p.name}</td>
                  <td className="p-2">
                    {p.flavor ?? "Sem sabor"}
                  </td>
                  <td className="p-2">
                    {new Date(p.createdAt).toLocaleDateString("pt-BR")}
                  </td>

                  <td className="p-2 text-right space-x-3">
                    <button
                      onClick={() =>
                        setEditingId(
                          isEditing ? null : p.id
                        )
                      }
                      className="text-blue-600"
                    >
                      {isEditing ? "Fechar" : "Editar"}
                    </button>

                    <form
                      action={deleteCreatineAction}
                      className="inline"
                      onSubmit={(e) => {
                        if (!confirmDelete()) {
                          e.preventDefault();
                        }
                      }}
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

                {isEditing && (
                  <tr className="bg-gray-50">
                    <td colSpan={4} className="p-4">
                      <form
                        action={updateCreatineAction}
                        className="space-y-3 border rounded p-4 bg-white"
                      >
                        <ToastOnSubmit message="✅ Produto atualizado com sucesso" />
                        <input type="hidden" name="id" value={p.id} />

                        <input name="name" defaultValue={p.name} className={input} />
                        <input name="brand" defaultValue={p.brand} className={input} />
                        <input name="flavor" defaultValue={p.flavor ?? ""} className={input} />

                        <select
                          name="form"
                          defaultValue={p.creatineInfo?.form}
                          className={input}
                        >
                          <option value={CreatineForm.POWDER}>Pó</option>
                          <option value={CreatineForm.CAPSULE}>Cápsula</option>
                          <option value={CreatineForm.GUMMY}>Gummy</option>
                        </select>

                        <input
                          name="totalUnits"
                          type="number"
                          step="0.01"
                          defaultValue={p.creatineInfo?.totalUnits}
                          className={input}
                        />

                        <input
                          name="unitsPerDose"
                          type="number"
                          step="0.01"
                          defaultValue={p.creatineInfo?.unitsPerDose}
                          className={input}
                        />

                        <input
                          name="imageUrl"
                          defaultValue={p.imageUrl}
                          className={input}
                        />

                        <input
                          name="amazonAsin"
                          defaultValue={amazonOffer?.externalId ?? ""}
                          className={input}
                        />

                        <div className="flex gap-3">
                          <button className="bg-black text-white px-4 py-2 rounded">
                            Salvar
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              setEditingId(null)
                            }
                            className="border px-4 py-2 rounded"
                          >
                            Cancelar
                          </button>
                        </div>
                      </form>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>

      {/* PAGINAÇÃO */}
      <div className="flex justify-between items-center mt-6">
        <button
          disabled={page === 1}
          onClick={() => setPage((p) => p - 1)}
          className="border px-3 py-1 rounded disabled:opacity-50"
        >
          ← Anterior
        </button>

        <span className="text-sm">
          Página {page} de {totalPages}
        </span>

        <button
          disabled={page === totalPages}
          onClick={() => setPage((p) => p + 1)}
          className="border px-3 py-1 rounded disabled:opacity-50"
        >
          Próxima →
        </button>
      </div>
    </main>
  );
}
