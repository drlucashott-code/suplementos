import { redirect } from "next/navigation";
import SiteAuthForm from "@/components/SiteAuthForm";
import AuthShell from "@/components/auth/AuthShell";
import { getCurrentSiteUser } from "@/lib/siteAuthSession";

export default async function RegisterPage() {
  const user = await getCurrentSiteUser();
  if (user) redirect("/minha-conta");

  return (
    <AuthShell
      eyebrow="Comunidade"
      title="Criar conta"
      description="Comece com favoritos, comentários e listas compartilháveis. A parte social do site cresce em cima disso."
      asideEyebrow="Primeiro passo"
      asideTitle="Conta pronta para usar no dia a dia"
      asideDescription="A conta organiza sua navegação, seus produtos salvos e suas listas públicas sem transformar isso num formulário cansativo."
      highlights={[
        {
          title: "Cadastro rápido",
          description:
            "Nome, username, email e senha em um fluxo direto, com mensagens claras quando algo precisa de ajuste.",
        },
        {
          title: "Confirmação visível",
          description:
            "Se o email ainda não foi validado, o próximo passo fica explícito no próprio fluxo.",
        },
        {
          title: "Pronto para listas e comentários",
          description:
            "A conta já nasce preparada para uso social, favoritos e acompanhamento dos produtos.",
        },
      ]}
    >
      <SiteAuthForm mode="register" />
    </AuthShell>
  );
}
