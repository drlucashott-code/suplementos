import Header from "@/app/Header";
import ForgotPasswordForm from "@/components/ForgotPasswordForm";

export default function ForgotPasswordPage() {
  return (
    <main className="min-h-screen bg-[#E3E6E6] pb-10">
      <Header />

      <div className="mx-auto max-w-[560px] px-4 py-8">
        <div className="rounded-3xl border border-[#d5d9d9] bg-white p-6 shadow-sm md:p-8">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-[#CC0C39]">
            Recuperação
          </p>
          <h1 className="mt-3 text-3xl font-black text-[#0F1111]">Esqueci minha senha</h1>
          <p className="mt-2 text-sm text-[#565959]">
            Envie um link por email para definir uma nova senha.
          </p>

          <div className="mt-6">
            <ForgotPasswordForm />
          </div>
        </div>
      </div>
    </main>
  );
}
