import Link from "next/link";

export default function Home() {
  return (
    <main>
      {/* HEADER */}
      <section className="bg-black text-white py-8 px-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-center">
          Calculadora de custo-benefício
        </h1>
        <p className="mt-2 text-sm text-center text-gray-300">
          🚧 Site em construção — novas funcionalidades em breve
        </p>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* AVISO ANO NOVO */}
        <section className="mt-6 mb-6 max-w-5xl mx-auto text-center">
          <p className="text-sm font-medium text-[#171717]">
            ✨ Feliz Ano Novo! Desejamos um ano de saúde, bons treinos
            e escolhas mais inteligentes.
          </p>
        </section>

        {/* TEXTO INTRODUTÓRIO */}
        <section className="space-y-2 mb-8 max-w-5xl mx-auto text-[#171717]">
          <p className="text-sm">
            Compare suplementos e encontre o melhor custo-benefício
            com base em preço, rendimento e composição nutricional.
          </p>
          <p className="text-sm">
            Produtos vendidos pela Amazon e selecionados entre as
            melhores avaliações do mercado.
          </p>
          <p className="text-sm">
            Selecione abaixo a categoria que deseja analisar.
          </p>
        </section>

        {/* CATEGORIAS */}
        <section className="grid gap-6 sm:grid-cols-2 max-w-5xl mx-auto">
          {/* Creatina */}
          <Link
            href="/creatina"
            className="group rounded-xl border p-6 transition hover:border-black"
          >
            <h2 className="mb-2 text-lg font-semibold text-[#171717]">
              Creatina
            </h2>
            <p className="text-sm text-gray-600">
              Compare creatinas por preço por dose, rendimento e
              marca.
            </p>

            <span className="mt-4 inline-block text-sm font-medium text-black group-hover:underline">
              Acessar calculadora →
            </span>
          </Link>

          {/* Whey Protein */}
          <Link
            href="/whey"
            className="group rounded-xl border p-6 transition hover:border-black"
          >
            <h2 className="mb-2 text-lg font-semibold text-[#171717]">
              Whey Protein
            </h2>
            <p className="text-sm text-gray-600">
              Compare whey protein por custo por grama de proteína e
              concentração.
            </p>

            <span className="mt-4 inline-block text-sm font-medium text-black group-hover:underline">
              Acessar calculadora →
            </span>
          </Link>
        </section>
      </div>
    </main>
  );
}
