import { SiteHeader } from "@/components/SiteHeader";
import AccountSettingsWorkspace from "@/components/AccountSettingsWorkspace";
import { requireCurrentSiteUser } from "@/lib/siteAuth";

export const dynamic = "force-dynamic";

export default async function AccountSettingsPage() {
  const user = await requireCurrentSiteUser();

  return (
    <main className="min-h-screen bg-[#E3E6E6] pb-10">
      <SiteHeader />

      <div className="mx-auto max-w-[1280px] px-4 py-8">
        <AccountSettingsWorkspace user={user} />
      </div>
    </main>
  );
}
