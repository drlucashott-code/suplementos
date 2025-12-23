import Link from "next/link";

export default function AdminHomePage() {
  return (
    <main className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">
        Admin
      </h1>

      <p className="text-sm text-gray-600 mb-8">
        Selecione a categoria para gerenciar os
        produtos.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <Link
          href="/admin/creatina"
          className="border rounded-xl p-6 hover:bg-gray-50 transition"
        >
          <h2 className="text-lg font-semibold">
            Creatina
          </h2>
          <p className="text-sm text-gray-600">
            Cadastro e gestão de creatinas
          </p>
        </Link>

        <div className="border rounded-xl p-6 opacity-40 cursor-not-allowed">
          <h2 className="text-lg font-semibold">
            Whey (em breve)
          </h2>
          <p className="text-sm text-gray-600">
            Cadastro e gestão de whey protein
          </p>
        </div>

        <div className="border rounded-xl p-6 opacity-40 cursor-not-allowed">
          <h2 className="text-lg font-semibold">
            Pré-treino (em breve)
          </h2>
          <p className="text-sm text-gray-600">
            Cadastro e gestão de pré-treinos
          </p>
        </div>

        <div className="border rounded-xl p-6 opacity-40 cursor-not-allowed">
          <h2 className="text-lg font-semibold">
            Vitaminas (em breve)
          </h2>
          <p className="text-sm text-gray-600">
            Cadastro e gestão de vitaminas
          </p>
        </div>
      </div>
    </main>
  );
}
