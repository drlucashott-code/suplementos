import AuthShell from "@/components/auth/AuthShell";
import ResetPasswordForm from "@/components/ResetPasswordForm";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const search = await searchParams;
  const token = search.token ?? "";

  return (
    <AuthShell
      eyebrow="Recuperação"
      title="Redefinir senha"
      description="Cadastre uma nova senha para continuar usando sua conta com segurança."
      asideEyebrow="Senha nova"
      asideTitle="Troca guiada e sem atrito"
      asideDescription="A redefinição foi desenhada para ser objetiva, com validação clara e retorno rápido ao login."
      highlights={[
        {
          title: "Nova senha confirmada",
          description: "A interface mostra quando a senha foi salva com sucesso e te leva de volta ao login.",
        },
        {
          title: "Validação visível",
          description: "Erros de senha ficam claros antes do envio, evitando tentativa e erro desnecessária.",
        },
        {
          title: "Fluxo seguro",
          description: "Sem etapas confusas, só o necessário para recuperar o acesso.",
        },
      ]}
    >
      {token ? (
        <ResetPasswordForm token={token} />
      ) : (
        <p className="rounded-2xl border border-[#fecdca] bg-[#fef3f2] px-4 py-3 text-sm font-medium text-[#b42318]">
          Link inválido. Solicite uma nova recuperação de senha.
        </p>
      )}
    </AuthShell>
  );
}
