import Header from "@/app/Header";
import ResetPasswordForm from "@/components/ResetPasswordForm";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const search = await searchParams;
  const token = search.token ?? "";

  return (
    <main className="min-h-screen bg-[#E3E6E6] pb-10">
      <Header />

      <div className="mx-auto max-w-[560px] px-4 py-8">
        <div className="rounded-3xl border border-[#d5d9d9] bg-white p-6 shadow-sm md:p-8">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-[#CC0C39]">
            Recuperação
          </p>
          <h1 className="mt-3 text-3xl font-black text-[#0F1111]">Redefinir senha</h1>
          <p className="mt-2 text-sm text-[#565959]">
            Cadastre uma nova senha para continuar usando sua conta.
          </p>

          <div className="mt-6">
            {token ? (
              <ResetPasswordForm token={token} />
            ) : (
              <p className="rounded-xl border border-[#fecdca] bg-[#fef3f2] px-4 py-3 text-sm font-medium text-[#b42318]">
                Link inválido. Solicite uma nova recuperação de senha.
              </p>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
