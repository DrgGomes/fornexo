import { and, desc, eq, isNull } from "drizzle-orm";
import { NotificationsList } from "@/components/notifications-list";
import { PageHeader } from "@/components/ui/misc";
import { db, notifications } from "@/db";
import { requireReseller } from "@/lib/auth";

export const metadata = { title: "Notificações" };

export default async function ResellerNotifications() {
  const { reseller } = await requireReseller();
  const where = and(eq(notifications.resellerId, reseller.id), eq(notifications.toSupplier, false));
  const rows = await db.select().from(notifications).where(where).orderBy(desc(notifications.createdAt)).limit(100);
  await db.update(notifications).set({ readAt: new Date() }).where(and(where, isNull(notifications.readAt)));
  return (
    <>
      <PageHeader title="Notificações" />
      <NotificationsList rows={rows} />
    </>
  );
}
