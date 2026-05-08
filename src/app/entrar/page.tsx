import { redirect } from "next/navigation";
import SiteAuthForm from "@/components/SiteAuthForm";
import AuthShell from "@/components/auth/AuthShell";
import { getCurrentSiteUser } from "@/lib/siteAuthSession";

export default async function LoginPage() {
  const user = await getCurrentSiteUser();
  if (user) redirect("/minha-conta");

  return (
    <AuthShell
      eyebrow="Comunidade"
      title="Entrar na sua conta"
      description="Entre para comentar, responder, montar listas e acompanhar seus produtos favoritos em um único lugar."
      asideEyebrow="Acesso"
      asideTitle="Tudo o que sua conta libera"
      asideDescription="Uma entrada limpa e segura para salvar produtos, montar listas públicas e acompanhar o que vale a pena de verdade."
      highlights={[
        {
          title: "Favoritos e listas",
          description: "Salve produtos, organize listas e volte neles quando quiser sem perder contexto.",
        },
        {
          title: "Comentário e comunidade",
          description: "Participe das listas públicas, responda comentários e acompanhe as interações.",
        },
        {
          title: "Login rápido e seguro",
          description: "Entre com email, senha ou Google com mensagens claras e fluxo de confirmação visível.",
        },
      ]}
    >
      <SiteAuthForm mode="login" />
    </AuthShell>
  );
}
