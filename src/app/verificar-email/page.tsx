import Header from "@/app/Header";
import Link from "next/link";
import { verifySiteUserEmail } from "@/lib/siteAuth";

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const search = await searchParams;
  const token = search.token ?? "";
  const result = token ? await verifySiteUserEmail(token) : { ok: false as const };

  return (
    <main className="min-h-screen bg-[#E3E6E6] pb-10">
      <Header />

      <div className="mx-auto max-w-[560px] px-4 py-8">
        <div className="rounded-3xl border border-[#d5d9d9] bg-white p-6 shadow-sm md:p-8">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-[#CC0C39]">
            Verificação
          </p>
          <h1 className="mt-3 text-3xl font-black text-[#0F1111]">
            {result.ok ? "Email confirmado" : "Link inválido ou expirado"}
          </h1>
          <p className="mt-2 text-sm text-[#565959]">
            {result.ok
              ? "Sua conta foi liberada. Agora você já pode entrar e usar favoritos, comentários e listas."
              : "Esse link não pôde ser validado. Se precisar, depois podemos adicionar reenvio de confirmação."}
          </p>

          <div className="mt-6">
            <Link
              href="/entrar"
              className="inline-flex h-11 items-center rounded-xl bg-[#FFD814] px-5 text-sm font-black text-[#0F1111] transition hover:bg-[#F7CA00]"
            >
              Ir para login
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
