import Header from "@/app/Header";
import NotificationsCenter from "@/components/NotificationsCenter";
import { requireCurrentSiteUser } from "@/lib/siteAuth";
import { getSiteNotifications, syncFavoriteNotifications } from "@/lib/siteNotifications";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const user = await requireCurrentSiteUser();
  await syncFavoriteNotifications(user.id);
  const notifications = await getSiteNotifications(user.id, 50);

  return (
    <main className="min-h-screen bg-[#E3E6E6] pb-10">
      <Header />

      <div className="mx-auto max-w-[1280px] px-4 py-8">
        <NotificationsCenter notifications={notifications} />
      </div>
    </main>
  );
}
