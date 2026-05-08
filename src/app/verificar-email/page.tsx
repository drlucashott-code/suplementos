import Link from "next/link";
import AuthShell from "@/components/auth/AuthShell";
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
    <AuthShell
      eyebrow="Verificação"
      title={result.ok ? "Email confirmado" : "Link inválido ou expirado"}
      description={
        result.ok
          ? "Sua conta foi liberada. Agora você já pode entrar e usar favoritos, comentários e listas."
          : "Esse link não pôde ser validado. Se precisar, você ainda pode pedir um novo email de confirmação."
      }
      asideEyebrow="Acesso liberado"
      asideTitle="Conta validada com clareza"
      asideDescription="A confirmação do email é o último passo para liberar sua conta e destravar os recursos sociais."
      highlights={[
        {
          title: "Favoritos e listas",
          description: "Depois da confirmação, sua conta já fica pronta para salvar produtos e montar listas.",
        },
        {
          title: "Comentários liberados",
          description: "A validação também destrava a participação nas áreas de conversa da comunidade.",
        },
        {
          title: "Próximo passo direto",
          description: result.ok
            ? "A navegação vai para o login, sem ruído adicional."
            : "Se o link expirou, basta voltar ao login e reenviar a confirmação.",
        },
      ]}
      footer={
        <div className="flex flex-wrap gap-3">
          <Link
            href="/entrar"
            className="inline-flex h-11 items-center rounded-xl bg-[#FFD814] px-5 text-sm font-black text-[#0F1111] transition hover:bg-[#F7CA00]"
          >
            Ir para login
          </Link>
        </div>
      }
    >
      <div
        className={`rounded-3xl border px-5 py-5 shadow-sm ${
          result.ok
            ? "border-[#b7ebc6] bg-[#ecfdf3]"
            : "border-[#fecdca] bg-[#fef3f2]"
        }`}
      >
        <p className="text-xs font-black uppercase tracking-[0.18em] text-[#667085]">
          {result.ok ? "Conta liberada" : "Validação pendente"}
        </p>
        <p
          className={`mt-2 text-lg font-bold ${
            result.ok ? "text-[#067647]" : "text-[#B42318]"
          }`}
        >
          {result.ok
            ? "Sua conta já está pronta para usar."
            : "Precisamos de um novo link de confirmação."}
        </p>
      </div>
    </AuthShell>
  );
}
