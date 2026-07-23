import type { Metadata } from "next";
import { getPortalContext } from "@/modules/clients/current-client";
import { listNotificationsForClient } from "@/modules/notifications/queries";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Notificações" };

export default async function NotificacoesPage() {
  const { client } = await getPortalContext();
  const notifications = await listNotificationsForClient(client.id);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-serif font-semibold text-brand-navy">Notificações</h1>

      {notifications.length === 0 && (
        <Card>
          <p className="text-sm text-slate-500">Nenhuma notificação.</p>
        </Card>
      )}

      {notifications.map((notification) => (
        <Card key={notification.id}>
          <div className="flex items-start justify-between">
            <div>
              <p className="font-medium text-slate-900">{notification.title}</p>
              <p className="text-sm text-slate-700">{notification.body}</p>
              <p className="mt-1 text-xs text-slate-400">
                {formatDateTime(notification.created_at)}
              </p>
            </div>
            {!notification.read_at && <Badge tone="info">Novo</Badge>}
          </div>
        </Card>
      ))}
    </div>
  );
}
