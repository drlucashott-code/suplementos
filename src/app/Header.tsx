import HeaderClient, { type HeaderClientProps } from "@/components/HeaderClient";
import { getCurrentSiteUser } from "@/lib/siteAuthSession";

export type HeaderProps = HeaderClientProps;

export default async function Header({ extraCategories = [] }: HeaderProps) {
  const user = await getCurrentSiteUser();

  return (
    <HeaderClient
      extraCategories={extraCategories}
      initialUser={
        user
          ? {
              id: user.id,
              email: user.email,
              displayName: user.displayName,
              avatarUrl: user.avatarUrl,
            }
          : null
      }
    />
  );
}
