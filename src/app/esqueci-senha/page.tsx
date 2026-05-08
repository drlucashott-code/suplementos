import ForgotPasswordForm from "@/components/ForgotPasswordForm";
import AuthShell from "@/components/auth/AuthShell";

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      eyebrow="Recuperação"
      title="Esqueci minha senha"
      description="Envie um link por email para definir uma nova senha e voltar a usar sua conta com segurança."
      asideEyebrow="Segurança"
      asideTitle="Recuperação simples e sem ruído"
      asideDescription="O fluxo foi pensado para ser rápido, claro e seguro, sem expor informações desnecessárias na tela."
      highlights={[
        {
          title: "Pedido direto",
          description: "Basta informar seu email para receber o link de redefinição.",
        },
        {
          title: "Resposta discreta",
          description: "A mensagem não entrega mais do que o necessário e mantém a segurança do fluxo.",
        },
        {
          title: "Retorno fácil",
          description: "Se precisar, você volta ao login com um clique e segue a partir dali.",
        },
      ]}
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
